import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { sponsor_id, location } = await request.json()

    if (!sponsor_id || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Hash IP for privacy (don't store actual IP)
    const ipHash = request.headers.get('x-forwarded-for')
      ? createHash('sha256').update(request.headers.get('x-forwarded-for') || '').digest('hex')
      : null

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('ad_impressions')
      .insert({
        sponsor_id,
        location,
        user_id: user?.id || null,
        ip_hash: ipHash,
      })

    if (error) {
      console.error('Error tracking impression:', error)
      return NextResponse.json(
        { error: 'Failed to track impression' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in track impression:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
