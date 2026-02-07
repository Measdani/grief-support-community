'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ForumCategory, ForumTopicWithAuthor } from '@/lib/types/forum'
export const dynamic = 'force-dynamic'

export default function ForumsPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [recentTopics, setRecentTopics] = useState<ForumTopicWithAuthor[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, { topics: number; posts: number }>>({})
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadCategories()
    loadRecentTopics()
  }, [])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from('forum_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (!error && data) {
      setCategories(data)

      // Calculate actual counts for each category
      const counts: Record<string, { topics: number; posts: number }> = {}

      for (const category of data) {
        // Count topics in this category
        const { count: topicCount } = await supabase
          .from('forum_topics')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id)

        // Count posts in this category
        const { count: postCount } = await supabase
          .from('forum_posts')
          .select('id', { count: 'exact', head: true })
          .in('topic_id', (await supabase
            .from('forum_topics')
            .select('id')
            .eq('category_id', category.id)).data?.map((t: any) => t.id) || [])

        counts[category.id] = {
          topics: topicCount || 0,
          posts: postCount || 0
        }
      }

      setCategoryCounts(counts)
    }
    setLoading(false)
  }

  async function loadRecentTopics() {
    const { data, error } = await supabase
      .from('forum_topics')
      .select(`
        *,
        author:profiles!forum_topics_author_id_fkey(id, display_name, avatar_url, verification_status),
        category:forum_categories(name, slug, icon)
      `)
      .order('last_post_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      setRecentTopics(data as any)
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Community Forums</h1>
            <p className="text-slate-600">
              Connect with others, share your experiences, and find support
            </p>
          </div>
          {user && (
            <Link
              href="/forums/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              New Topic
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Categories */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Categories</h2>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600">Loading forums...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/forums/c/${category.slug}`}
                    className="block bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-blue-200 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{category.icon || '💬'}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 mb-1">{category.name}</h3>
                        <p className="text-sm text-slate-600 mb-2">{category.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>{categoryCounts[category.id]?.topics || 0} topics</span>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Recent Activity</h3>
              {recentTopics.length > 0 ? (
                <div className="space-y-3">
                  {recentTopics.map((topic: any) => (
                    <Link
                      key={topic.id}
                      href={`/forums/t/${topic.id}`}
                      className="block hover:bg-slate-50 -mx-2 px-2 py-2 rounded transition"
                    >
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {topic.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{topic.category?.icon} {topic.category?.name}</span>
                        <span>•</span>
                        <span>{timeAgo(topic.last_post_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No recent activity</p>
              )}
            </div>

            {/* Forum Guidelines */}
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
              <h3 className="font-bold text-blue-900 mb-2">Community Guidelines</h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• Be respectful and compassionate</li>
                <li>• Share your experiences, not advice</li>
                <li>• Protect your privacy and others'</li>
                <li>• Report inappropriate content</li>
              </ul>
            </div>

            {/* Need Immediate Help */}
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h3 className="font-bold text-red-900 mb-2">Need Immediate Help?</h3>
              <p className="text-sm text-red-800 mb-3">
                If you're in crisis, please reach out:
              </p>
              <a
                href="tel:988"
                className="block text-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
              >
                📞 Call 988
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
