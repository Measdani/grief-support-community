'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sponsor } from '@/lib/types/sponsor'
export const dynamic = 'force-dynamic'

interface SponsorAnalytics extends Sponsor {
  ctr?: number // Click-through rate
}

export default function SponsorAnalyticsPage() {
  const [sponsors, setSponsors] = useState<SponsorAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorAnalytics | null>(null)
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d' | '90d'>('30d')

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
    loadAnalytics()
  }

  async function loadAnalytics() {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .eq('status', 'active')
        .order('total_impressions', { ascending: false })

      if (error) throw error

      const analyticsData = (data || []).map(sponsor => ({
        ...sponsor,
        ctr: sponsor.total_impressions > 0
          ? ((sponsor.total_clicks / sponsor.total_impressions) * 100).toFixed(2)
          : 0,
      }))

      setSponsors(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
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

  const totalImpressions = sponsors.reduce((sum, s) => sum + s.total_impressions, 0)
  const totalClicks = sponsors.reduce((sum, s) => sum + s.total_clicks, 0)
  const overallCTR = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(2)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Sponsor Analytics</h1>
          <p className="text-slate-600">View impressions, clicks, and performance metrics</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-2">Total Sponsors</p>
                <p className="text-4xl font-bold text-slate-900">{sponsors.length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-2">Total Impressions</p>
                <p className="text-4xl font-bold text-slate-900">{totalImpressions.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-2">Total Clicks</p>
                <p className="text-4xl font-bold text-blue-600">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <p className="text-sm text-slate-600 mb-2">Overall CTR</p>
                <p className="text-4xl font-bold text-slate-900">{overallCTR}%</p>
              </div>
            </div>

            {/* Sponsors Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Sponsor Performance</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Company</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Tier</th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">Impressions</th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">Clicks</th>
                      <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">CTR</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sponsors.map(sponsor => (
                      <tr
                        key={sponsor.id}
                        onClick={() => setSelectedSponsor(sponsor)}
                        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-slate-900">{sponsor.company_name}</p>
                            <p className="text-xs text-slate-500">{sponsor.contact_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-700 capitalize">{sponsor.tier}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-medium text-slate-900">{sponsor.total_impressions.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-medium text-blue-600">{sponsor.total_clicks.toLocaleString()}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="font-medium text-slate-900">{sponsor.ctr}%</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            sponsor.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sponsor.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Details Panel */}
            {selectedSponsor && (
              <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                  {selectedSponsor.company_name} - Detailed Analytics
                </h2>

                <div className="grid md:grid-cols-4 gap-6 mb-8">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Total Impressions</p>
                    <p className="text-3xl font-bold text-slate-900">{selectedSponsor.total_impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Total Clicks</p>
                    <p className="text-3xl font-bold text-blue-600">{selectedSponsor.total_clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Click-Through Rate</p>
                    <p className="text-3xl font-bold text-slate-900">{selectedSponsor.ctr}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Tier</p>
                    <p className="text-3xl font-bold capitalize text-slate-900">{selectedSponsor.tier}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Sponsor Info</h3>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-slate-600">Contact:</span> {selectedSponsor.contact_name}</p>
                      <p><span className="text-slate-600">Email:</span> {selectedSponsor.contact_email}</p>
                      <p><span className="text-slate-600">Website:</span>
                        <a href={selectedSponsor.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1">
                          {selectedSponsor.website_url}
                        </a>
                      </p>
                      <p><span className="text-slate-600">Status:</span> {selectedSponsor.status}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Contract Info</h3>
                    <div className="space-y-2 text-sm">
                      {selectedSponsor.start_date && (
                        <p><span className="text-slate-600">Start Date:</span> {new Date(selectedSponsor.start_date).toLocaleDateString()}</p>
                      )}
                      {selectedSponsor.end_date && (
                        <p><span className="text-slate-600">End Date:</span> {new Date(selectedSponsor.end_date).toLocaleDateString()}</p>
                      )}
                      {selectedSponsor.monthly_rate_cents && (
                        <p><span className="text-slate-600">Monthly Rate:</span> ${(selectedSponsor.monthly_rate_cents / 100).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
