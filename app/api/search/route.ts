import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase()
    const type = searchParams.get('type') || 'all'

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 })
    }

    const results: any = { users: [], memorials: [], meetups: [], forums: [], resources: [] }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, profile_image_url, verification_status')
        .ilike('display_name', `%${query}%`)
        .limit(10)

      results.users = users || []
    }

    // Search memorials
    if (type === 'all' || type === 'memorials') {
      const { data: memorials } = await supabase
        .from('memorials')
        .select('id, name, person_name, loss_type, created_at')
        .ilike('name', `%${query}%`)
        .limit(10)

      results.memorials = memorials || []
    }

    // Search meetups
    if (type === 'all' || type === 'meetups') {
      const { data: meetups } = await supabase
        .from('meetups')
        .select('id, title, start_time, location_city, attendee_count')
        .ilike('title', `%${query}%`)
        .eq('status', 'published')
        .limit(10)

      results.meetups = meetups || []
    }

    // Search forums
    if (type === 'all' || type === 'forums') {
      const { data: topics } = await supabase
        .from('forum_topics')
        .select('id, title, category_id, reply_count, created_at')
        .ilike('title', `%${query}%`)
        .limit(10)

      results.forums = topics || []
    }

    // Search resources
    if (type === 'all' || type === 'resources') {
      const { data: resources } = await supabase
        .from('resources')
        .select('id, title, description, category, url')
        .ilike('title', `%${query}%`)
        .limit(10)

      results.resources = resources || []
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
