'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ForumCategory } from '@/lib/types/forum'
export const dynamic = 'force-dynamic'

interface Topic {
  id: string
  title: string
  category_id: string
  category?: ForumCategory
  author_id: string
  author?: { display_name: string | null }
  reply_count: number
  view_count: number
  is_pinned: boolean
  is_locked: boolean
  is_announcement: boolean
  created_at: string
  last_post_at: string
}

export default function ForumModerationPage() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoad()
  }, [selectedCategory, searchTerm])

  async function checkAdminAndLoad() {
    const supabase = createClient()
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
      await loadCategories()
      await loadTopics()
    } catch (err) {
      console.error('Error checking admin:', err)
      setError('Failed to verify admin access')
    }
  }

  async function loadCategories() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setCategories(data || [])
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  async function loadTopics() {
    const supabase = createClient()
    try {
      setLoading(true)

      let query = supabase
        .from('forum_topics')
        .select(`
          *,
          category:forum_categories(id, name, slug, icon),
          author:profiles(display_name)
        `)
        .order('created_at', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory)
      }

      if (searchTerm) {
        query = query.ilike('title', `%${searchTerm}%`)
      }

      const { data, error: err } = await query

      if (err) throw err
      setTopics((data || []) as Topic[])
    } catch (err) {
      console.error('Error loading topics:', err)
      setError('Failed to load topics')
    } finally {
      setLoading(false)
    }
  }

  async function updateTopic(id: string, updates: any) {
    const supabase = createClient()
    try {
      const { error: err } = await supabase
        .from('forum_topics')
        .update(updates)
        .eq('id', id)

      if (err) throw err

      setTopics(topics.map(t => t.id === id ? { ...t, ...updates } : t))
    } catch (err) {
      console.error('Error updating topic:', err)
      alert('Failed to update topic')
    }
  }

  async function deleteTopic(id: string) {
    const supabase = createClient()
    try {
      const { error: err } = await supabase
        .from('forum_topics')
        .delete()
        .eq('id', id)

      if (err) throw err

      setTopics(topics.filter(t => t.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting topic:', err)
      alert('Failed to delete topic')
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center py-12">
        <p className="text-slate-600">Checking admin access...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/dashboard/admin" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Forum Moderation</h1>
          <p className="text-slate-600">Manage topics, lock discussions, and moderate content</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Search by title</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search topics..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Filter by category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Topics Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <p className="text-slate-600">Loading topics...</p>
            </div>
          ) : topics.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-600">No topics found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Title</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Author</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Replies</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Views</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Pinned</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Locked</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Announcement</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((topic) => (
                    <tr key={topic.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-sm truncate">
                        {topic.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {topic.category?.icon} {topic.category?.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {topic.author?.display_name || 'Anonymous'}
                      </td>
                      <td className="py-3 px-4 text-center">{topic.reply_count}</td>
                      <td className="py-3 px-4 text-center">{topic.view_count}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={topic.is_pinned}
                          onChange={(e) => updateTopic(topic.id, { is_pinned: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={topic.is_locked}
                          onChange={(e) => updateTopic(topic.id, { is_locked: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={topic.is_announcement}
                          onChange={(e) => updateTopic(topic.id, { is_announcement: e.target.checked })}
                          className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-left">
                        <div className="flex gap-2">
                          <Link
                            href={`/forums/t/${topic.id}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(topic.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            Delete
                          </button>

                          {/* Delete Confirmation Modal */}
                          {deleteConfirm === topic.id && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                                <h3 className="font-bold text-slate-900 mb-2">Delete Topic?</h3>
                                <p className="text-sm text-slate-600 mb-4">
                                  "{topic.title}" will be permanently deleted along with all its posts.
                                </p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => deleteTopic(topic.id)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-medium">Tip:</span> Check the boxes to pin, lock, or mark topics as announcements. Use the Delete button for content that violates community guidelines.
          </p>
        </div>
      </div>
    </div>
  )
}
