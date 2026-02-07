'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ForumCategory, ForumTopicWithAuthor } from '@/lib/types/forum'
export const dynamic = 'force-dynamic'

export default function ForumCategoryPage() {
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [topics, setTopics] = useState<ForumTopicWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'latest' | 'replies' | 'views' | 'newest'>('latest')
  const [filterPinned, setFilterPinned] = useState(false)
  const [filterLocked, setFilterLocked] = useState(false)
  const [filterAnnouncements, setFilterAnnouncements] = useState(false)

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const slug = params.slug as string

  useEffect(() => {
    checkUser()
    loadCategoryAndTopics()
  }, [slug])

  useEffect(() => {
    // Re-render when filters change (handled by computed topics)
  }, [searchTerm, sortBy, filterPinned, filterLocked, filterAnnouncements])

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadCategoryAndTopics() {
    try {
      // Load category
      const { data: categoryData, error: catError } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (catError || !categoryData) {
        router.push('/forums')
        return
      }

      setCategory(categoryData)

      // Load topics in category
      const { data: topicsData } = await supabase
        .from('forum_topics')
        .select(`
          *,
          author:profiles!forum_topics_author_id_fkey(id, display_name, avatar_url, verification_status),
          last_post_author:profiles!forum_topics_last_post_by_fkey(display_name)
        `)
        .eq('category_id', categoryData.id)
        .order('is_pinned', { ascending: false })
        .order('last_post_at', { ascending: false })

      if (topicsData) {
        setTopics(topicsData as any)
      }
    } catch (error) {
      console.error('Error loading category:', error)
      router.push('/forums')
    } finally {
      setLoading(false)
    }
  }

  function getFilteredAndSortedTopics() {
    let filtered = topics.filter(topic => {
      // Search filter
      if (searchTerm && !topic.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Status filters
      if (filterPinned && !topic.is_pinned) return false
      if (filterLocked && !topic.is_locked) return false
      if (filterAnnouncements && !topic.is_announcement) return false

      return true
    })

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'replies':
          return b.reply_count - a.reply_count
        case 'views':
          return b.view_count - a.view_count
        case 'latest':
        default:
          return new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime()
      }
    })

    return sorted
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

  const filteredTopics = getFilteredAndSortedTopics()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading category...</p>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Category not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/forums" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Forums
          </Link>
          <div className="flex items-center gap-4 mb-2">
            <span className="text-4xl">{category.icon || '💬'}</span>
            <h1 className="text-4xl font-bold text-slate-900">{category.name}</h1>
          </div>
          <p className="text-slate-600">{category.description}</p>
        </div>

        {/* New Topic Button */}
        {user && (
          <div className="mb-6">
            <Link
              href={`/forums/c/${category.slug}/new`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + New Topic
            </Link>
          </div>
        )}

        {/* Search & Filters */}
        {topics.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Search topics</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Sort & Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="latest">Latest Activity</option>
                    <option value="newest">Newest Topics</option>
                    <option value="replies">Most Replies</option>
                    <option value="views">Most Views</option>
                  </select>
                </div>

                {/* Status Filters */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Filter by status</label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterPinned}
                        onChange={(e) => setFilterPinned(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">📌 Pinned</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterAnnouncements}
                        onChange={(e) => setFilterAnnouncements(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">📢 Announcements</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filterLocked}
                        onChange={(e) => setFilterLocked(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-700">🔒 Locked</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics List */}
        {topics.length > 0 ? (
          filteredTopics.length > 0 ? (
            <div className="space-y-3">
              {filteredTopics.map((topic) => (
              <Link
                key={topic.id}
                href={`/forums/t/${topic.id}`}
                className="block bg-white rounded-lg shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-200 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {topic.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">📌 Pinned</span>}
                      {topic.is_announcement && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">📢 Announcement</span>}
                      {topic.is_locked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🔒 Locked</span>}
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2 truncate">{topic.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{topic.author?.display_name}</span>
                      <span>•</span>
                      <span>{topic.reply_count} replies</span>
                      <span>•</span>
                      <span>{topic.view_count} views</span>
                      <span>•</span>
                      <span>{timeAgo(topic.last_post_at)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-600 mb-4">No topics match your filters</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSortBy('latest')
                  setFilterPinned(false)
                  setFilterLocked(false)
                  setFilterAnnouncements(false)
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600 mb-4">No topics yet in this category</p>
            {user && (
              <Link
                href={`/forums/c/${category.slug}/new`}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Be the first to start a discussion →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
