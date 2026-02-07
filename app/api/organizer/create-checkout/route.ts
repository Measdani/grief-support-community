import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { applicationId } = await request.json()

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
    }

    // Get application
    const { data: application, error: appError } = await supabase
      .from('organizer_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single()

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.status !== 'pending_payment') {
      return NextResponse.json({ error: 'Application already paid' }, { status: 400 })
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name')
      .eq('id', user.id)
      .single()

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer_email: profile?.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Meetup Organizer Verification',
              description: 'One-time verification fee to become a certified meetup organizer',
            },
            unit_amount: application.payment_amount_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/become-organizer/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/become-organizer`,
      metadata: {
        application_id: application.id,
        user_id: user.id,
        type: 'organizer_verification',
      },
    })

    // Update application with session ID
    await supabase
      .from('organizer_applications')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', application.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Organizer checkout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
