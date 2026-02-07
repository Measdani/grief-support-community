'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MeetupWithOrganizer,
  LossCategory,
  MeetupFormat,
  lossCategoryLabels,
  meetupFormatLabels,
  meetupFormatIcons,
} from '@/lib/types/meetup'

export default function MeetupsPage() {
  const router = useRouter()
  const [meetups, setMeetups] = useState<MeetupWithOrganizer[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [userRsvps, setUserRsvps] = useState<Record<string, string>>({})
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showEmailVerifiedModal, setShowEmailVerifiedModal] = useState(false)
  const [showCheckrModal, setShowCheckrModal] = useState(false)
  const [missingVerification, setMissingVerification] = useState<{
    idVerified: boolean
    backgroundCheckCompleted: boolean
  }>({ idVerified: true, backgroundCheckCompleted: true })

  // Filters
  const [formatFilter, setFormatFilter] = useState<MeetupFormat | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<LossCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    checkUser()
    loadMeetups()
  }, [formatFilter, categoryFilter])

  async function checkUser() {
    const { data: { user } } = await supabaseRef.current.auth.getUser()
    setUser(user)
    if (user) {
      loadUserRsvps(user.id)
      // Fetch user profile to check verification status
      const { data: profile } = await supabaseRef.current
        .from('profiles')
        .select('verification_status, id_verified_at, meetup_organizer_verified_at')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUserProfile(profile)

        // Check verification based on verification_status
        const idVerified = profile.verification_status === 'id_verified' || profile.verification_status === 'meetup_organizer'
        const backgroundCheckCompleted = profile.verification_status === 'meetup_organizer'

        setMissingVerification({
          idVerified,
          backgroundCheckCompleted,
        })

        // Don't show verification modals for admins or fully verified users
        const isAdmin = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').includes(user.email ?? '')
        const isFullyVerified = profile.verification_status === 'meetup_organizer'

        // Show modal if ID is not verified (and not an admin)
        if (!idVerified && !isAdmin) {
          setShowVerificationModal(true)
        }

        // Show email verified modal if ID is verified but background check not completed (and not an admin)
        if (idVerified && !backgroundCheckCompleted && !isAdmin && !isFullyVerified) {
          setShowEmailVerifiedModal(true)
        }
      }
    }
  }

  async function loadUserRsvps(userId: string) {
    const { data } = await supabaseRef.current
      .from('meetup_rsvps')
      .select('meetup_id, status')
      .eq('user_id', userId)

    if (data) {
      const rsvpMap: Record<string, string> = {}
      data.forEach(r => { rsvpMap[r.meetup_id] = r.status })
      setUserRsvps(rsvpMap)
    }
  }

  async function loadMeetups() {
    try {
      let query = supabaseRef.current
        .from('meetups')
        .select(`
          *,
          organizer:profiles!meetups_organizer_id_fkey(
            id, display_name, email, profile_image_url, verification_status
          )
        `)
        .eq('status', 'published')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      if (formatFilter !== 'all') {
        query = query.eq('format', formatFilter)
      }

      if (categoryFilter !== 'all') {
        query = query.contains('loss_categories', [categoryFilter])
      }

      const { data, error } = await query

      if (error) throw error
      setMeetups(data || [])
    } catch (error) {
      console.error('Error loading meetups:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleRsvp(meetupId: string, status: 'attending' | 'maybe') {
    if (!user) {
      alert('Please log in to RSVP')
      return
    }

    try {
      const existingRsvp = userRsvps[meetupId]

      if (existingRsvp) {
        // Update existing RSVP
        const { error } = await supabaseRef.current
          .from('meetup_rsvps')
          .update({ status })
          .eq('meetup_id', meetupId)
          .eq('user_id', user.id)

        if (error) throw error
      } else {
        // Create new RSVP
        const { error } = await supabaseRef.current
          .from('meetup_rsvps')
          .insert({
            meetup_id: meetupId,
            user_id: user.id,
            status,
          })

        if (error) throw error
      }

      setUserRsvps(prev => ({ ...prev, [meetupId]: status }))
      loadMeetups() // Refresh to update counts
    } catch (error) {
      console.error('Error RSVPing:', error)
      alert('Failed to RSVP. Please try again.')
    }
  }

  async function cancelRsvp(meetupId: string) {
    if (!user) return

    try {
      const { error } = await supabaseRef.current
        .from('meetup_rsvps')
        .delete()
        .eq('meetup_id', meetupId)
        .eq('user_id', user.id)

      if (error) throw error

      setUserRsvps(prev => {
        const newRsvps = { ...prev }
        delete newRsvps[meetupId]
        return newRsvps
      })
      loadMeetups()
    } catch (error) {
      console.error('Error cancelling RSVP:', error)
    }
  }

  const filteredMeetups = meetups.filter(meetup => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      meetup.title.toLowerCase().includes(query) ||
      meetup.description.toLowerCase().includes(query) ||
      meetup.location_city?.toLowerCase().includes(query) ||
      meetup.location_state?.toLowerCase().includes(query)
    )
  })

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      {/* Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Required</h2>
              <p className="text-slate-600">
                To browse and participate in meetups, we need to verify your identity.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {!missingVerification.idVerified && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">❌ ID Verification Required</p>
                  <p className="text-red-700 text-sm mt-1">
                    You must verify your identity to browse meetups.
                  </p>
                </div>
              )}

              {!missingVerification.backgroundCheckCompleted && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 font-medium">⚠️ Background Check Required</p>
                  <p className="text-yellow-700 text-sm mt-1">
                    To organize meetups, you must complete a background check.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {!missingVerification.idVerified ? (
                <Link
                  href="/verify"
                  className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Complete ID Verification
                </Link>
              ) : (
                <>
                  <Link
                    href="/verify"
                    className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Complete Background Check
                  </Link>
                  <button
                    onClick={() => setShowVerificationModal(false)}
                    className="block w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition font-medium"
                  >
                    ✓ Already ID Verified - Continue
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Verified Modal */}
      {showEmailVerifiedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">✨</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">You're All Set</h2>
              <p className="text-slate-600">
                Your email is verified. Here's what's available to you.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">✓ Join Gatherings</p>
                <p className="text-green-700 text-sm mt-1">
                  You're welcome to browse and attend any support gathering that feels right for you.
                </p>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">🔒 Hosting Is a Little Different</p>
                <p className="text-blue-700 text-sm mt-1">
                  To help keep everyone safe, we ask hosts to complete a background check before organizing gatherings.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowEmailVerifiedModal(false)
                  setShowCheckrModal(true)
                }}
                className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Begin Hosting Steps
              </button>
              <button
                onClick={() => setShowEmailVerifiedModal(false)}
                className="block w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                Not Right Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkr Background Check Modal */}
      {showCheckrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-4">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🛡️</div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Before You Continue</h2>
              <p className="text-slate-600">
                To host gatherings, we partner with a trusted third-party service to complete a background check.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
              <p className="text-slate-700 text-sm">
                You'll be redirected to Checkr, where the screening is completed and paid for directly. A small one-time fee is associated with this step.
              </p>
              <p className="text-slate-700 text-sm">
                Once verification is complete, your profile will be updated automatically.
              </p>
              <p className="text-slate-700 text-sm font-medium text-slate-900">
                We take the safety of our grieving guests seriously, and this step exists with care and protection in mind—for everyone, including you.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // TODO: Replace with actual Checkr redirect URL once Checkr API is configured
                  window.location.href = 'https://checkr.com'
                }}
                className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Continue to Checkr
              </button>
              <button
                onClick={() => setShowCheckrModal(false)}
                className="block w-full px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                Not Right Now
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 inline-block">
              ← Back to Dashboard
            </Link>
            {userProfile?.verification_status === 'meetup_organizer' && missingVerification.backgroundCheckCompleted && (
              <Link
                href="/meetups/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
              >
                + Create Meetup
              </Link>
            )}
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Community Gatherings</h1>

          {/* What Gatherings Are */}
          <div className="mb-8 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">What Gatherings Are</h2>
              <p className="text-slate-700 text-sm mb-3">
                Gatherings are simple, member-organized meetups for shared activities and gentle companionship—like seeing a movie, grabbing a meal, or not spending a holiday alone.
              </p>
              <p className="text-slate-700 text-sm">
                They are created by people who understand loss and want to connect in everyday moments.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">What Gatherings Are Not</h2>
              <ul className="text-slate-700 text-sm space-y-2 mb-4">
                <li>• Not therapy or counseling</li>
                <li>• Not dating or hookups</li>
                <li>• Not role replacement for loved ones</li>
                <li>• Not crisis support</li>
                <li>• Not a substitute for professional or crisis support</li>
              </ul>
              <p className="text-slate-700 text-sm italic border-t border-slate-300 pt-4">
                This space is about community and presence, not emotional obligation.
              </p>
            </div>
          </div>

          <p className="text-slate-600 mb-6">
            Find local and virtual grief support groups to connect with others who understand
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, location..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            {/* Format Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Format</label>
              <select
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value as MeetupFormat | 'all')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="all">All Formats</option>
                <option value="in_person">In-Person</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Support Type</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as LossCategory | 'all')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="all">All Types</option>
                {Object.entries(lossCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Meetups List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading meetups...</p>
          </div>
        ) : filteredMeetups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="text-5xl mb-4">🤝</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No Meetups Found</h2>
            <p className="text-slate-600">
              {searchQuery || formatFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back soon for upcoming support groups'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMeetups.map((meetup) => {
              const userRsvp = userRsvps[meetup.id]
              const isFull = meetup.max_attendees ? meetup.attendee_count >= meetup.max_attendees : false

              return (
                <div
                  key={meetup.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Date Badge */}
                      <div className="flex-shrink-0 text-center md:w-20">
                        <div className="bg-blue-100 text-blue-800 rounded-lg p-3">
                          <div className="text-xs font-medium uppercase">
                            {new Date(meetup.start_time).toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-2xl font-bold">
                            {new Date(meetup.start_time).getDate()}
                          </div>
                          <div className="text-xs">
                            {new Date(meetup.start_time).toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-1">
                              {meetup.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mb-2">
                              <span>{meetupFormatIcons[meetup.format]} {meetupFormatLabels[meetup.format]}</span>
                              <span>•</span>
                              <span>{formatTime(meetup.start_time)} - {formatTime(meetup.end_time)}</span>
                            </div>
                          </div>

                          {/* RSVP Status Badge */}
                          {userRsvp && (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              userRsvp === 'attending'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {userRsvp === 'attending' ? '✓ Attending' : '? Maybe'}
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        {meetup.format !== 'virtual' && meetup.location_city && (
                          <p className="text-sm text-slate-600 mb-2">
                            📍 {meetup.location_name && `${meetup.location_name}, `}
                            {meetup.location_city}, {meetup.location_state}
                          </p>
                        )}

                        {meetup.format !== 'in_person' && (
                          <p className="text-sm text-slate-600 mb-2">
                            💻 {meetup.virtual_platform || 'Virtual Meeting'}
                          </p>
                        )}

                        {/* Description */}
                        <p className="text-slate-700 text-sm mb-3 line-clamp-2">
                          {meetup.description}
                        </p>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {meetup.loss_categories.map((cat) => (
                            <span
                              key={cat}
                              className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-xs"
                            >
                              {lossCategoryLabels[cat]}
                            </span>
                          ))}
                        </div>

                        {/* Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>
                              👥 {meetup.attendee_count} attending
                              {meetup.max_attendees && ` / ${meetup.max_attendees} max`}
                            </span>
                            {meetup.organizer && (
                              <span>
                                Hosted by{' '}
                                <span className="font-medium text-slate-900">
                                  {meetup.organizer.display_name || 'Organizer'}
                                </span>
                                {meetup.organizer.verification_status === 'meetup_organizer' && (
                                  <span className="ml-1 text-blue-600" title="Verified Organizer">✓</span>
                                )}
                              </span>
                            )}
                          </div>

                          {/* RSVP Buttons or Edit (for Organizer) */}
                          <div className="flex gap-2">
                            {user?.id === meetup.organizer_id ? (
                              <>
                                <Link
                                  href={`/meetups/${meetup.id}`}
                                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                                >
                                  View Details
                                </Link>
                                <Link
                                  href={`/meetups/${meetup.id}/edit`}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                                >
                                  ✏️ Edit
                                </Link>
                              </>
                            ) : userRsvp ? (
                              <>
                                <button
                                  onClick={() => cancelRsvp(meetup.id)}
                                  className="px-4 py-2 text-sm text-slate-600 hover:text-red-600 transition"
                                >
                                  Cancel RSVP
                                </button>
                                <Link
                                  href={`/meetups/${meetup.id}`}
                                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                                >
                                  View Details
                                </Link>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleRsvp(meetup.id, 'maybe')}
                                  disabled={isFull}
                                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition disabled:opacity-50"
                                >
                                  Maybe
                                </button>
                                <button
                                  onClick={() => handleRsvp(meetup.id, 'attending')}
                                  disabled={isFull}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isFull ? 'Full' : 'RSVP'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No login prompt */}
        {!user && filteredMeetups.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <p className="text-blue-800 mb-3">
              Sign in to RSVP for meetups and connect with others
            </p>
            <Link
              href="/auth/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
