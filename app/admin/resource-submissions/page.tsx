'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ResourceSubmission, resourceTypeLabels, resourceTypeIcons, resourceCategoryLabels } from '@/lib/types/resource'

export default function ResourceSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ResourceSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<ResourceSubmission | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
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
    loadSubmissions()
  }

  async function loadSubmissions() {
    try {
      const { data, error } = await supabase
        .from('resource_submissions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data || [])
    } catch (error) {
      console.error('Error loading submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function deleteSubmission(submissionId: string) {
    setDeletingId(submissionId)
    try {
      const { error } = await supabase
        .from('resource_submissions')
        .delete()
        .eq('id', submissionId)

      if (error) throw error

      setSubmissions(submissions.filter(s => s.id !== submissionId))
      setSelectedSubmission(null)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting submission:', error)
      alert('Failed to delete submission')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Checking permissions...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Resource Submissions</h1>
          <p className="text-slate-600">Review user-submitted grief resources</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading submissions...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-slate-600 text-lg">No resource submissions yet</p>
            <p className="text-slate-500 text-sm mt-2">Users can submit resources from the Resources page</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Submissions List */}
            <div className="lg:col-span-2 space-y-4">
              {submissions.map(submission => (
                <div
                  key={submission.id}
                  onClick={() => {
                    setSelectedSubmission(submission)
                    setDeleteConfirm(null)
                  }}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${
                    selectedSubmission?.id === submission.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{resourceTypeIcons[submission.resource_type]}</span>
                        <h3 className="font-bold text-slate-900">{submission.title}</h3>
                      </div>
                      <p className="text-xs text-slate-500">{resourceTypeLabels[submission.resource_type]}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-2 line-clamp-2">{submission.description}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Submitted by: {submission.submitter_name}</span>
                    <span>{new Date(submission.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Details Panel */}
            {selectedSubmission && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit sticky top-4">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Submission Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Title</p>
                    <p className="text-slate-900 font-medium">{selectedSubmission.title}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Type</p>
                    <p className="text-slate-900">
                      {resourceTypeIcons[selectedSubmission.resource_type]} {resourceTypeLabels[selectedSubmission.resource_type]}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                    <p className="text-sm text-slate-700">{selectedSubmission.description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Categories</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSubmission.categories.map(cat => (
                        <span
                          key={cat}
                          className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs"
                        >
                          {resourceCategoryLabels[cat]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {selectedSubmission.external_url && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Website</p>
                      <a
                        href={selectedSubmission.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm break-all"
                      >
                        {selectedSubmission.external_url}
                      </a>
                    </div>
                  )}

                  {selectedSubmission.phone_number && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Phone</p>
                      <p className="text-slate-900">{selectedSubmission.phone_number}</p>
                    </div>
                  )}

                  {selectedSubmission.author && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Author/Organization</p>
                      <p className="text-slate-900">{selectedSubmission.author}</p>
                    </div>
                  )}

                  {selectedSubmission.source && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Source</p>
                      <p className="text-slate-900">{selectedSubmission.source}</p>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-xs font-medium text-slate-500 uppercase mb-1">Submitted By</p>
                    <p className="text-slate-900">{selectedSubmission.submitter_name}</p>
                    <p className="text-sm text-blue-600">{selectedSubmission.submitter_email}</p>
                  </div>

                  {selectedSubmission.submitter_notes && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Submitter Notes</p>
                      <p className="text-sm text-slate-700 italic">{selectedSubmission.submitter_notes}</p>
                    </div>
                  )}
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === selectedSubmission.id ? (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    <p className="text-sm text-slate-700 font-medium">Delete this submission?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deleteSubmission(selectedSubmission.id)}
                        disabled={deletingId !== null}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                      >
                        {deletingId === selectedSubmission.id ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-200 pt-4">
                    <button
                      onClick={() => setDeleteConfirm(selectedSubmission.id)}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      Delete Submission
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
