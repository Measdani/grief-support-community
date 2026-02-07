'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BackgroundCheckApplication {
  id: string
  user_id: string
  status: string
  provider: string
  full_legal_name: string
  date_of_birth: string | null
  address_line_1: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  submitted_at: string | null
  approved_at: string | null
  expires_at: string | null
  rejection_reason: string | null
  admin_notes: string | null
  profile?: {
    email: string
    display_name: string
  }
}

export default function AdminBackgroundChecksPage() {
  const [applications, setApplications] = useState<BackgroundCheckApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedApp, setSelectedApp] = useState<BackgroundCheckApplication | null>(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status, email')
      .eq('id', user.id)
      .single()

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    const isAdminUser = adminEmails.includes(profile?.email || '') ||
                        profile?.verification_status === 'meetup_organizer'

    if (!isAdminUser) {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    loadApplications()
  }

  async function loadApplications() {
    const supabase = createClient()
    try {
      const query = supabase
        .from('background_check_applications')
        .select(`
          id,
          user_id,
          status,
          provider,
          full_legal_name,
          date_of_birth,
          address_line_1,
          city,
          state,
          zip_code,
          submitted_at,
          approved_at,
          expires_at,
          rejection_reason,
          admin_notes,
          profiles:user_id(email, display_name)
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error

      setApplications(data || [])
      setMessage(null)
    } catch (error) {
      console.error('Error loading applications:', error)
      setMessage({ type: 'error', text: 'Failed to load applications' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      setLoading(true)
      loadApplications()
    }
  }, [filter, isAdmin])

  async function handleApprove(app: BackgroundCheckApplication) {
    setProcessingId(app.id)
    try {
      const response = await fetch(`/api/admin/background-check/${app.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: approvalNotes || null }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to approve')
      }

      setMessage({ type: 'success', text: 'Application approved successfully!' })
      setSelectedApp(null)
      setApprovalNotes('')
      await loadApplications()
    } catch (error) {
      console.error('Error approving:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to approve application',
      })
    } finally {
      setProcessingId(null)
    }
  }

  async function handleReject(app: BackgroundCheckApplication) {
    if (!rejectionReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason' })
      return
    }

    setProcessingId(app.id)
    try {
      const response = await fetch(`/api/admin/background-check/${app.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject')
      }

      setMessage({ type: 'success', text: 'Application rejected successfully!' })
      setSelectedApp(null)
      setRejectionReason('')
      await loadApplications()
    } catch (error) {
      console.error('Error rejecting:', error)
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reject application',
      })
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Checking permissions...</p>
      </div>
    )
  }

  const filteredApps = filter === 'all' ? applications : applications.filter(app => app.status === filter)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Background Check Applications</h1>
          <p className="text-slate-600">Review and approve background check applications for gathering hosts</p>
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

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {status === 'pending' && applications.filter(a => a.status === 'pending').length > 0 && (
                <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {applications.filter(a => a.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading applications...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No applications found</p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View all applications
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-slate-900">{app.full_legal_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-slate-600">Email</p>
                        <p className="font-medium text-slate-900">{app.profile?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Submitted</p>
                        <p className="font-medium text-slate-900">{formatDate(app.submitted_at)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Address</p>
                        <p className="font-medium text-slate-900">
                          {app.city && app.state ? `${app.city}, ${app.state}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {app.status === 'approved' && (
                      <div className="bg-green-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800">
                          <strong>Approved:</strong> {formatDate(app.approved_at)} • <strong>Expires:</strong> {formatDate(app.expires_at)}
                        </p>
                      </div>
                    )}

                    {app.status === 'rejected' && app.rejection_reason && (
                      <div className="bg-red-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-800">
                          <strong>Reason:</strong> {app.rejection_reason}
                        </p>
                      </div>
                    )}

                    {app.admin_notes && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-slate-700">
                          <strong>Admin Notes:</strong> {app.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedApp(app)
                          setRejectionReason('')
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal - Approve */}
      {selectedApp && selectedApp.status === 'pending' && rejectionReason === '' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Approve Application?</h2>
              <p className="text-slate-600 mb-6">
                Approve the background check for <strong>{selectedApp.full_legal_name}</strong>? They will be able to create and host gatherings.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add notes about this application..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(selectedApp)}
                  disabled={processingId === selectedApp.id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                >
                  {processingId === selectedApp.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => {
                    setSelectedApp(null)
                    setApprovalNotes('')
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Reject */}
      {selectedApp && selectedApp.status === 'pending' && rejectionReason !== '' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Reject Application?</h2>
              <p className="text-slate-600 mb-6">
                Reject the background check for <strong>{selectedApp.full_legal_name}</strong>? They will be notified of the reason.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why are you rejecting this application?"
                  rows={3}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(selectedApp)}
                  disabled={processingId === selectedApp.id || !rejectionReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                >
                  {processingId === selectedApp.id ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  onClick={() => {
                    setSelectedApp(null)
                    setRejectionReason('')
                  }}
                  className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Open for reject (click reject button) */}
      {selectedApp && selectedApp.status === 'pending' && rejectionReason === '' && processingId === null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejectionReason('pending')}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Reject
                </button>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-full px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
