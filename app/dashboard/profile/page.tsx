'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserProfile, VERIFICATION_LEVELS, getNextVerificationStep } from '@/lib/types/verification'
import { VerificationBadge } from '@/components/VerificationBadge'
export const dynamic = 'force-dynamic'

import Link from 'next/link'


export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [subscribedTopics, setSubscribedTopics] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [formData, setFormData] = useState({
    full_name: '',
    display_name: '',
    bio: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
  })

  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    loadProfile()
    loadSubscribedTopics()
    loadFriends()
    loadMessages()
  }, [])

  async function loadProfile() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        display_name: data.display_name || '',
        bio: data.bio || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
        emergency_contact_relationship: data.emergency_contact_relationship || '',
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)

      if (error) throw error

      setEditing(false)
      loadProfile()
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile')
    }
  }

  async function loadSubscribedTopics() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('forum_subscriptions')
        .select(`
          topic_id,
          forum_topics!inner(id, title, created_at, category_id, forum_categories!inner(name, slug, icon))
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubscribedTopics(data || [])
    } catch (error) {
      console.error('Error loading subscribed topics:', error)
    }
  }

  async function loadFriends() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('connections')
        .select(`
          connected_user_id,
          profiles!connections_connected_user_id_fkey(id, display_name, avatar_url, verification_status)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })

      if (error) throw error

      setFriends(data || [])
    } catch (error) {
      console.error('Error loading friends:', error)
    }
  }

  async function loadMessages() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender:profiles!messages_sender_id_fkey(id, display_name, avatar_url)
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Profile not found. Please try logging out and back in.</p>
        </div>
      </div>
    )
  }

  const verificationLevel = VERIFICATION_LEVELS[profile.verification_status]
  const nextStep = getNextVerificationStep(profile.verification_status)

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">Manage your profile and verification status</p>
          </div>
          {profile && (
            <Link
              href={`/profiles/${profile.id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm whitespace-nowrap"
            >
              👁️ View Public Profile
            </Link>
          )}
        </div>
      </div>

      {/* Verification Status Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Status</h2>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{verificationLevel.badge.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{verificationLevel.label}</h3>
              <p className="text-sm text-gray-600">{verificationLevel.description}</p>
            </div>
          </div>
          <VerificationBadge status={profile.verification_status} />
        </div>

        {/* What you can do */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-2">What you can do:</h4>
          <ul className="space-y-1 text-sm">
            {verificationLevel.permissions.canBrowse && (
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Browse resources and articles</span>
              </li>
            )}
            {verificationLevel.permissions.canPost && (
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Post in community forums</span>
              </li>
            )}
            {verificationLevel.permissions.canMessage && (
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Send private messages</span>
              </li>
            )}
            {verificationLevel.permissions.canJoinMeetups && (
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Join in-person meetups</span>
              </li>
            )}
            {verificationLevel.permissions.canCreateMeetups && (
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                <span>Create and host meetups</span>
              </li>
            )}

            {!verificationLevel.permissions.canJoinMeetups && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">✗</span>
                <span className="text-gray-500">Join in-person meetups (requires ID verification)</span>
              </li>
            )}
            {!verificationLevel.permissions.canCreateMeetups && (
              <li className="flex items-center gap-2">
                <span className="text-gray-400">✗</span>
                <span className="text-gray-500">Host meetups (requires background check)</span>
              </li>
            )}
          </ul>
        </div>

        {/* Next step */}
        {nextStep && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">Next Step:</p>
            <p className="text-sm text-blue-800 mb-3">{nextStep}</p>
            {profile.verification_status === 'email_verified' && (
              <Link
                href="/dashboard/profile/request-verification"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Request ID Verification
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Subscribed Topics */}
      {subscribedTopics.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">Conversations You're Following</h2>
            <p className="text-sm text-gray-600">Check back whenever it feels right. There's no rush.</p>
          </div>
          <div className="space-y-3">
            {subscribedTopics.map((subscription: any) => {
              const topic = subscription.forum_topics
              const category = topic.forum_categories
              return (
                <Link
                  key={topic.id}
                  href={`/forums/t/${topic.id}`}
                  className="block p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{topic.title}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {category.icon} {category.name}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                      {new Date(topic.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends */}
      {friends.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Friends</h2>
          <div className="space-y-3">
            {friends.map((connection: any) => {
              const friend = connection.profiles
              return (
                <Link
                  key={friend.id}
                  href={`/profiles/${friend.id}`}
                  className="block p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded-lg transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {friend.avatar_url && (
                        <img
                          src={friend.avatar_url}
                          alt={friend.display_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium text-gray-900 truncate">{friend.display_name}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Messages</h2>
          <div className="space-y-3">
            {messages.map((message: any) => {
              const sender = message.sender
              return (
                <div
                  key={message.id}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/profiles/${sender.id}`}
                      className="flex items-center gap-2 hover:text-blue-600 transition"
                    >
                      {sender.avatar_url && (
                        <img
                          src={sender.avatar_url}
                          alt={sender.display_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium text-gray-900 truncate">{sender.display_name}</span>
                    </Link>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{message.content}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">This is how others will see your name</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Share a bit about yourself and your journey..."
              />
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3">Emergency Contact (Required for Meetups)</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                    placeholder="e.g., Spouse, Parent, Sibling, Friend"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={saveProfile}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  loadProfile()
                }}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{profile.email}</p>
            </div>
            {profile.full_name && (
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="font-medium text-gray-900">{profile.full_name}</p>
              </div>
            )}
            {profile.display_name && (
              <div>
                <p className="text-sm text-gray-600">Display Name</p>
                <p className="font-medium text-gray-900">{profile.display_name}</p>
              </div>
            )}
            {profile.bio && (
              <div>
                <p className="text-sm text-gray-600">Bio</p>
                <p className="text-gray-900">{profile.bio}</p>
              </div>
            )}

            {profile.emergency_contact_name && (
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Emergency Contact</p>
                <p className="text-sm text-gray-700">
                  {profile.emergency_contact_name} ({profile.emergency_contact_relationship})
                  <br />
                  {profile.emergency_contact_phone}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="space-y-2 text-sm">
          <p className="text-gray-600">
            Member since: <span className="font-medium text-gray-900">
              {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </p>
          {profile.email_verified_at && (
            <p className="text-gray-600">
              Email verified: <span className="font-medium text-gray-900">
                {new Date(profile.email_verified_at).toLocaleDateString()}
              </span>
            </p>
          )}
          {profile.id_verified_at && (
            <p className="text-gray-600">
              ID verified: <span className="font-medium text-gray-900">
                {new Date(profile.id_verified_at).toLocaleDateString()}
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
