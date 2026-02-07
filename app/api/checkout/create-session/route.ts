import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is email verified
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status, email, display_name')
      .eq('id', user.id)
      .single()

    if (!profile || !['email_verified', 'id_verified', 'meetup_organizer'].includes(profile.verification_status)) {
      return NextResponse.json({ error: 'Email verification required to make purchases' }, { status: 403 })
    }

    // Parse request body
    const { items } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid cart items' }, { status: 400 })
    }

    // Validate items against database
    const productIds = items.map((i: any) => i.productId)
    const { data: products, error: productsError } = await supabase
      .from('store_products')
      .select('*')
      .in('id', productIds)
      .eq('status', 'active')

    if (productsError || !products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'Invalid products in cart' }, { status: 400 })
    }

    // Calculate total
    const totalCents = items.reduce((sum: number, item: any) => {
      const product = products.find(p => p.id === item.productId)
      return sum + (product?.price_cents || 0)
    }, 0)

    // Create order in database (pending)
    const { data: order, error: orderError } = await supabase
      .from('store_orders')
      .insert({
        user_id: user.id,
        total_amount_cents: totalCents,
        payment_status: 'pending',
        customer_email: profile.email,
        customer_name: profile.display_name,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Create order items
    const orderItems = items.map((item: any) => {
      const product = products.find(p => p.id === item.productId)!
      return {
        order_id: order.id,
        product_id: item.productId,
        memorial_id: item.memorialId,
        price_cents: product.price_cents,
        dedication_message: item.dedicationMessage || null,
        product_snapshot: {
          name: product.name,
          type: product.product_type,
          description: product.description,
          preview_image_url: product.preview_image_url,
          digital_asset_path: product.digital_asset_path,
        },
      }
    })

    const { error: itemsError } = await supabase
      .from('store_order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: profile.email,
      line_items: items.map((item: any) => {
        const product = products.find(p => p.id === item.productId)!
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: `For memorial: ${item.memorialName}`,
              images: product.preview_image_url ? [product.preview_image_url] : [],
            },
            unit_amount: product.price_cents,
          },
          quantity: 1,
        }
      }),
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/store/cart`,
      metadata: {
        order_id: order.id,
        user_id: user.id,
      },
    })

    // Update order with session ID
    await supabase
      .from('store_orders')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
