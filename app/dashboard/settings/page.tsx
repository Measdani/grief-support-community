'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  display_name: string
  full_name: string | null
  bio: string | null
  profile_image_url: string | null
  profile_visibility: string
  allow_messages: boolean
  show_in_directory: boolean
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    display_name: '',
    full_name: '',
    bio: '',
    profile_visibility: 'verified_members',
    allow_messages: true,
    show_in_directory: true,
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    loadProfile(user.id)
  }

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        display_name: data.display_name || '',
        full_name: data.full_name || '',
        bio: data.bio || '',
        profile_visibility: data.profile_visibility || 'verified_members',
        allow_messages: data.allow_messages !== false,
        show_in_directory: data.show_in_directory !== false,
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.display_name,
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          profile_visibility: formData.profile_visibility,
          allow_messages: formData.allow_messages,
          show_in_directory: formData.show_in_directory,
        })
        .eq('id', profile!.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setProfile({
        ...profile!,
        ...formData,
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      setMessage({ type: 'error', text: 'Failed to save profile' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Could not load profile</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Account Settings</h1>
          <p className="text-slate-600">Manage your profile and preferences</p>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Profile Information</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
              />
              <p className="text-xs text-slate-500 mt-1">Your email cannot be changed</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                placeholder="How others will see you"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Full Name (Optional)
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your full name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                About You (Optional)
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell others about yourself, your interests, or why you're here..."
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Privacy Settings */}
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Privacy & Preferences</h3>

              <div className="space-y-4">
                {/* Profile Visibility */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Who can see your profile?
                  </label>
                  <select
                    value={formData.profile_visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, profile_visibility: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="public">Public - Anyone can see</option>
                    <option value="verified_members">Verified Members - Only verified users</option>
                    <option value="private">Private - Only you</option>
                  </select>
                </div>

                {/* Allow Messages */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allow_messages}
                    onChange={(e) => setFormData(prev => ({ ...prev, allow_messages: e.target.checked }))}
                    className="w-4 h-4 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Allow other members to send you messages
                  </span>
                </label>

                {/* Show in Directory */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_in_directory}
                    onChange={(e) => setFormData(prev => ({ ...prev, show_in_directory: e.target.checked }))}
                    className="w-4 h-4 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Show my profile in the community directory
                  </span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-bold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-800 mb-4">
            These actions cannot be undone. Please be careful.
          </p>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
