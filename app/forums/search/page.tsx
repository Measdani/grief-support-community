'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ForumCategory } from '@/lib/types/forum'

interface SearchResult {
  id: string
  title: string
  category_id: string
  category?: {
    id: string
    name: string
    slug: string
    icon: string | null
  }
  author_id: string
  author?: { display_name: string | null }
  reply_count: number
  view_count: number
  is_locked: boolean
  is_pinned: boolean
  is_announcement: boolean
  created_at: string
  last_post_at: string
}

type SortOption = 'relevance' | 'latest' | 'replies' | 'views'

export default function ForumSearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('latest')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<ForumCategory[]>([])

  const supabaseRef = useRef<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    supabaseRef.current = createClient()
    const q = searchParams.get('q') || ''
    setSearchTerm(q)
    loadCategories()
    if (q.trim()) {
      performSearch(q)
    }
  }, [])

  useEffect(() => {
    if (searchTerm.trim()) {
      performSearch(searchTerm)
    } else {
      setResults([])
    }
  }, [sortBy, selectedCategory])

  async function loadCategories() {
    try {
      const { data } = await supabaseRef.current
        .from('forum_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setCategories(data || [])
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  async function performSearch(query: string) {
    if (!query.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      let dbQuery = supabaseRef.current
        .from('forum_topics')
        .select(`
          id,
          title,
          category_id,
          author_id,
          reply_count,
          view_count,
          is_locked,
          is_pinned,
          is_announcement,
          created_at,
          last_post_at,
          category:forum_categories(id, name, slug, icon),
          author:profiles(display_name)
        `)
        .ilike('title', `%${query}%`)

      if (selectedCategory !== 'all') {
        dbQuery = dbQuery.eq('category_id', selectedCategory)
      }

      const { data, error } = await dbQuery

      if (error) throw error

      // Normalize data - Supabase returns relations as arrays, convert to single objects
      const normalized = (data || []).map((item: any) => ({
        ...item,
        category: Array.isArray(item.category) ? item.category[0] : item.category,
        author: Array.isArray(item.author) ? item.author[0] : item.author,
      }))

      // Sort results
      let sorted = normalized as SearchResult[]

      switch (sortBy) {
        case 'latest':
          sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          break
        case 'replies':
          sorted.sort((a, b) => b.reply_count - a.reply_count)
          break
        case 'views':
          sorted.sort((a, b) => b.view_count - a.view_count)
          break
        case 'relevance':
        default:
          // Relevance: prioritize pinned, then by last activity
          sorted.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) {
              return a.is_pinned ? -1 : 1
            }
            return new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime()
          })
      }

      setResults(sorted)
    } catch (error) {
      console.error('Error searching:', error)
      setResults([])
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchTerm)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/forums" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Forums
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Forum Search</h1>
          <p className="text-slate-600">Find discussions and topics</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search discussions..."
                className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
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

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="relevance">Relevance</option>
                  <option value="latest">Latest Activity</option>
                  <option value="newest">Newest Topics</option>
                  <option value="replies">Most Replies</option>
                  <option value="views">Most Views</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Search
            </button>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Searching...</p>
          </div>
        ) : searchTerm.trim() ? (
          results.length > 0 ? (
            <div>
              <p className="text-sm text-slate-600 mb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchTerm}"
              </p>
              <div className="space-y-4">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/forums/t/${result.id}`}
                    className="block bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md hover:border-blue-200 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          {result.category && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {result.category.icon} {result.category.name}
                            </span>
                          )}
                          {result.is_pinned && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">📌 Pinned</span>}
                          {result.is_announcement && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">📢 Announcement</span>}
                          {result.is_locked && <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🔒 Locked</span>}
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">{result.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                          <span>By {result.author?.display_name || 'Anonymous'}</span>
                          <span>•</span>
                          <span>{result.reply_count} replies</span>
                          <span>•</span>
                          <span>{result.view_count} views</span>
                          <span>•</span>
                          <span>{timeAgo(result.last_post_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-slate-600 mb-4">No topics found matching "{searchTerm}"</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setResults([])
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear search
              </button>
            </div>
          )
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-600">Enter a search term to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
