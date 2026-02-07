'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Report, reportTypeLabels } from '@/lib/types/messaging'
export const dynamic = 'force-dynamic'

interface ReportWithReporter extends Report {
  reporter?: {
    display_name: string | null
    email: string
  }
  forum_post?: {
    content: string
    topic_id: string
    forum_topic?: {
      title: string
      slug: string
    }
  }
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportWithReporter[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('pending')

  useEffect(() => {
    loadReports()
  }, [filter])

  async function loadReports() {
    const supabase = createClient()
    setLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(display_name, email),
          forum_post:forum_posts(content, topic_id, forum_topic:forum_topics(title, slug))
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateReportStatus(reportId: string, status: string, actionTaken?: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        action_taken: actionTaken || null,
      })
      .eq('id', reportId)

    if (!error) {
      loadReports()
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    resolved_action_taken: 'bg-green-100 text-green-800',
    resolved_no_action: 'bg-slate-100 text-slate-800',
    dismissed: 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['pending', 'under_review', 'resolved_action_taken', 'resolved_no_action', 'dismissed', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-600">No reports found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[report.status]}`}>
                        {report.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-slate-500">
                        {reportTypeLabels[report.report_type]}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Reported by {report.reporter?.display_name || report.reporter?.email || 'Unknown'}
                      {' • '}
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                    {report.reportable_type}
                  </span>
                </div>

                <p className="text-slate-900 mb-4">{report.description}</p>

                {/* Show reported content preview */}
                {report.reportable_type === 'post' && (
                  <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded">
                    <p className="text-xs font-medium text-slate-600 mb-2">Reported Post Content:</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mb-2">
                      {report.forum_post?.content}
                    </p>
                    {report.forum_post?.forum_topic && (
                      <Link
                        href={`/forums/t/${report.forum_post.topic_id}`}
                        target="_blank"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View in Discussion: {report.forum_post.forum_topic.title} →
                      </Link>
                    )}
                  </div>
                )}

                {report.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => updateReportStatus(report.id, 'under_review')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      Review
                    </button>
                    <button
                      onClick={() => updateReportStatus(report.id, 'dismissed')}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {report.status === 'under_review' && (
                  <div className="flex gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => updateReportStatus(report.id, 'resolved_action_taken', 'Warning issued')}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                    >
                      Take Action
                    </button>
                    <button
                      onClick={() => updateReportStatus(report.id, 'resolved_no_action')}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                    >
                      No Action Needed
                    </button>
                  </div>
                )}

                {report.action_taken && (
                  <p className="mt-4 text-sm text-green-700 bg-green-50 p-3 rounded">
                    Action taken: {report.action_taken}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
