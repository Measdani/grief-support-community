import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

interface EmailRequest {
  to: string
  templateId: string
  data: Record<string, any>
}

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

    const { to, templateId, data } = await request.json() as EmailRequest

    if (!to || !templateId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Store email record in database for async processing
    const { error } = await supabaseAdmin
      .from('email_queue')
      .insert({
        recipient_email: to,
        template_id: templateId,
        template_data: data,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to queue email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    console.log(`Email queued for ${to} with template ${templateId}`)
    return NextResponse.json({ success: true, message: 'Email queued for sending' })
  } catch (error) {
    console.error('Email send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
