import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      title,
      description,
      resource_type,
      categories,
      external_url,
      phone_number,
      author,
      source,
      submitter_name,
      submitter_email,
      submitter_notes,
    } = body

    // Validate required fields
    if (!title || !description || !resource_type || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: 'Missing required resource fields' },
        { status: 400 }
      )
    }

    if (!submitter_name || !submitter_email) {
      return NextResponse.json(
        { error: 'Missing submitter information' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(submitter_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate that hotlines have phone numbers or URLs have external_url
    if (resource_type === 'hotline' && !phone_number) {
      return NextResponse.json(
        { error: 'Hotlines must include a phone number' },
        { status: 400 }
      )
    }

    if (resource_type !== 'hotline' && !external_url) {
      return NextResponse.json(
        { error: 'This resource type requires a website URL' },
        { status: 400 }
      )
    }

    // Insert submission
    const { data, error } = await supabase
      .from('resource_submissions')
      .insert({
        title,
        description,
        resource_type,
        categories,
        external_url: external_url || null,
        phone_number: phone_number || null,
        author: author || null,
        source: source || null,
        submitter_name,
        submitter_email,
        submitter_notes: submitter_notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating resource submission:', error)
      return NextResponse.json(
        { error: 'Failed to submit resource' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Error in resource submission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
