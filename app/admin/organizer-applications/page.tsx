'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Application {
  id: string
  user_id: string
  experience: string
  motivation: string
  planned_meetups: string
  certifications: string | null
  status: string
  payment_amount_cents: number
  paid_at: string | null
  created_at: string
  user?: {
    display_name: string | null
    email: string
    verification_status: string
  }
}

export default function OrganizerApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  useEffect(() => {
    loadApplications()
  }, [])

  async function loadApplications() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('organizer_applications')
        .select(`
          *,
          user:profiles!organizer_applications_user_id_fkey(display_name, email, verification_status)
        `)
        .in('status', ['payment_complete', 'under_review'])
        .order('created_at', { ascending: true })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function approveApplication(appId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('organizer_applications')
      .update({
        status: 'approved',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', appId)

    if (!error) {
      setSelectedApp(null)
      loadApplications()
      alert('Application approved! User is now a verified organizer.')
    }
  }

  async function rejectApplication(appId: string, reason: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('organizer_applications')
      .update({
        status: 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason,
      })
      .eq('id', appId)

    if (!error) {
      setSelectedApp(null)
      loadApplications()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Organizer Applications</h1>
          <p className="text-slate-600">Review and approve meetup organizer requests</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h2>
            <p className="text-slate-600">No pending organizer applications</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Applications List */}
            <div className="space-y-4">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app)}
                  className={`w-full text-left bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition ${
                    selectedApp?.id === app.id ? 'border-blue-500' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-900">
                      {app.user?.display_name || app.user?.email || 'Unknown User'}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      app.status === 'payment_complete' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {app.status === 'payment_complete' ? 'Paid' : 'Reviewing'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">{app.motivation}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))}
            </div>

            {/* Application Detail */}
            {selectedApp ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Application Details</h2>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Applicant</p>
                    <p className="text-slate-900">
                      {selectedApp.user?.display_name || 'Not set'}
                    </p>
                    <p className="text-sm text-slate-500">{selectedApp.user?.email}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">Experience</p>
                    <p className="text-slate-900 whitespace-pre-wrap">{selectedApp.experience}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">Motivation</p>
                    <p className="text-slate-900 whitespace-pre-wrap">{selectedApp.motivation}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-700">Planned Meetups</p>
                    <p className="text-slate-900 whitespace-pre-wrap">{selectedApp.planned_meetups}</p>
                  </div>

                  {selectedApp.certifications && (
                    <div>
                      <p className="text-sm font-medium text-slate-700">Certifications</p>
                      <p className="text-slate-900 whitespace-pre-wrap">{selectedApp.certifications}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex gap-3">
                    <button
                      onClick={() => approveApplication(selectedApp.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('Rejection reason:')
                        if (reason) {
                          rejectApplication(selectedApp.id, reason)
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 rounded-xl p-12 text-center">
                <p className="text-slate-600">Select an application to review</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
