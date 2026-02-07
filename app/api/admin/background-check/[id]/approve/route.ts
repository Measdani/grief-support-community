import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { adminNotes } = await request.json()
    const applicationId = params.id

    // Get application and check access
    const { data: app, error: appError } = await supabaseAdmin
      .from('background_check_applications')
      .select('user_id, status')
      .eq('id', applicationId)
      .single()

    if (appError || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if already processed
    if (app.status !== 'pending') {
      return NextResponse.json(
        { error: `Application is already ${app.status}` },
        { status: 409 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiration

    // Update application
    const { error: updateAppError } = await supabaseAdmin
      .from('background_check_applications')
      .update({
        status: 'approved',
        approved_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq('id', applicationId)

    if (updateAppError) {
      console.error('Error updating application:', updateAppError)
      return NextResponse.json(
        { error: 'Failed to approve application' },
        { status: 500 }
      )
    }

    // Update profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        background_check_status: 'approved',
        background_check_approved_at: now.toISOString(),
        background_check_expires_at: expiresAt.toISOString(),
        background_check_provider: 'manual',
        background_check_notes: adminNotes || null,
      })
      .eq('id', app.user_id)

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving background check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
