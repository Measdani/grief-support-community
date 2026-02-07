'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  display_name: string
  full_name: string | null
  bio: string | null
  profile_image_url: string | null
  verification_status: string
  created_at: string
}

interface Memorial {
  id: string
  first_name: string
  last_name: string
  profile_photo_url: string | null
  date_of_birth: string | null
  date_of_passing: string
}

interface Meetup {
  id: string
  title: string
  start_time: string
  location_city: string | null
  location_state: string | null
  format: string
  attendee_count: number
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)
  const [memorials, setMemorials] = useState<Memorial[]>([])
  const [meetups, setMeetups] = useState<Meetup[]>([])
  const [loadingContent, setLoadingContent] = useState(false)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const userId = params.id as string

  useEffect(() => {
    loadProfile()
    checkOwnProfile()
    loadUserContent()
  }, [userId])

  useEffect(() => {
    if (currentUserId && userId && currentUserId !== userId) {
      loadConnectionStatus()
    }
  }, [currentUserId, userId])

  async function checkOwnProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      setIsOwnProfile(user.id === userId)
    }
  }

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, bio, profile_image_url, verification_status, created_at')
        .eq('id', userId)
        .single()

      if (error) throw error
      if (!data) {
        router.push('/dashboard')
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadUserContent() {
    setLoadingContent(true)
    try {
      // Load memorials created by this user
      const { data: memorialsData } = await supabase
        .from('memorials')
        .select('id, first_name, last_name, profile_photo_url, date_of_birth, date_of_passing')
        .eq('created_by', userId)
        .eq('is_public', true)

      if (memorialsData) {
        setMemorials(memorialsData)
      }

      // Load meetups organized by this user
      const { data: meetupsData } = await supabase
        .from('meetups')
        .select('id, title, start_time, location_city, location_state, format, attendee_count')
        .eq('organizer_id', userId)
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (meetupsData) {
        setMeetups(meetupsData)
      }
    } catch (error) {
      console.error('Error loading user content:', error)
    } finally {
      setLoadingContent(false)
    }
  }

  async function loadConnectionStatus() {
    try {
      // Check if there's an existing connection
      const { data } = await supabase
        .from('user_connections')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${currentUserId})`)

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
    if (!currentUserId) {
      router.push('/auth/login')
      return
    }

    setSendingRequest(true)
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: currentUserId,
          addressee_id: userId,
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

  const getVerificationBadge = (status: string) => {
    const badges: Record<string, { icon: string; label: string; color: string }> = {
      unverified: { icon: '⏳', label: 'Unverified', color: 'bg-slate-100 text-slate-700' },
      email_verified: { icon: '📧', label: 'Email Verified', color: 'bg-blue-100 text-blue-700' },
      id_verified: { icon: '✅', label: 'ID Verified', color: 'bg-green-100 text-green-700' },
      meetup_organizer: { icon: '⭐', label: 'Meetup Organizer', color: 'bg-yellow-100 text-yellow-700' },
    }
    return badges[status] || badges.unverified
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Profile not found</p>
      </div>
    )
  }

  const badge = getVerificationBadge(profile.verification_status)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-8 inline-block">
          ← Back
        </Link>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Background */}
          <div className="h-40 bg-gradient-to-r from-blue-500 to-indigo-600" />

          {/* Content */}
          <div className="px-6 pb-8">
            {/* Profile Image and Name */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-20 mb-8">
              <div className="flex-shrink-0">
                {profile.profile_image_url ? (
                  <img
                    src={profile.profile_image_url}
                    alt={profile.display_name}
                    className="w-40 h-40 rounded-xl border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-40 h-40 rounded-xl border-4 border-white shadow-lg bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center">
                    <span className="text-6xl">👤</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">
                  {profile.full_name || profile.display_name}
                </h1>
                <div className="flex flex-wrap gap-3 items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                    {badge.icon} {badge.label}
                  </span>
                  {isOwnProfile && (
                    <Link
                      href="/dashboard/profile"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Edit Profile
                    </Link>
                  )}
                  {!isOwnProfile && currentUserId && connectionStatus === 'none' && (
                    <button
                      onClick={handleAddFriend}
                      disabled={sendingRequest}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      👥 Add Friend
                    </button>
                  )}
                  {!isOwnProfile && currentUserId && connectionStatus === 'sent' && (
                    <button
                      onClick={handleCancelRequest}
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition text-sm font-medium"
                    >
                      ⏳ Request Sent
                    </button>
                  )}
                  {!isOwnProfile && currentUserId && connectionStatus === 'pending' && (
                    <button
                      className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium cursor-default"
                    >
                      ⏳ Pending
                    </button>
                  )}
                  {!isOwnProfile && currentUserId && connectionStatus === 'accepted' && (
                    <button
                      className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium cursor-default"
                    >
                      ✓ Friends
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* About Section */}
            {profile.bio && (
              <div className="mb-8 pt-6 border-t border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-3">About</h2>
                <p className="text-slate-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Member Since */}
            <div className="pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-600">
                Member since {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Verification Info */}
            {profile.verification_status !== 'unverified' && (
              <div className="mt-6 pt-6 border-t border-slate-200 bg-blue-50 rounded-lg p-4 -mx-6">
                <h3 className="font-bold text-blue-900 mb-2">Verified Member</h3>
                <p className="text-sm text-blue-800">
                  This member has been verified by our community. {badge.label === 'ID Verified' ? 'They have completed ID verification and passed our safety checks.' : 'They are an active community member.'}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex gap-3 flex-wrap">
              {!isOwnProfile && currentUserId && (
                <>
                  <Link
                    href={`/messages?recipient=${userId}`}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium text-center min-w-32"
                  >
                    Send Message
                  </Link>
                  {connectionStatus === 'none' && (
                    <button
                      onClick={handleAddFriend}
                      disabled={sendingRequest}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      👥 Add Friend
                    </button>
                  )}
                  {connectionStatus === 'sent' && (
                    <button
                      onClick={handleCancelRequest}
                      className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition text-sm font-medium"
                    >
                      ⏳ Request Sent
                    </button>
                  )}
                  {connectionStatus === 'pending' && (
                    <button
                      className="px-4 py-3 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium cursor-default"
                    >
                      ⏳ Pending
                    </button>
                  )}
                  {connectionStatus === 'accepted' && (
                    <button
                      className="px-4 py-3 bg-green-100 text-green-800 rounded-lg text-sm font-medium cursor-default"
                    >
                      ✓ Friends
                    </button>
                  )}
                  <button
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                  >
                    Report User
                  </button>
                </>
              )}
              {!currentUserId && (
                <Link
                  href="/auth/login"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium text-center"
                >
                  Sign In to Message
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Memorials Section */}
        {memorials.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">🕯️ Created Memorials</h2>
            <div className="grid gap-4">
              {memorials.map((memorial) => (
                <Link
                  key={memorial.id}
                  href={`/dashboard/memorials/${memorial.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition flex gap-4"
                >
                  <div className="flex-shrink-0">
                    {memorial.profile_photo_url ? (
                      <img
                        src={memorial.profile_photo_url}
                        alt={`${memorial.first_name} ${memorial.last_name}`}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-slate-300 flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">
                      {memorial.first_name} {memorial.last_name}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {memorial.date_of_birth && `${new Date(memorial.date_of_birth).getFullYear()}`} – {new Date(memorial.date_of_passing).getFullYear()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Meetups Section */}
        {meetups.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">🤝 Organized Meetups</h2>
            <div className="grid gap-4">
              {meetups.map((meetup) => (
                <Link
                  key={meetup.id}
                  href={`/meetups/${meetup.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-2">{meetup.title}</h3>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">📅</span> {new Date(meetup.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(meetup.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {meetup.format === 'virtual' ? '💻 Virtual' : `📍 ${meetup.location_city}, ${meetup.location_state}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">
                        👥 {meetup.attendee_count}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
