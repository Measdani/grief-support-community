'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
export const dynamic = 'force-dynamic'

export default function RequestVerificationPage() {
  const [loading, setLoading] = useState(false)
  const [existingRequest, setExistingRequest] = useState<any>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    reason: '',
    about_me: '',
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkExistingRequest()
  }, [])

  async function checkExistingRequest() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('request_type', 'id_verification')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data && data.status === 'pending') {
        setExistingRequest(data)
      }
    } catch (error) {
      // No existing request found - that's okay
    }
  }

  async function submitRequest() {
    if (!formData.full_name.trim()) {
      alert('Please enter your full name')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in')
        return
      }

      // Create verification request
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          request_type: 'id_verification',
          status: 'pending',
          submitted_info: {
            full_name: formData.full_name,
            reason: formData.reason,
            about_me: formData.about_me,
          },
        })

      if (error) throw error

      // Update profile with requested timestamp
      await supabase
        .from('profiles')
        .update({
          id_verification_requested_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      alert('Verification request submitted successfully! An admin will review it soon.')
      router.push('/dashboard/profile')
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Failed to submit request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // If there's already a pending request
  if (existingRequest) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Request Pending
            </h1>
            <p className="text-gray-600">
              Your verification request is currently under review
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-medium">Submitted:</span>{' '}
              {new Date(existingRequest.created_at).toLocaleDateString()} at{' '}
              {new Date(existingRequest.created_at).toLocaleTimeString()}
            </p>
            {existingRequest.submitted_info && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900 mb-1">Your submission:</p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Name:</span> {existingRequest.submitted_info.full_name}
                </p>
                {existingRequest.submitted_info.reason && (
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-medium">Reason:</span> {existingRequest.submitted_info.reason}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next?</strong>
              <br />
              An admin will review your request and approve or request more information.
              You'll be notified via email once your request is processed.
            </p>
          </div>

          <Link
            href="/dashboard/profile"
            className="block w-full text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Back to Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/dashboard/profile"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Profile
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request ID Verification</h1>
        <p className="text-gray-600 mb-6">
          Submit your information for admin review to unlock full community access
        </p>

        {/* Benefits */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="font-medium text-blue-900 mb-2">✅ With ID Verification you can:</p>
          <ul className="text-sm text-blue-800 space-y-1 ml-4">
            <li>• Join in-person meetups</li>
            <li>• Send private messages to other verified members</li>
            <li>• Full community access</li>
            <li>• Verified member badge on your profile</li>
          </ul>
        </div>

        {/* Why we verify */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="font-medium text-gray-900 mb-2">🔒 Why we verify:</p>
          <p className="text-sm text-gray-700">
            To ensure everyone's safety during in-person meetups, we verify the identity of all
            members who want to attend. This creates a trusted, accountable community where
            everyone can feel safe sharing their grief journey.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="First and Last Name"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used to verify your identity. It will not be shown to other members.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why do you want to join in-person meetups?
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Optional: Share why you're interested in meeting others in the community..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tell us a bit about yourself (Optional)
            </label>
            <textarea
              value={formData.about_me}
              onChange={(e) => setFormData({ ...formData, about_me: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Share a bit about your grief journey, what kind of support you're looking for, or anything else you'd like us to know..."
            />
          </div>

          {/* Terms */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              By submitting this request, you agree that:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>• The information provided is accurate and truthful</li>
              <li>• You understand this is a peer support community, not professional therapy</li>
              <li>• You agree to our community guidelines and code of conduct</li>
              <li>• Future meetup attendance may require Stripe Identity verification ($1.50)</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={submitRequest}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <Link
              href="/dashboard/profile"
              className="flex-1 text-center bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
