'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdvertisingInquiry } from '@/lib/types/sponsor'


export const dynamic = 'force-dynamic'

export default function AdvertisingInquiriesPage() {
  const [inquiries, setInquiries] = useState<AdvertisingInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<AdvertisingInquiry | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [adminNotes, setAdminNotes] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

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
    loadInquiries()
  }

  async function loadInquiries() {
    const supabase = createClient()
    try {
      let query = supabase
        .from('advertising_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setInquiries(data || [])
    } catch (error) {
      console.error('Error loading inquiries:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateInquiryStatus(inquiryId: string, newStatus: string) {
    const supabase = createClient()
    setUpdatingId(inquiryId)
    try {
      const { error } = await supabase
        .from('advertising_inquiries')
        .update({
          status: newStatus,
          admin_notes: adminNotes || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', inquiryId)

      if (error) throw error

      setInquiries(inquiries.map(i =>
        i.id === inquiryId
          ? { ...i, status: newStatus as any, admin_notes: adminNotes || null }
          : i
      ))
      setSelectedInquiry(null)
      setAdminNotes('')
    } catch (error) {
      console.error('Error updating inquiry:', error)
      alert('Failed to update inquiry')
    } finally {
      setUpdatingId(null)
    }
  }

  async function convertToSponsor(inquiry: AdvertisingInquiry) {
    const supabase = createClient()
    const slug = inquiry.company_name.toLowerCase().replace(/\s+/g, '-')
    try {
      const { error } = await supabase
        .from('sponsors')
        .insert({
          company_name: inquiry.company_name,
          slug,
          description: inquiry.company_description,
          website_url: inquiry.website_url || '',
          contact_email: inquiry.contact_email,
          contact_name: inquiry.contact_name,
          tier: inquiry.interested_tiers[0] || 'community',
          status: 'pending',
          categories: ['grief-support', 'wellness'],
        })

      if (error) throw error

      await updateInquiryStatus(inquiry.id, 'converted')
      alert('Inquiry converted to sponsor!')
    } catch (error) {
      console.error('Error converting to sponsor:', error)
      alert('Failed to convert inquiry')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      negotiating: 'bg-purple-100 text-purple-800',
      converted: 'bg-green-100 text-green-800',
      declined: 'bg-red-100 text-red-800',
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
        <div className="mb-8">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Admin
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Advertising Inquiries</h1>
          <p className="text-slate-600">Review and manage sponsorship inquiries</p>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              loadInquiries()
            }}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Inquiries</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="negotiating">Negotiating</option>
            <option value="converted">Converted</option>
            <option value="declined">Declined</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading inquiries...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600">No inquiries found</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Inquiries List */}
            <div className="lg:col-span-2 space-y-4">
              {inquiries.map(inquiry => (
                <div
                  key={inquiry.id}
                  onClick={() => {
                    setSelectedInquiry(inquiry)
                    setAdminNotes(inquiry.admin_notes || '')
                  }}
                  className={`bg-white rounded-xl shadow-sm border-2 p-6 cursor-pointer transition ${
                    selectedInquiry?.id === inquiry.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900">{inquiry.company_name}</h3>
                      <p className="text-sm text-slate-600">{inquiry.contact_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{inquiry.contact_email}</p>
                  <p className="text-sm text-slate-500 line-clamp-2">{inquiry.company_description}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Details Panel */}
            {selectedInquiry && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit sticky top-4">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Details</h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Company</p>
                    <p className="text-slate-900 font-medium">{selectedInquiry.company_name}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Contact</p>
                    <p className="text-slate-900">{selectedInquiry.contact_name}</p>
                    <p className="text-sm text-blue-600 hover:underline cursor-pointer">
                      {selectedInquiry.contact_email}
                    </p>
                  </div>

                  {selectedInquiry.phone && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Phone</p>
                      <p className="text-slate-900">{selectedInquiry.phone}</p>
                    </div>
                  )}

                  {selectedInquiry.website_url && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Website</p>
                      <a
                        href={selectedInquiry.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {selectedInquiry.website_url}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Budget Range</p>
                    <p className="text-slate-900">{selectedInquiry.budget_range || 'Not specified'}</p>
                  </div>

                  {selectedInquiry.interested_tiers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase">Interested Tiers</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedInquiry.interested_tiers.map(tier => (
                          <span
                            key={tier}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                          >
                            {tier}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Description</p>
                    <p className="text-sm text-slate-700 mt-1">{selectedInquiry.company_description}</p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Message</p>
                    <p className="text-sm text-slate-700 mt-1">{selectedInquiry.message}</p>
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mb-6 pb-6 border-t border-slate-200 pt-6">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                    placeholder="Add internal notes about this inquiry..."
                  />
                </div>

                {/* Status Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => convertToSponsor(selectedInquiry)}
                    disabled={updatingId !== null}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    Convert to Sponsor
                  </button>

                  <button
                    onClick={() => updateInquiryStatus(selectedInquiry.id, 'contacted')}
                    disabled={updatingId !== null || selectedInquiry.status === 'contacted'}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    Mark as Contacted
                  </button>

                  <button
                    onClick={() => updateInquiryStatus(selectedInquiry.id, 'negotiating')}
                    disabled={updatingId !== null || selectedInquiry.status === 'negotiating'}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    Move to Negotiating
                  </button>

                  <button
                    onClick={() => updateInquiryStatus(selectedInquiry.id, 'declined')}
                    disabled={updatingId !== null || selectedInquiry.status === 'declined'}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 text-sm font-medium"
                  >
                    Decline Inquiry
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
