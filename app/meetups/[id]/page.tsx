'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
export const dynamic = 'force-dynamic'

interface Meetup {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  timezone: string
  format: string
  location_name?: string
  location_address?: string
  location_city?: string
  location_state?: string
  location_zip?: string
  virtual_link?: string
  virtual_platform?: string
  max_attendees?: number
  attendee_count: number
  loss_categories: string[]
  cover_image_url?: string
  organizer_id: string
}

interface Organizer {
  id: string
  display_name: string
  profile_image_url?: string
}

interface RSVP {
  id: string
  status: string
  user_id: string
}

export default function MeetupDetailPage() {
  const [meetup, setMeetup] = useState<Meetup | null>(null)
  const [organizer, setOrganizer] = useState<Organizer | null>(null)
  const [userRsvp, setUserRsvp] = useState<RSVP | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [isPremium, setIsPremium] = useState(false)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const meetupId = params.id as string

  useEffect(() => {
    loadMeetup()
    checkAuth()
  }, [meetupId])

  useEffect(() => {
    if (currentUserId && meetup?.organizer_id && currentUserId !== meetup.organizer_id) {
      loadConnectionStatus(meetup.organizer_id)
    }
  }, [currentUserId, meetup?.organizer_id])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)

      // Check subscription tier
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      setIsPremium(profile?.subscription_tier === 'premium')
    }
  }

  async function loadMeetup() {
    try {
      const { data, error } = await supabase
        .from('meetups')
        .select('*')
        .eq('id', meetupId)
        .single()

      if (error) throw error
      if (!data || data.status !== 'published') {
        router.push('/meetups')
        return
      }

      setMeetup(data)

      // Load organizer
      const { data: organizerData } = await supabase
        .from('profiles')
        .select('id, display_name, profile_image_url')
        .eq('id', data.organizer_id)
        .single()

      setOrganizer(organizerData)

      // Check current user's RSVP
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: rsvpData } = await supabase
          .from('meetup_rsvps')
          .select('*')
          .eq('meetup_id', meetupId)
          .eq('user_id', user.id)
          .single()

        setUserRsvp(rsvpData || null)
      }
    } catch (error) {
      console.error('Error loading meetup:', error)
      router.push('/meetups')
    } finally {
      setLoading(false)
    }
  }

  async function handleRsvp(status: string) {
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }

    setRsvpLoading(true)
    try {
      if (userRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from('meetup_rsvps')
          .update({ status })
          .eq('id', userRsvp.id)

        if (error) throw error
        setUserRsvp({ ...userRsvp, status })
      } else {
        // Create new RSVP
        const { data, error } = await supabase
          .from('meetup_rsvps')
          .insert({
            meetup_id: meetupId,
            user_id: currentUserId,
            status,
          })
          .select()
          .single()

        if (error) throw error
        setUserRsvp(data)
      }
    } catch (error) {
      console.error('Error updating RSVP:', error)
      alert('Failed to update RSVP')
    } finally {
      setRsvpLoading(false)
    }
  }

  async function loadConnectionStatus(organizerId: string) {
    try {
      const { data } = await supabase
        .from('user_connections')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${organizerId}),and(requester_id.eq.${organizerId},addressee_id.eq.${currentUserId})`)

      if (data && data.length > 0) {
        const connection = data[0]
        setConnectionId(connection.id)
        if (connection.status === 'accepted') {
          setConnectionStatus('accepted')
        } else if (connection.status === 'pending') {
          setConnectionStatus(connection.requester_id === currentUserId ? 'sent' : 'pending')
        }
      } else {
        setConnectionStatus('none')
      }
    } catch (error) {
      console.error('Error loading connection status:', error)
    }
  }

  async function handleAddFriend() {
    if (!currentUserId || !meetup) return

    setSendingRequest(true)
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: currentUserId,
          addressee_id: meetup.organizer_id,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      setConnectionId(data.id)
      setConnectionStatus('sent')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    } finally {
      setSendingRequest(false)
    }
  }

  async function handleCancelRequest() {
    if (!connectionId) return

    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnectionStatus('none')
      setConnectionId(null)
    } catch (error) {
      console.error('Error canceling request:', error)
      alert('Failed to cancel request')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading meetup...</p>
      </div>
    )
  }

  if (!meetup) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Meetup not found</p>
      </div>
    )
  }

  const startDate = new Date(meetup.start_time)
  const endDate = new Date(meetup.end_time)
  const isFull = meetup.max_attendees ? meetup.attendee_count >= meetup.max_attendees : false

  // Show premium prompt if user is not premium
  if (currentUserId && !isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/meetups" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
            ← Back to Meetups
          </Link>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-blue-900 mb-4">Premium Membership Required</h2>
            <p className="text-blue-800 text-lg mb-8 max-w-2xl mx-auto">
              {meetup.title} requires Premium membership to view details, see the location, and RSVP.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/pricing"
                className="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                Upgrade to Premium - $29/year
              </Link>
              <Link
                href="/meetups"
                className="inline-block px-8 py-4 bg-white text-blue-600 font-semibold border border-blue-200 rounded-lg hover:bg-blue-50 transition"
              >
                View Free Meetups
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/meetups" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
          ← Back to Meetups
        </Link>

        {/* Header Image */}
        {meetup.cover_image_url && (
          <div className="mb-8 rounded-xl overflow-hidden h-64 md:h-96">
            <img
              src={meetup.cover_image_url}
              alt={meetup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
              {/* Title & Categories */}
              <div className="mb-6">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">{meetup.title}</h1>
                <div className="flex flex-wrap gap-2">
                  {meetup.loss_categories.map(cat => (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium capitalize"
                    >
                      {cat.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-8 pb-8 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">About This Meetup</h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{meetup.description}</p>
              </div>

              {/* Details */}
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-slate-900 mb-4">Date & Time</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-600">Start</p>
                      <p className="text-slate-900 font-medium">
                        {startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-slate-900">{startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">End</p>
                      <p className="text-slate-900">{endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Timezone</p>
                      <p className="text-slate-900">{meetup.timezone}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-4">Location</h3>
                  {meetup.format === 'virtual' || meetup.format === 'hybrid' ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-600">Format: {meetup.format}</p>
                      {meetup.virtual_link && (
                        <div>
                          <p className="text-slate-600">Platform: {meetup.virtual_platform}</p>
                          <a
                            href={meetup.virtual_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Join Meeting →
                          </a>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {meetup.format === 'in_person' || meetup.format === 'hybrid' ? (
                    <div className="space-y-2 text-sm">
                      {meetup.location_name && <p className="text-slate-900 font-medium">{meetup.location_name}</p>}
                      {meetup.location_address && (
                        <>
                          <p className="text-slate-700">{meetup.location_address}</p>
                          <p className="text-slate-700">
                            {meetup.location_city}, {meetup.location_state} {meetup.location_zip}
                          </p>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Card - Only show for non-organizers */}
            {currentUserId !== meetup.organizer_id && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-bold text-slate-900 mb-4">Going?</h3>

              {isFull && !userRsvp && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">This meetup is full, but you can join the waitlist.</p>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => handleRsvp('attending')}
                  disabled={rsvpLoading || (isFull && !userRsvp)}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    userRsvp?.status === 'attending'
                      ? 'bg-green-600 text-white'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  } disabled:opacity-50`}
                >
                  ✓ I'm Going
                </button>
                <button
                  onClick={() => handleRsvp('maybe')}
                  disabled={rsvpLoading}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    userRsvp?.status === 'maybe'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  ? Maybe
                </button>
                <button
                  onClick={() => handleRsvp('declined')}
                  disabled={rsvpLoading}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition ${
                    userRsvp?.status === 'declined'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  ✗ Can't Make It
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  <strong>{meetup.attendee_count}</strong> attending
                  {meetup.max_attendees && ` / ${meetup.max_attendees}`}
                </p>
              </div>
            </div>
            )}


            {/* Organizer Card */}
            {organizer && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  {organizer.profile_image_url ? (
                    <img
                      src={organizer.profile_image_url}
                      alt={organizer.display_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center">👤</div>
                  )}
                  <h3 className="font-bold text-slate-900">{organizer.display_name}</h3>
                </div>

                {currentUserId === meetup.organizer_id ? (
                  <Link
                    href={`/meetups/${meetupId}/edit`}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                  >
                    ✏️ Edit Meetup
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href={`/profiles/${organizer.id}`}
                      className="block w-full text-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition text-sm font-medium"
                    >
                      View Profile
                    </Link>
                    {connectionStatus === 'none' && (
                      <button
                        onClick={handleAddFriend}
                        disabled={sendingRequest}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        👥 Add Friend
                      </button>
                    )}
                    {connectionStatus === 'sent' && (
                      <button
                        onClick={handleCancelRequest}
                        className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition text-sm font-medium"
                      >
                        ⏳ Request Sent
                      </button>
                    )}
                    {connectionStatus === 'pending' && (
                      <button
                        className="w-full px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium cursor-default"
                      >
                        ⏳ Pending
                      </button>
                    )}
                    {connectionStatus === 'accepted' && (
                      <button
                        className="w-full px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium cursor-default"
                      >
                        ✓ Friends
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
