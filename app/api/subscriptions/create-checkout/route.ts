import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!stripeKey || !sbUrl || !sbKey || !premiumPriceId || !siteUrl) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const supabaseAdmin = createClient(sbUrl, sbKey)

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create or retrieve Stripe customer
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { user_id: userId },
      })
      customerId = customer.id

      // Save customer ID to profile
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId)

      if (updateError) {
        console.error('Error saving customer ID:', updateError)
        return NextResponse.json(
          { error: 'Failed to save customer information' },
          { status: 500 }
        )
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: premiumPriceId,
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/settings/billing?success=true`,
      cancel_url: `${siteUrl}/pricing?cancelled=true`,
      metadata: {
        user_id: userId,
        type: 'subscription',
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
