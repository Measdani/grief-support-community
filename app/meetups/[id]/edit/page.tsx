'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'

const LOSS_CATEGORIES = [
  { value: 'spouse_partner', label: 'Spouse/Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'friend', label: 'Friend' },
  { value: 'pet', label: 'Pet' },
  { value: 'pregnancy_infant', label: 'Pregnancy/Infant Loss' },
  { value: 'suicide', label: 'Suicide' },
  { value: 'overdose', label: 'Overdose' },
  { value: 'terminal_illness', label: 'Terminal Illness' },
  { value: 'sudden_loss', label: 'Sudden Loss' },
  { value: 'general', label: 'General Grief' },
]

export default function EditMeetupPage() {
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    format: 'in_person',
    start_time: '',
    end_time: '',
    timezone: 'America/New_York',
    loss_categories: ['general'],
    max_attendees: '',
    requires_approval: false,

    // In-person fields
    location_name: '',
    location_address: '',
    location_city: '',
    location_state: '',
    location_zip: '',

    // Virtual fields
    virtual_link: '',
    virtual_platform: 'zoom',
  })

  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const meetupId = params.id as string

  useEffect(() => {
    checkOrganizerAndLoadMeetup()
  }, [meetupId])

  async function checkOrganizerAndLoadMeetup() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Load meetup
      const { data: meetup, error: meetupError } = await supabase
        .from('meetups')
        .select('*')
        .eq('id', meetupId)
        .single()

      if (meetupError || !meetup) {
        setMessage({ type: 'error', text: 'Meetup not found' })
        return
      }

      // Check if user is the organizer
      if (meetup.organizer_id !== user.id) {
        router.push('/meetups')
        return
      }

      // Check organizer status (admins can always edit)
      const isAdmin = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').includes(user.email || '')

      if (!isAdmin) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('verification_status')
          .eq('id', user.id)
          .single()

        if (profile?.verification_status !== 'meetup_organizer') {
          router.push('/meetups')
          return
        }
      }

      setIsOrganizer(true)

      // Convert ISO dates to datetime-local format
      const formatDateForInput = (isoString: string) => {
        const date = new Date(isoString)
        return date.toISOString().slice(0, 16)
      }

      // Pre-fill form with existing data
      setFormData({
        title: meetup.title,
        description: meetup.description,
        format: meetup.format,
        start_time: formatDateForInput(meetup.start_time),
        end_time: formatDateForInput(meetup.end_time),
        timezone: meetup.timezone,
        loss_categories: meetup.loss_categories || ['general'],
        max_attendees: meetup.max_attendees ? String(meetup.max_attendees) : '',
        requires_approval: meetup.requires_approval,
        location_name: meetup.location_name || '',
        location_address: meetup.location_address || '',
        location_city: meetup.location_city || '',
        location_state: meetup.location_state || '',
        location_zip: meetup.location_zip || '',
        virtual_link: meetup.virtual_link || '',
        virtual_platform: meetup.virtual_platform || 'zoom',
      })
    } catch (error) {
      console.error('Error loading meetup:', error)
      setMessage({ type: 'error', text: 'Failed to load meetup' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('meetups')
        .update({
          title: formData.title,
          description: formData.description,
          format: formData.format,
          start_time: new Date(formData.start_time).toISOString(),
          end_time: new Date(formData.end_time).toISOString(),
          timezone: formData.timezone,
          loss_categories: formData.loss_categories,
          max_attendees: formData.max_attendees ? parseInt(formData.max_attendees) : null,
          requires_approval: formData.requires_approval,

          // In-person
          location_name: formData.location_name || null,
          location_address: formData.location_address || null,
          location_city: formData.location_city || null,
          location_state: formData.location_state || null,
          location_zip: formData.location_zip || null,

          // Virtual
          virtual_link: formData.virtual_link || null,
          virtual_platform: formData.virtual_platform || null,
        })
        .eq('id', meetupId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Meetup updated successfully!' })
      setTimeout(() => router.push(`/meetups/${meetupId}`), 1500)
    } catch (error) {
      console.error('Error updating meetup:', error)
      setMessage({ type: 'error', text: 'Failed to update meetup' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading meetup...</p>
      </div>
    )
  }

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/meetups/${meetupId}`} className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Meetup
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Edit Meetup</h1>
          <p className="text-slate-600">Update your support group details</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Meetup Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Weekly Grief Support Circle"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell people what to expect, discussion topics, format, etc."
                    rows={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Loss Categories *
                  </label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {LOSS_CATEGORIES.map(cat => (
                      <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.loss_categories.includes(cat.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                loss_categories: [...prev.loss_categories, cat.value],
                              }))
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                loss_categories: prev.loss_categories.filter(c => c !== cat.value),
                              }))
                            }
                          }}
                          className="w-4 h-4 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{cat.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Schedule</h2>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_time}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="America/Anchorage">Alaska Time</option>
                    <option value="Pacific/Honolulu">Hawaii Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Format */}
            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Format</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Meeting Format *
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="in_person">In-Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid (Both)</option>
                  </select>
                </div>

                {/* In-Person Fields */}
                {(formData.format === 'in_person' || formData.format === 'hybrid') && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium text-slate-900">In-Person Location</h3>
                    <input
                      type="text"
                      value={formData.location_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_name: e.target.value }))}
                      placeholder="Location name (e.g., Community Center)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={formData.location_address}
                      onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                      placeholder="Street address"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="grid md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={formData.location_city}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_city: e.target.value }))}
                        placeholder="City"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={formData.location_state}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_state: e.target.value }))}
                        placeholder="State"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={formData.location_zip}
                        onChange={(e) => setFormData(prev => ({ ...prev, location_zip: e.target.value }))}
                        placeholder="ZIP"
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Virtual Fields */}
                {(formData.format === 'virtual' || formData.format === 'hybrid') && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                    <h3 className="font-medium text-slate-900">Virtual Meeting</h3>
                    <select
                      value={formData.virtual_platform}
                      onChange={(e) => setFormData(prev => ({ ...prev, virtual_platform: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="zoom">Zoom</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="jitsi">Jitsi</option>
                    </select>
                    <input
                      type="url"
                      value={formData.virtual_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, virtual_link: e.target.value }))}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="border-t border-slate-200 pt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Attendees (leave blank for unlimited)
                  </label>
                  <input
                    type="number"
                    value={formData.max_attendees}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_attendees: e.target.value }))}
                    min="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requires_approval}
                    onChange={(e) => setFormData(prev => ({ ...prev, requires_approval: e.target.checked }))}
                    className="w-4 h-4 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Require approval for RSVPs
                  </span>
                </label>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-8 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href={`/meetups/${meetupId}`}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
