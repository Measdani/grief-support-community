import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { meetupId, status } = await request.json()

    if (!meetupId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['attending', 'maybe', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Check if meetup exists and is published
    const { data: meetup, error: meetupError } = await supabase
      .from('meetups')
      .select('id, max_attendees, attendee_count, requires_approval, status')
      .eq('id', meetupId)
      .single()

    if (meetupError || !meetup) {
      return NextResponse.json({ error: 'Meetup not found' }, { status: 404 })
    }

    if (meetup.status !== 'published') {
      return NextResponse.json({ error: 'Meetup is not available' }, { status: 400 })
    }

    // Check capacity for 'attending' status
    if (status === 'attending' && meetup.max_attendees) {
      if (meetup.attendee_count >= meetup.max_attendees) {
        // Check if user already has an RSVP (updating from maybe to attending)
        const { data: existingRsvp } = await supabase
          .from('meetup_rsvps')
          .select('id, status')
          .eq('meetup_id', meetupId)
          .eq('user_id', user.id)
          .single()

        if (!existingRsvp || existingRsvp.status !== 'attending') {
          return NextResponse.json({ error: 'Meetup is full' }, { status: 400 })
        }
      }
    }

    // Upsert RSVP
    const { data: rsvp, error: rsvpError } = await supabase
      .from('meetup_rsvps')
      .upsert({
        meetup_id: meetupId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'meetup_id,user_id',
      })
      .select()
      .single()

    if (rsvpError) {
      console.error('RSVP error:', rsvpError)
      return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 })
    }

    return NextResponse.json({ rsvp })
  } catch (error) {
    console.error('RSVP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const meetupId = searchParams.get('meetupId')

    if (!meetupId) {
      return NextResponse.json({ error: 'Missing meetupId' }, { status: 400 })
    }

    const { error } = await supabase
      .from('meetup_rsvps')
      .delete()
      .eq('meetup_id', meetupId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Cancel RSVP error:', error)
      return NextResponse.json({ error: 'Failed to cancel RSVP' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel RSVP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
