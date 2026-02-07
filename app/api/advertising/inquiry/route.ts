import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      company_name,
      contact_name,
      contact_email,
      phone,
      website_url,
      company_description,
      interested_tiers,
      interested_placements,
      budget_range,
      message,
    } = body

    // Validate required fields
    if (!company_name || !contact_name || !contact_email || !company_description || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Insert inquiry
    const { data, error } = await supabase
      .from('advertising_inquiries')
      .insert({
        company_name,
        contact_name,
        contact_email,
        phone: phone || null,
        website_url: website_url || null,
        company_description,
        interested_tiers: interested_tiers || [],
        interested_placements: interested_placements || [],
        budget_range: budget_range || null,
        message,
        status: 'new',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inquiry:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    // TODO: Send notification email to admin

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Error in advertising inquiry:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
