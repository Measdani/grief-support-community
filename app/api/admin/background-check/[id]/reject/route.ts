import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { rejectionReason, adminNotes } = await request.json()
    const { id } = await params
    const applicationId = id

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Get application and check status
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

    // Update application
    const { error: updateAppError } = await supabaseAdmin
      .from('background_check_applications')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        admin_notes: adminNotes || null,
        reviewed_at: now.toISOString(),
      })
      .eq('id', applicationId)

    if (updateAppError) {
      console.error('Error updating application:', updateAppError)
      return NextResponse.json(
        { error: 'Failed to reject application' },
        { status: 500 }
      )
    }

    // Update profile
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        background_check_status: 'rejected',
        background_check_notes: rejectionReason,
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
    console.error('Error rejecting background check:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
