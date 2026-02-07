'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PremiumMembershipModal from '@/components/PremiumMembershipModal'

export const dynamic = 'force-dynamic'

interface ConnectionWithUser {
  id: string
  requester_id: string
  addressee_id: string
  status: string
  message: string | null
  requested_at: string
  user: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionWithUser[]>([])
  const [pendingRequests, setPendingRequests] = useState<ConnectionWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'sent'>('friends')
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const router = useRouter()
  const supabaseRef = useRef<any>(null)

  useEffect(() => {
    supabaseRef.current = createClient()
    checkUser()
  }, [])

  async function checkUser() {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    // Check if user has premium tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_tier !== 'premium') {
      setShowPremiumModal(true)
      setLoading(false)
      return
    }

    setUser(user)
    loadConnections(user.id)
  }

  async function loadConnections(userId: string) {
    const supabase = supabaseRef.current
    try {
      // Get accepted connections
      const { data: accepted } = await supabase
        .from('user_connections')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      // Get pending requests (where user is addressee)
      const { data: pending } = await supabase
        .from('user_connections')
        .select('*')
        .eq('status', 'pending')
        .eq('addressee_id', userId)

      // Get sent requests (where user is requester)
      const { data: sent } = await supabase
        .from('user_connections')
        .select('*')
        .eq('status', 'pending')
        .eq('requester_id', userId)

      // Fetch user details for all connections
      const allConnections = [...(accepted || []), ...(pending || []), ...(sent || [])]
      const userIds = new Set<string>()
      allConnections.forEach(c => {
        userIds.add(c.requester_id)
        userIds.add(c.addressee_id)
      })
      userIds.delete(userId)

      const { data: users } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, verification_status')
        .in('id', Array.from(userIds))

      const userMap = new Map(users?.map(u => [u.id, u]) || [])

      // Process accepted connections
      const processedAccepted = (accepted || []).map(c => ({
        ...c,
        user: userMap.get(c.requester_id === userId ? c.addressee_id : c.requester_id) || {
          id: '',
          display_name: null,
          avatar_url: null,
          verification_status: 'unverified'
        }
      }))

      // Process pending requests
      const processedPending = (pending || []).map(c => ({
        ...c,
        user: userMap.get(c.requester_id) || {
          id: c.requester_id,
          display_name: null,
          avatar_url: null,
          verification_status: 'unverified'
        }
      }))

      // Process sent requests
      const processedSent = (sent || []).map(c => ({
        ...c,
        user: userMap.get(c.addressee_id) || {
          id: c.addressee_id,
          display_name: null,
          avatar_url: null,
          verification_status: 'unverified'
        }
      }))

      setConnections(processedAccepted)
      setPendingRequests([...processedPending, ...processedSent])
    } catch (error) {
      console.error('Error loading connections:', error)
    } finally {
      setLoading(false)
    }
  }

  async function acceptRequest(connectionId: string) {
    const supabase = supabaseRef.current
    const { error } = await supabase
      .from('user_connections')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', connectionId)

    if (!error && user) {
      loadConnections(user.id)
    }
  }

  async function declineRequest(connectionId: string) {
    const supabase = supabaseRef.current
    const { error } = await supabase
      .from('user_connections')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', connectionId)

    if (!error && user) {
      loadConnections(user.id)
    }
  }

  async function removeConnection(connectionId: string) {
    const supabase = supabaseRef.current
    const { error } = await supabase
      .from('user_connections')
      .delete()
      .eq('id', connectionId)

    if (!error && user) {
      loadConnections(user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading connections...</p>
      </div>
    )
  }

  if (showPremiumModal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <PremiumMembershipModal
          isOpen={showPremiumModal}
          onClose={() => router.push('/dashboard')}
        />
      </div>
    )
  }

  const pendingIncoming = pendingRequests.filter(r => r.addressee_id === user?.id)
  const pendingSent = pendingRequests.filter(r => r.requester_id === user?.id)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Connections</h1>
          <p className="text-slate-600">Manage your friends and connection requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'friends'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Friends ({connections.length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Requests ({pendingIncoming.length})
            {pendingIncoming.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingIncoming.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'sent'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Sent ({pendingSent.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading connections...</p>
          </div>
        ) : (
          <>
            {/* Friends Tab */}
            {activeTab === 'friends' && (
              <div className="space-y-3">
                {connections.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="text-5xl mb-4">👋</div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No Connections Yet</h2>
                    <p className="text-slate-600">
                      Connect with others in the community through forums and meetups
                    </p>
                  </div>
                ) : (
                  connections.map((conn) => (
                    <div key={conn.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                        {conn.user.avatar_url ? (
                          <img src={conn.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl text-slate-400">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">
                          {conn.user.display_name || 'User'}
                        </h3>
                        <p className="text-sm text-slate-500">Connected</p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/messages/new?to=${conn.user.id}`}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          Message
                        </Link>
                        <button
                          onClick={() => removeConnection(conn.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pending Requests Tab */}
            {activeTab === 'pending' && (
              <div className="space-y-3">
                {pendingIncoming.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-600">No pending requests</p>
                  </div>
                ) : (
                  pendingIncoming.map((req) => (
                    <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                          {req.user.avatar_url ? (
                            <img src={req.user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl text-slate-400">👤</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-slate-900">
                            {req.user.display_name || 'User'}
                          </h3>
                          <p className="text-sm text-slate-500">Wants to connect</p>
                        </div>
                      </div>
                      {req.message && (
                        <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                          "{req.message}"
                        </p>
                      )}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => acceptRequest(req.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => declineRequest(req.id)}
                          className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sent Requests Tab */}
            {activeTab === 'sent' && (
              <div className="space-y-3">
                {pendingSent.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                    <p className="text-slate-600">No sent requests</p>
                  </div>
                ) : (
                  pendingSent.map((req) => (
                    <div key={req.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                        {req.user.avatar_url ? (
                          <img src={req.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl text-slate-400">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-slate-900">
                          {req.user.display_name || 'User'}
                        </h3>
                        <p className="text-sm text-slate-500">Pending</p>
                      </div>
                      <button
                        onClick={() => removeConnection(req.id)}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
