'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  pendingVerifications: number
  bannedUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const router = useRouter()
  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    checkAdminAccess()
  }, [])

  async function checkAdminAccess() {
    const supabase = supabaseRef.current
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
      if (!adminEmails.includes(user.email || '')) {
        setError('You do not have admin access')
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadStats()
    } catch (err) {
      console.error('Error checking admin access:', err)
      setError('Failed to verify admin access')
    }
  }

  async function loadStats() {
    const supabase = supabaseRef.current
    try {
      const { count: totalUsers } = await supabase.from('profiles').select('id', { count: 'exact' })
      const { count: verifiedUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .neq('verification_status', 'unverified')
      const { count: unverifiedUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('verification_status', 'unverified')
      const { count: pendingVerifications } = await supabase
        .from('verification_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')
      const { count: bannedUsers } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_banned', true)

      setStats({
        totalUsers: totalUsers || 0,
        verifiedUsers: verifiedUsers || 0,
        unverifiedUsers: unverifiedUsers || 0,
        pendingVerifications: pendingVerifications || 0,
        bannedUsers: bannedUsers || 0,
      })
    } catch (err) {
      console.error('Error loading stats:', err)
      setError('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Checking admin access...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">Community management and moderation</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <p className="text-slate-600 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <p className="text-slate-600 text-sm font-medium">Verified Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.verifiedUsers}</p>
              <p className="text-xs text-slate-500 mt-2">
                {stats.totalUsers > 0 ? ((stats.verifiedUsers / stats.totalUsers) * 100).toFixed(0) : 0}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <p className="text-slate-600 text-sm font-medium">Unverified Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.unverifiedUsers}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <p className="text-slate-600 text-sm font-medium">Pending Verifications</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.pendingVerifications}</p>
              {stats.pendingVerifications > 0 && (
                <Link
                  href="/dashboard/admin/verifications"
                  className="text-blue-600 text-xs font-medium mt-2 inline-block hover:text-blue-700"
                >
                  Review →
                </Link>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-slate-600 text-sm font-medium">Banned Users</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.bannedUsers}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link
            href="/dashboard/admin/verifications"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">⚠️</div>
            <p className="text-sm font-medium text-slate-900">Verifications</p>
          </Link>

          <Link
            href="/admin/store"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">🛒</div>
            <p className="text-sm font-medium text-slate-900">Store</p>
          </Link>

          <Link
            href="/admin/resources"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">📚</div>
            <p className="text-sm font-medium text-slate-900">Resources</p>
          </Link>

          <Link
            href="/admin/forums"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">💬</div>
            <p className="text-sm font-medium text-slate-900">Forums</p>
          </Link>

          <Link
            href="/admin/meetups"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <p className="text-sm font-medium text-slate-900">Meetups</p>
          </Link>

          <Link
            href="/admin/requests"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">📬</div>
            <p className="text-sm font-medium text-slate-900">Requests</p>
          </Link>

          <Link
            href="/admin/concerns"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">🚨</div>
            <p className="text-sm font-medium text-slate-900">Concerns</p>
          </Link>

          <Link
            href="/admin/reports"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-medium text-slate-900">Reports</p>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">👤</div>
            <p className="text-sm font-medium text-slate-900">Users</p>
          </Link>

          <Link
            href="/admin/moderation"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-sm font-medium text-slate-900">Moderation</p>
          </Link>

          <Link
            href="/admin/messaging"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">💌</div>
            <p className="text-sm font-medium text-slate-900">Messaging</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition text-center"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <p className="text-sm font-medium text-slate-900">Settings</p>
          </Link>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-block px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
