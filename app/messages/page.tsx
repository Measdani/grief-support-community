'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConversationWithParticipant } from '@/lib/types/message'
import PremiumMembershipModal from '@/components/PremiumMembershipModal'
export const dynamic = 'force-dynamic'

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationWithParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)

  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const supabase = createClient()
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

    setCurrentUserId(user.id)
    loadConversations(user.id)
  }

  async function loadConversations(userId: string) {
    const supabase = createClient()
    try {
      const { data: conversationData, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_info:conversation_participants(unread_count, last_read_at)
        `)
        .or(`participant_one.eq.${userId},participant_two.eq.${userId}`)
        .order('last_message_at', { ascending: false })

      if (error) throw error

      if (!conversationData) return

      // Fetch other user details for each conversation
      const conversationsWithUsers = await Promise.all(
        conversationData.map(async (conv: any) => {
          const otherUserId = conv.participant_one === userId ? conv.participant_two : conv.participant_one
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('id, display_name, profile_image_url, verification_status')
            .eq('id', otherUserId)
            .single()

          return {
            ...conv,
            other_user: otherUser,
          }
        })
      )

      setConversations(conversationsWithUsers)
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  function timeAgo(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'just now'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading messages...</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-600">Connect with community members</p>
        </div>

        {/* Conversations */}
        {conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.other_user?.id}`}
                className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
              >
                <div className="flex items-center gap-4">
                  {conversation.other_user?.profile_image_url ? (
                    <img
                      src={conversation.other_user.profile_image_url}
                      alt={conversation.other_user.display_name || 'User'}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center flex-shrink-0">
                      👤
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-slate-900">
                        {conversation.other_user?.display_name || 'Unknown User'}
                      </h3>
                      <span className="text-xs text-slate-500">{timeAgo(conversation.last_message_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 truncate">
                      {conversation.last_message_preview || 'No messages yet'}
                    </p>
                  </div>

                  {conversation.participant_info && conversation.participant_info[0]?.unread_count > 0 && (
                    <div className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                      {conversation.participant_info[0].unread_count}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <p className="text-slate-600 mb-4">No messages yet</p>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
              Visit the community directory to start connecting →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
