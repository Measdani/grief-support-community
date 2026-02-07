'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { VerificationRequest, UserProfile } from '@/lib/types/verification'

export const dynamic = 'force-dynamic'

interface VerificationRequestWithProfile extends VerificationRequest {
  profile: UserProfile
}

export default function AdminVerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    loadVerificationRequests()
  }, [filter])

  async function loadVerificationRequests() {
    const supabase = supabaseRef.current
    setLoading(true)
    try {
      let query = supabase
        .from('verification_requests')
        .select(`
          *,
          profile:profiles(*)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setRequests(data as any)
    } catch (error) {
      console.error('Error loading verification requests:', error)
    } finally {
      setLoading(false)
    }
  }

  async function approveVerification(requestId: string, userId: string, requestType: string) {
    const supabase = supabaseRef.current
    try {
      // Update verification request
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (requestError) throw requestError

      // Update user profile
      const updates: any = {}

      if (requestType === 'id_verification') {
        updates.verification_status = 'id_verified'
        updates.id_verified_at = new Date().toISOString()
        updates.id_verification_method = 'manual'
      } else if (requestType === 'meetup_organizer') {
        updates.verification_status = 'meetup_organizer'
        updates.meetup_organizer_verified_at = new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (profileError) throw profileError

      // Reload requests
      loadVerificationRequests()
      alert('Verification approved successfully!')
    } catch (error) {
      console.error('Error approving verification:', error)
      alert('Failed to approve verification. Check console for details.')
    }
  }

  async function rejectVerification(requestId: string, reason: string) {
    const supabase = supabaseRef.current
    if (!reason) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      const { error } = await supabase
        .from('verification_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', requestId)

      if (error) throw error

      loadVerificationRequests()
      alert('Verification rejected')
    } catch (error) {
      console.error('Error rejecting verification:', error)
      alert('Failed to reject verification')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Back to Admin Navigation */}
      <div className="mb-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          ← Back to Admin Panel
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ID Verification Approvals
        </h1>
        <p className="text-gray-600">
          Review and approve member verification requests to ensure community safety
        </p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              filter === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading verification requests...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No {filter !== 'all' ? filter : ''} verification requests</p>
        </div>
      )}

      {/* Requests list */}
      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <VerificationRequestCard
              key={request.id}
              request={request}
              onApprove={approveVerification}
              onReject={rejectVerification}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VerificationRequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: VerificationRequestWithProfile
  onApprove: (requestId: string, userId: string, requestType: string) => void
  onReject: (requestId: string, reason: string) => void
}) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const requestTypeLabels = {
    id_verification: 'ID Verification',
    meetup_organizer: 'Meetup Organizer',
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {request.profile.display_name || request.profile.full_name || 'Anonymous User'}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                statusColors[request.status as keyof typeof statusColors]
              }`}
            >
              {request.status}
            </span>
          </div>

          <p className="text-sm text-gray-600 mb-1">{request.profile.email}</p>

          <p className="text-sm text-gray-500">
            Requested: {new Date(request.created_at).toLocaleDateString()} at{' '}
            {new Date(request.created_at).toLocaleTimeString()}
          </p>
        </div>

        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
            {requestTypeLabels[request.request_type as keyof typeof requestTypeLabels]}
          </span>
        </div>
      </div>

      {/* Current verification status */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Current Status:</span>{' '}
          <span className="capitalize">{request.profile.verification_status.replace('_', ' ')}</span>
        </p>
      </div>

      {/* Submitted information */}
      {request.submitted_info && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Submitted Information:</h4>
          <pre className="bg-gray-50 p-3 rounded text-sm text-gray-700 overflow-auto">
            {JSON.stringify(request.submitted_info, null, 2)}
          </pre>
        </div>
      )}

      {/* User bio */}
      {request.profile.bio && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Bio:</h4>
          <p className="text-sm text-gray-700">{request.profile.bio}</p>
        </div>
      )}

      {/* Admin notes */}
      {request.admin_notes && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">Admin Notes:</h4>
          <p className="text-sm text-gray-700">{request.admin_notes}</p>
        </div>
      )}

      {/* Rejection reason */}
      {request.rejection_reason && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <h4 className="font-medium text-red-900 mb-1">Rejection Reason:</h4>
          <p className="text-sm text-red-700">{request.rejection_reason}</p>
        </div>
      )}

      {/* Action buttons (only for pending requests) */}
      {request.status === 'pending' && (
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => onApprove(request.id, request.user_id, request.request_type)}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            ✓ Approve
          </button>

          {!showRejectForm ? (
            <button
              onClick={() => setShowRejectForm(true)}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              ✗ Reject
            </button>
          ) : (
            <div className="flex-1 space-y-2">
              <input
                type="text"
                placeholder="Rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onReject(request.id, rejectionReason)
                    setShowRejectForm(false)
                    setRejectionReason('')
                  }}
                  className="flex-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectForm(false)
                    setRejectionReason('')
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
