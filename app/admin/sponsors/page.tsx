'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sponsor, SponsorTier } from '@/lib/types/sponsor'
export const dynamic = 'force-dynamic'

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const router = useRouter()

  const tiers: SponsorTier[] = ['platinum', 'gold', 'silver', 'bronze', 'community']

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
    loadSponsors()
  }

  async function loadSponsors() {
    const supabase = createClient()
    try {
      let query = supabase
        .from('sponsors')
        .select('*')
        .order('display_order', { ascending: true })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setSponsors(data || [])
    } catch (error) {
      console.error('Error loading sponsors:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateSponsorStatus(sponsorId: string, newStatus: string) {
    const supabase = createClient()
    setUpdatingId(sponsorId)
    try {
      const { error } = await supabase
        .from('sponsors')
        .update({
          status: newStatus,
          approved_at: newStatus === 'active' ? new Date().toISOString() : null,
        })
        .eq('id', sponsorId)

      if (error) throw error

      setSponsors(sponsors.map(s =>
        s.id === sponsorId
          ? { ...s, status: newStatus as any }
          : s
      ))
      setSelectedSponsor(null)
    } catch (error) {
      console.error('Error updating sponsor:', error)
      alert('Failed to update sponsor')
    } finally {
      setUpdatingId(null)
    }
  }

  async function deleteSponsor(sponsorId: string) {
    const supabase = createClient()
    if (!window.confirm('Are you sure you want to delete this sponsor?')) return

    try {
      const { error } = await supabase
        .from('sponsors')
        .delete()
        .eq('id', sponsorId)

      if (error) throw error

      setSponsors(sponsors.filter(s => s.id !== sponsorId))
      setSelectedSponsor(null)
    } catch (error) {
      console.error('Error deleting sponsor:', error)
      alert('Failed to delete sponsor')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      paused: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-slate-100 text-slate-800'
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Sponsors</h1>
            <p className="text-slate-600">Manage active sponsors and partnerships</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {showCreateForm ? 'Cancel' : '+ New Sponsor'}
          </button>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              loadSponsors()
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sponsors</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="paused">Paused</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading sponsors...</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sponsors List */}
            <div className="lg:col-span-2 space-y-4">
              {sponsors.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                  <p className="text-slate-600">No sponsors found</p>
                </div>
              ) : (
                sponsors.map(sponsor => (
                  <div
                    key={sponsor.id}
                    onClick={() => setSelectedSponsor(sponsor)}
                    className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${
                      selectedSponsor?.id === sponsor.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 text-lg">{sponsor.company_name}</h3>
                        <p className="text-sm text-slate-600">{sponsor.contact_name || 'No contact name'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sponsor.status)}`}>
                          {sponsor.status}
                        </span>
                        <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-medium">
                          {sponsor.tier}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-2">{sponsor.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{sponsor.total_impressions} impressions</span>
                      <span>{sponsor.total_clicks} clicks</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Details Panel */}
            {selectedSponsor && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit sticky top-4">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Company</p>
                    <p className="text-slate-900 font-medium">{selectedSponsor.company_name}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Tier</p>
                    <p className="text-slate-900">{selectedSponsor.tier}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Contact</p>
                    <p className="text-slate-900">{selectedSponsor.contact_name}</p>
                    <p className="text-sm text-blue-600">{selectedSponsor.contact_email}</p>
                  </div>

                  {selectedSponsor.website_url && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Website</p>
                      <a
                        href={selectedSponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {selectedSponsor.website_url}
                      </a>
                    </div>
                  )}

                  {selectedSponsor.description && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                      <p className="text-sm text-slate-700 mt-1">{selectedSponsor.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Analytics</p>
                    <div className="flex gap-4 mt-2">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{selectedSponsor.total_impressions}</p>
                        <p className="text-xs text-slate-600">Impressions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{selectedSponsor.total_clicks}</p>
                        <p className="text-xs text-slate-600">Clicks</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="space-y-2 border-t border-slate-200 pt-6">
                  {selectedSponsor.status !== 'active' && (
                    <button
                      onClick={() => updateSponsorStatus(selectedSponsor.id, 'active')}
                      disabled={updatingId !== null}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                    >
                      Activate
                    </button>
                  )}

                  {selectedSponsor.status !== 'paused' && (
                    <button
                      onClick={() => updateSponsorStatus(selectedSponsor.id, 'paused')}
                      disabled={updatingId !== null}
                      className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 text-sm font-medium"
                    >
                      Pause
                    </button>
                  )}

                  {selectedSponsor.status !== 'expired' && (
                    <button
                      onClick={() => updateSponsorStatus(selectedSponsor.id, 'expired')}
                      disabled={updatingId !== null}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                    >
                      Mark Expired
                    </button>
                  )}

                  <button
                    onClick={() => deleteSponsor(selectedSponsor.id)}
                    disabled={updatingId !== null}
                    className="w-full px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition disabled:opacity-50 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
