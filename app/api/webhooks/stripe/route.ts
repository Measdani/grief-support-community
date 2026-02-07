import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Use service role client for webhook (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Check if this is an organizer verification payment
    if (session.metadata?.type === 'organizer_verification') {
      const applicationId = session.metadata?.application_id
      if (!applicationId) {
        console.error('No application_id in session metadata')
        return NextResponse.json({ error: 'Missing application_id' }, { status: 400 })
      }

      console.log(`Processing organizer payment for application ${applicationId}`)

      // Update application status
      const { error: appError } = await supabaseAdmin
        .from('organizer_applications')
        .update({
          status: 'payment_complete',
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq('id', applicationId)

      if (appError) {
        console.error('Failed to update application:', appError)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      console.log(`Application ${applicationId} payment completed`)
      return NextResponse.json({ received: true })
    }

    const orderId = session.metadata?.order_id
    if (!orderId) {
      console.error('No order_id in session metadata')
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    console.log(`Processing payment for order ${orderId}`)

    // Update order status
    const { error: orderError } = await supabaseAdmin
      .from('store_orders')
      .update({
        payment_status: 'paid',
        stripe_payment_intent_id: session.payment_intent as string,
        paid_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (orderError) {
      console.error('Failed to update order:', orderError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Get order items
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('store_order_items')
      .select(`
        *,
        product:store_products(*),
        order:store_orders(*)
      `)
      .eq('order_id', orderId)

    if (itemsError || !orderItems) {
      console.error('Failed to fetch order items:', itemsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Get profile for purchaser name
    const userId = orderItems[0]?.order?.user_id
    if (!userId) {
      console.error('No user_id found in order')
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single()

    const purchaserName = userProfile?.display_name || userProfile?.email || 'Anonymous'

    // Create memorial_store_items records (fulfill order)
    const memorialItems = orderItems.map(item => ({
      memorial_id: item.memorial_id,
      order_item_id: item.id,
      product_id: item.product_id,
      purchased_by: userId,
      purchaser_name: purchaserName,
      dedication_message: item.dedication_message,
      product_name: item.product_snapshot.name,
      product_type: item.product_snapshot.type,
      preview_image_url: item.product_snapshot.preview_image_url,
      digital_asset_path: item.product_snapshot.digital_asset_path,
    }))

    const { error: fulfillError } = await supabaseAdmin
      .from('memorial_store_items')
      .insert(memorialItems)

    if (fulfillError) {
      console.error('Failed to fulfill order:', fulfillError)
      // If unique constraint violation, order might already be fulfilled
      if (fulfillError.code === '23505') {
        console.log('Order already fulfilled (duplicate key)')
        return NextResponse.json({ received: true, message: 'Already fulfilled' })
      }
      return NextResponse.json({ error: 'Fulfillment error' }, { status: 500 })
    }

    // Mark order as fulfilled
    await supabaseAdmin
      .from('store_orders')
      .update({
        fulfillment_status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    console.log(`Order ${orderId} fulfilled successfully`)
  }

  // ============================================
  // Handle subscription.created event
  // ============================================
  if (event.type === 'customer.subscription.created') {
    const subscription = event.data.object as Stripe.Subscription

    const userId = subscription.metadata?.user_id
    if (!userId) {
      console.error('No user_id in subscription metadata')
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    try {
      // Log event
      await supabaseAdmin.from('stripe_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: subscription,
        processed: false,
      })

      // Update profile to premium
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'premium',
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
          subscription_started_at: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
          auto_renew: !subscription.cancel_at_period_end,
        })
        .eq('id', userId)

      if (profileError) {
        console.error('Failed to update profile:', profileError)
        await supabaseAdmin
          .from('stripe_events')
          .update({ error_message: profileError.message })
          .eq('stripe_event_id', event.id)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Create subscription record
      await supabaseAdmin.from('stripe_subscriptions').insert({
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items.data[0].price.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        amount: subscription.items.data[0].price.unit_amount || 0,
        currency: subscription.items.data[0].price.currency,
      })

      // Mark event processed
      await supabaseAdmin
        .from('stripe_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('stripe_event_id', event.id)

      console.log(`Subscription ${subscription.id} created for user ${userId}`)
    } catch (error) {
      console.error('Error processing subscription.created:', error)
    }
  }

  // ============================================
  // Handle subscription.updated event
  // ============================================
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription

    try {
      const { data: subRecord } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (!subRecord) {
        console.error('Subscription not found in database')
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      // Update subscription record
      await supabaseAdmin
        .from('stripe_subscriptions')
        .update({
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          cancelled_at: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000).toISOString()
            : null,
        })
        .eq('stripe_subscription_id', subscription.id)

      // Update profile
      const updateData: any = {
        subscription_status: subscription.status,
        subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        auto_renew: !subscription.cancel_at_period_end,
      }

      if (subscription.canceled_at) {
        updateData.subscription_cancelled_at = new Date(subscription.canceled_at * 1000).toISOString()
      }

      await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', subRecord.user_id)

      console.log(`Subscription ${subscription.id} updated`)
    } catch (error) {
      console.error('Error processing subscription.updated:', error)
    }
  }

  // ============================================
  // Handle subscription.deleted event
  // ============================================
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription

    try {
      const { data: subRecord } = await supabaseAdmin
        .from('stripe_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      if (!subRecord) {
        console.error('Subscription not found in database')
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      // Downgrade to free tier
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'cancelled',
          stripe_subscription_id: null,
        })
        .eq('id', subRecord.user_id)

      // Update subscription record
      await supabaseAdmin
        .from('stripe_subscriptions')
        .update({
          status: 'canceled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      console.log(`User ${subRecord.user_id} downgraded to free tier`)
    } catch (error) {
      console.error('Error processing subscription.deleted:', error)
    }
  }

  // ============================================
  // Handle invoice.paid event (renewal)
  // ============================================
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice

    if (invoice.subscription) {
      try {
        const { data: subRecord } = await supabaseAdmin
          .from('stripe_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()

        if (subRecord) {
          // Ensure still premium and active
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_tier: 'premium',
              subscription_status: 'active',
            })
            .eq('id', subRecord.user_id)

          console.log(`Invoice paid for subscription ${invoice.subscription}`)
        }
      } catch (error) {
        console.error('Error processing invoice.paid:', error)
      }
    }
  }

  // ============================================
  // Handle invoice.payment_failed event
  // ============================================
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice

    if (invoice.subscription) {
      try {
        const { data: subRecord } = await supabaseAdmin
          .from('stripe_subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', invoice.subscription)
          .single()

        if (subRecord) {
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('id', subRecord.user_id)

          console.log(`Payment failed for subscription ${invoice.subscription}`)
        }
      } catch (error) {
        console.error('Error processing invoice.payment_failed:', error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
