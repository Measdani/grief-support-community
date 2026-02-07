'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
export const dynamic = 'force-dynamic'

interface Stats {
  totalUsers: number
  verifiedUsers: number
  totalMeetups: number
  totalMemorials: number
  pendingReports: number
  pendingOrganizerApps: number
  totalResources: number
  totalResourceSubmissions: number
  totalStoreProducts: number
  totalForumTopics: number
  totalPremiumUsers: number
  pendingBackgroundChecks: number
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

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

    // Check if user is admin (you'd want to have an admin role in your system)
    const { data: profile } = await supabase
      .from('profiles')
      .select('verification_status, email')
      .eq('id', user.id)
      .single()

    // For now, check if user is meetup_organizer or specific admin emails
    // In production, you'd have a proper admin role
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    const isAdminUser = adminEmails.includes(profile?.email || '') ||
                        profile?.verification_status === 'meetup_organizer'

    if (!isAdminUser) {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    loadStats()
  }

  async function loadStats() {
    const supabase = createClient()
    try {
      // Get user counts
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('verification_status', 'unverified')

      // Get meetup count
      const { count: totalMeetups } = await supabase
        .from('meetups')
        .select('*', { count: 'exact', head: true })

      // Get memorial count
      const { count: totalMemorials } = await supabase
        .from('memorials')
        .select('*', { count: 'exact', head: true })

      // Get pending reports
      const { count: pendingReports } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      // Get pending organizer applications
      const { count: pendingOrganizerApps } = await supabase
        .from('organizer_applications')
        .select('*', { count: 'exact', head: true })
        .in('status', ['payment_complete', 'under_review'])

      // Get resources count
      const { count: totalResources } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })

      // Get resource submissions count
      const { count: totalResourceSubmissions } = await supabase
        .from('resource_submissions')
        .select('*', { count: 'exact', head: true })

      // Get store products count
      const { count: totalStoreProducts } = await supabase
        .from('store_products')
        .select('*', { count: 'exact', head: true })

      // Get forum topics count
      const { count: totalForumTopics } = await supabase
        .from('forum_topics')
        .select('*', { count: 'exact', head: true })

      // Get premium users count
      const { count: totalPremiumUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', 'premium')

      // Get pending background checks count
      const { count: pendingBackgroundChecks } = await supabase
        .from('background_check_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        totalMeetups: totalMeetups || 0,
        totalMemorials: totalMemorials || 0,
        pendingReports: pendingReports || 0,
        pendingOrganizerApps: pendingOrganizerApps || 0,
        totalResources: totalResources || 0,
        totalResourceSubmissions: totalResourceSubmissions || 0,
        totalStoreProducts: totalStoreProducts || 0,
        totalForumTopics: totalForumTopics || 0,
        totalPremiumUsers: totalPremiumUsers || 0,
        pendingBackgroundChecks: pendingBackgroundChecks || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Manage users, content, and platform settings</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Total Users</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalUsers}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Verified Users</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.verifiedUsers}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Memorials</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalMemorials}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Resources</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalResources}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Store Products</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalStoreProducts}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Forum Topics</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalForumTopics}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Meetups</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.totalMeetups}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Pending Reports</p>
                <p className={`text-3xl font-bold ${stats?.pendingReports ? 'text-red-600' : 'text-slate-900'}`}>
                  {stats?.pendingReports}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Organizer Apps</p>
                <p className={`text-3xl font-bold ${stats?.pendingOrganizerApps ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats?.pendingOrganizerApps}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Premium Users</p>
                <p className="text-3xl font-bold text-blue-600">{stats?.totalPremiumUsers}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <p className="text-sm text-slate-600">Pending Background Checks</p>
                <p className={`text-3xl font-bold ${stats?.pendingBackgroundChecks ? 'text-amber-600' : 'text-slate-900'}`}>
                  {stats?.pendingBackgroundChecks}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link
                href="/admin/users"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition"
              >
                <div className="text-3xl mb-3">👥</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Users</h3>
                <p className="text-sm text-slate-600">View, verify, and moderate user accounts</p>
              </Link>

              <Link
                href="/admin/reports"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-red-200 transition"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🚨</span>
                  {stats?.pendingReports ? (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {stats.pendingReports}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Review Reports</h3>
                <p className="text-sm text-slate-600">Handle reported content and users</p>
              </Link>

              <Link
                href="/admin/organizer-applications"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-amber-200 transition"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">🎓</span>
                  {stats?.pendingOrganizerApps ? (
                    <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {stats.pendingOrganizerApps}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Organizer Applications</h3>
                <p className="text-sm text-slate-600">Review and approve organizer requests</p>
              </Link>

              <Link
                href="/admin/background-checks"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-emerald-200 transition"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">✅</span>
                  {stats?.pendingBackgroundChecks ? (
                    <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {stats.pendingBackgroundChecks}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Background Checks</h3>
                <p className="text-sm text-slate-600">Review background check applications for hosts</p>
              </Link>

              <Link
                href="/admin/meetups"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-green-200 transition"
              >
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Meetups</h3>
                <p className="text-sm text-slate-600">View and moderate meetups</p>
              </Link>

              <Link
                href="/admin/forums"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-purple-200 transition"
              >
                <div className="text-3xl mb-3">💬</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Forums</h3>
                <p className="text-sm text-slate-600">Moderate forum topics and discussions</p>
              </Link>

              <Link
                href="/admin/forums/categories"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-purple-200 transition"
              >
                <div className="text-3xl mb-3">📁</div>
                <h3 className="font-bold text-slate-900 mb-1">Forum Categories</h3>
                <p className="text-sm text-slate-600">Create and manage forum categories</p>
              </Link>

              <Link
                href="/admin/resources"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-teal-200 transition"
              >
                <div className="text-3xl mb-3">📚</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Resources</h3>
                <p className="text-sm text-slate-600">Add and edit grief resources</p>
              </Link>

              <Link
                href="/admin/resource-submissions"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-teal-200 transition"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">📝</span>
                  {stats?.totalResourceSubmissions ? (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      {stats.totalResourceSubmissions}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Resource Submissions</h3>
                <p className="text-sm text-slate-600">Review user-submitted resources</p>
              </Link>

              <Link
                href="/admin/store"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-pink-200 transition"
              >
                <div className="text-3xl mb-3">🛍️</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Store</h3>
                <p className="text-sm text-slate-600">Products, orders, and inventory</p>
              </Link>

              <Link
                href="/dashboard/admin/verifications"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition"
              >
                <div className="text-3xl mb-3">✅</div>
                <h3 className="font-bold text-slate-900 mb-1">ID Verifications</h3>
                <p className="text-sm text-slate-600">Review ID verification requests</p>
              </Link>

              <Link
                href="/admin/advertising"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-cyan-200 transition"
              >
                <div className="text-3xl mb-3">📢</div>
                <h3 className="font-bold text-slate-900 mb-1">Advertising Inquiries</h3>
                <p className="text-sm text-slate-600">Review sponsorship inquiries and requests</p>
              </Link>

              <Link
                href="/admin/sponsors"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-yellow-200 transition"
              >
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-bold text-slate-900 mb-1">Manage Sponsors</h3>
                <p className="text-sm text-slate-600">Active sponsors and partnerships</p>
              </Link>

              <Link
                href="/admin/settings"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-slate-300 transition"
              >
                <div className="text-3xl mb-3">⚙️</div>
                <h3 className="font-bold text-slate-900 mb-1">Settings</h3>
                <p className="text-sm text-slate-600">Platform configuration and settings</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
