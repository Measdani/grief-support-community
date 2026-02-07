'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { MessageWithAuthor } from '@/lib/types/message'
export const dynamic = 'force-dynamic'

export default function ConversationPage() {
  const [messages, setMessages] = useState<MessageWithAuthor[]>([])
  const [otherUser, setOtherUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const recipientId = params.userId as string

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (currentUserId) {
      loadConversation()
      subscribeToMessages()
    }
  }, [currentUserId, recipientId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setCurrentUserId(user.id)
  }

  async function loadConversation() {
    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, display_name, profile_image_url, verification_status')
        .eq('id', recipientId)
        .single()

      setOtherUser(userData)

      const { data: convData, error: convError } = await supabase
        .rpc('get_or_create_conversation', {
          user_one: currentUserId,
          user_two: recipientId,
        })

      if (convError) throw convError

      const conversationId = convData

      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (messagesData) {
        setMessages(messagesData as any)
      }

      await supabase
        .from('conversation_participants')
        .update({ unread_count: 0, last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUserId)
    } catch (error) {
      console.error('Error loading conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!currentUserId || !newMessage.trim()) return

    setSending(true)
    try {
      const { data: convId } = await supabase
        .rpc('get_or_create_conversation', {
          user_one: currentUserId,
          user_two: recipientId,
        })

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: currentUserId,
          content: newMessage,
        })

      if (error) throw error

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        <p className="text-slate-600">Loading conversation...</p>
      </div>
    )
  }

  if (!otherUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">User not found</p>
      </div>
    )
  }

  const isOwnMessage = (senderId: string) => senderId === currentUserId
  const msgBg = (senderId: string) => isOwnMessage(senderId) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'
  const msgTime = (senderId: string) => isOwnMessage(senderId) ? 'text-blue-200' : 'text-slate-500'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/messages" className="text-sm text-blue-600 hover:text-blue-700">
              Back to Messages
            </Link>
            <div className="flex items-center gap-3">
              {otherUser.profile_image_url ? (
                <img
                  src={otherUser.profile_image_url}
                  alt={otherUser.display_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">👤</div>
              )}
              <div>
                <Link
                  href={`/profiles/${otherUser.id}`}
                  className="font-bold text-slate-900 hover:text-blue-600"
                >
                  {otherUser.display_name}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 p-6 overflow-y-auto mb-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex ${isOwnMessage(message.sender_id) ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-4 py-3 rounded-lg ${msgBg(message.sender_id)}`}>
                  <p className="break-words whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 ${msgTime(message.sender_id)}`}>
                    {timeAgo(message.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
