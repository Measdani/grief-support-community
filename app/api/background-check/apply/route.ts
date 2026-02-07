import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(url, key)
    const {
      userId,
      fullLegalName,
      dateOfBirth,
      ssnLast4,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
    } = await request.json()

    // Validate required fields
    if (
      !userId ||
      !fullLegalName ||
      !dateOfBirth ||
      !ssnLast4 ||
      !addressLine1 ||
      !city ||
      !state ||
      !zipCode
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already has a pending or approved application
    const { data: existingApp } = await supabaseAdmin
      .from('background_check_applications')
      .select('id, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (
      existingApp &&
      (existingApp.status === 'pending' || existingApp.status === 'approved')
    ) {
      return NextResponse.json(
        { error: `You already have a ${existingApp.status} background check application` },
        { status: 409 }
      )
    }

    // Create application
    const { data, error } = await supabaseAdmin
      .from('background_check_applications')
      .insert({
        user_id: userId,
        status: 'pending',
        provider: 'manual',
        full_legal_name: fullLegalName,
        date_of_birth: dateOfBirth,
        ssn_last_4: ssnLast4,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        city,
        state,
        zip_code: zipCode,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating background check application:', error)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    // Update profile status
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        background_check_status: 'pending',
        background_check_submitted_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      // Application was created, but profile update failed - still return success
    }

    return NextResponse.json({ success: true, applicationId: data.id })
  } catch (error) {
    console.error('Error in background check apply:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
