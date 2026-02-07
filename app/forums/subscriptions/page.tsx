'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ForumCategory } from '@/lib/types/forum'

interface SubscribedTopic {
  id: string
  title: string
  slug: string
  category_id: string
  category?: ForumCategory
  author_id: string
  author?: { display_name: string | null }
  reply_count: number
  view_count: number
  is_locked: boolean
  created_at: string
  last_post_at: string
}

export default function SubscriptionsPage() {
  const [topics, setTopics] = useState<SubscribedTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [unsubscribeConfirm, setUnsubscribeConfirm] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    checkUserAndLoad()
  }, [])

  async function checkUserAndLoad() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      await loadSubscriptions(user.id)
    } catch (error) {
      console.error('Error checking user:', error)
    }
  }

  async function loadSubscriptions(userId: string) {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('forum_subscriptions')
        .select(`
          topic_id,
          forum_topics!inner(
            id,
            title,
            slug,
            category_id,
            author_id,
            reply_count,
            view_count,
            is_locked,
            created_at,
            last_post_at,
            category:forum_categories(id, name, slug, icon),
            author:profiles(display_name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Flatten the response - Supabase returns nested relations as arrays, convert to single objects
      const flattenedTopics = (data || []).map((sub: any) => {
        const topic = Array.isArray(sub.forum_topics) ? sub.forum_topics[0] : sub.forum_topics
        return {
          ...topic,
          category: Array.isArray(topic.category) ? topic.category[0] : topic.category,
          author: Array.isArray(topic.author) ? topic.author[0] : topic.author,
        } as SubscribedTopic
      })

      setTopics(flattenedTopics)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsubscribe(topicId: string) {
    try {
      const { error } = await supabase
        .from('forum_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('topic_id', topicId)

      if (error) throw error

      setTopics(topics.filter(t => t.id !== topicId))
      setUnsubscribeConfirm(null)
    } catch (error) {
      console.error('Error unsubscribing:', error)
      alert('Failed to unsubscribe')
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/forums" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Forums
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Subscribed Discussions</h1>
          <p className="text-slate-600">Topics you're following for new replies</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Loading your subscriptions...</p>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600 mb-4">You haven't subscribed to any discussions yet</p>
            <Link href="/forums" className="text-blue-600 hover:text-blue-700 font-medium">
              Browse forums →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {topics.map((topic) => (
              <div key={topic.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {topic.category && (
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {topic.category.icon} {topic.category.name}
                        </span>
                      )}
                      {topic.is_locked && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🔒 Locked</span>
                      )}
                    </div>
                    <Link
                      href={`/forums/t/${topic.id}`}
                      className="text-lg font-bold text-slate-900 hover:text-blue-600 break-words block mb-2"
                    >
                      {topic.title}
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                      <span>By {topic.author?.display_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{topic.reply_count} replies</span>
                      <span>•</span>
                      <span>{topic.view_count} views</span>
                      <span>•</span>
                      <span>Last reply {timeAgo(topic.last_post_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setUnsubscribeConfirm(topic.id)}
                    className="text-slate-500 hover:text-red-600 transition text-sm whitespace-nowrap px-2 py-1"
                  >
                    ✕ Unsubscribe
                  </button>

                  {/* Unsubscribe Confirmation */}
                  {unsubscribeConfirm === topic.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="font-bold text-slate-900 mb-2">Unsubscribe?</h3>
                        <p className="text-sm text-slate-600 mb-4">
                          You won't receive notifications for new replies to "{topic.title}". You can subscribe again anytime.
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleUnsubscribe(topic.id)}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                          >
                            Unsubscribe
                          </button>
                          <button
                            onClick={() => setUnsubscribeConfirm(null)}
                            className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                          >
                            Keep Subscribed
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
