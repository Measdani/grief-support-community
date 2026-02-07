'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface HostProfile {
  id: string
  subscription_tier: string
  background_check_status: string
  background_check_approved_at: string | null
  background_check_expires_at: string | null
  background_check_notes: string | null
}

export default function HostGatheringsPage() {
  const [profile, setProfile] = useState<HostProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    fullLegalName: '',
    dateOfBirth: '',
    ssnLast4: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
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
        .select(
          'id, subscription_tier, background_check_status, background_check_approved_at, background_check_expires_at, background_check_notes'
        )
        .eq('id', userId)
        .single()

      if (error) throw error

      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
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
      if (!user) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('/api/background-check/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullLegalName: formData.fullLegalName,
          dateOfBirth: formData.dateOfBirth,
          ssnLast4: formData.ssnLast4,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2 || null,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application')
      }

      setMessage({ type: 'success', text: 'Application submitted! Our team will review it shortly.' })

      // Reset form and reload profile
      setFormData({
        fullLegalName: '',
        dateOfBirth: '',
        ssnLast4: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
      })

      await loadProfile(user.id)
    } catch (error) {
      console.error('Error submitting application:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit application',
      })
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function isExpired(expiresAt: string | null) {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
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

  const isPremium = profile.subscription_tier === 'premium'
  const isApproved = profile.background_check_status === 'approved'
  const isExpiredStatus = isApproved && isExpired(profile.background_check_expires_at)
  const isPending = profile.background_check_status === 'pending'
  const isRejected = profile.background_check_status === 'rejected'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Host Gatherings</h1>
          <p className="text-slate-600">Apply for background check to create and host gatherings</p>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Premium Requirement */}
        {!isPremium && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="font-bold text-blue-900 mb-2">Premium Membership Required</h2>
            <p className="text-blue-800 mb-4">
              To host gatherings, you need a Premium membership. Upgrade for $29/year to get started.
            </p>
            <Link
              href="/pricing"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}

        {isPremium && (
          <>
            {/* Status Overview */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Background Check Status</h2>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    isApproved && !isExpiredStatus
                      ? 'bg-green-600'
                      : isPending
                      ? 'bg-yellow-600'
                      : isRejected
                      ? 'bg-red-600'
                      : 'bg-slate-400'
                  }`}>
                    {isApproved && !isExpiredStatus ? '✓' : isPending ? '⏳' : isRejected ? '✕' : '○'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {isApproved && !isExpiredStatus
                        ? 'Approved'
                        : isPending
                        ? 'Under Review'
                        : isRejected
                        ? 'Rejected'
                        : isExpiredStatus
                        ? 'Expired'
                        : 'Not Started'}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {isPending && 'Your application is being reviewed by our team.'}
                      {isApproved && !isExpiredStatus && 'You\'re approved to host gatherings!'}
                      {isRejected && 'Your application was not approved. You can reapply anytime.'}
                      {isExpiredStatus && 'Your approval has expired. Please reapply to continue hosting.'}
                      {profile.background_check_status === 'not_started' && 'Complete the form below to apply.'}
                    </p>
                  </div>
                </div>

                {(isApproved || isExpiredStatus) && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    {profile.background_check_approved_at && (
                      <div>
                        <p className="text-sm text-slate-600">Approved On</p>
                        <p className="font-semibold text-slate-900">{formatDate(profile.background_check_approved_at)}</p>
                      </div>
                    )}
                    {profile.background_check_expires_at && (
                      <div>
                        <p className="text-sm text-slate-600">Expires On</p>
                        <p className={`font-semibold ${isExpiredStatus ? 'text-red-600' : 'text-slate-900'}`}>
                          {formatDate(profile.background_check_expires_at)}
                          {isExpiredStatus && ' (Expired)'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {isRejected && profile.background_check_notes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-red-800">
                      <strong>Reason:</strong> {profile.background_check_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isApproved && !isExpiredStatus && (
                <Link
                  href="/meetups/create"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Create a Gathering
                </Link>
              )}
            </div>

            {/* Application Form */}
            {(profile.background_check_status === 'not_started' || isRejected || isExpiredStatus) && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {isRejected ? 'Reapply for' : isExpiredStatus ? 'Renew' : 'Submit'} Background Check
                </h2>
                <p className="text-slate-600 mb-6">
                  Please provide accurate information. This helps us verify your identity and ensure community safety.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Full Legal Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullLegalName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullLegalName: e.target.value }))}
                      placeholder="First, Middle, Last"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* SSN Last 4 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Social Security Number (Last 4 digits) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={formData.ssnLast4}
                      onChange={(e) => setFormData(prev => ({ ...prev, ssnLast4: e.target.value.replace(/\D/g, '') }))}
                      placeholder="0000"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-slate-500 mt-1">We only collect the last 4 digits for security</p>
                  </div>

                  {/* Address */}
                  <div className="border-t border-slate-200 pt-6">
                    <h3 className="font-bold text-slate-900 mb-4">Current Address</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.addressLine1}
                          onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                          placeholder="Street address"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Address Line 2 (Optional)
                        </label>
                        <input
                          type="text"
                          value={formData.addressLine2}
                          onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                          placeholder="Apartment, suite, etc."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            placeholder="City"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            State *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={2}
                            value={formData.state}
                            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                            placeholder="CA"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Zip Code *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={5}
                            value={formData.zipCode}
                            onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value.replace(/\D/g, '') }))}
                            placeholder="12345"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Notice */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs text-slate-600">
                      Your information is kept secure and only used for background check verification. We will never share your personal data with third parties without your consent.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-3 pt-6 border-t border-slate-200">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : isRejected ? 'Reapply' : isExpiredStatus ? 'Renew' : 'Submit Application'}
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
            )}

            {/* Info Box for Under Review */}
            {isPending && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-900 mb-2">Your Application is Under Review</h3>
                <p className="text-amber-800 mb-2">
                  Thank you for submitting your background check application. Our team typically reviews applications within 2-3 business days.
                </p>
                <p className="text-amber-800">
                  You'll receive an email notification once we've completed the review. You'll be able to create and host gatherings once approved.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
