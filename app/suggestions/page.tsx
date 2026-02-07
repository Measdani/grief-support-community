'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { FeatureSuggestionWithSubmitter, SuggestionStatus, SUGGESTION_STATUS_LABELS, SUGGESTION_STATUS_COLORS } from '@/lib/types/suggestion'

export const dynamic = 'force-dynamic'

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<FeatureSuggestionWithSubmitter[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | SuggestionStatus>('all')
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const loadUserUpvotes = useCallback(async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('suggestion_upvotes')
      .select('suggestion_id')
      .eq('user_id', userId)

    if (data) {
      setUserUpvotes(new Set(data.map(u => u.suggestion_id)))
    }
  }, [])

  const loadCurrentUser = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      await loadUserUpvotes(user.id)
    }
  }, [loadUserUpvotes])

  const loadSuggestions = useCallback(async () => {
    try {
      const supabase = createClient()
      let query = supabase
        .from('feature_suggestions')
        .select(`
          *,
          submitter:profiles!feature_suggestions_submitted_by_fkey(display_name, email)
        `)
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query

      if (error) throw error
      setSuggestions(data || [])
    } catch (error) {
      console.error('Error loading suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    loadSuggestions()
    loadCurrentUser()
  }, [loadSuggestions, loadCurrentUser])

  async function handleUpvote(suggestionId: string) {
    if (!currentUserId) {
      alert('Please log in to upvote')
      return
    }

    const hasUpvoted = userUpvotes.has(suggestionId)

    try {
      const supabase = createClient()
      if (hasUpvoted) {
        // Remove upvote
        await supabase
          .from('suggestion_upvotes')
          .delete()
          .eq('suggestion_id', suggestionId)
          .eq('user_id', currentUserId)

        setUserUpvotes(prev => {
          const next = new Set(prev)
          next.delete(suggestionId)
          return next
        })
      } else {
        // Add upvote
        await supabase
          .from('suggestion_upvotes')
          .insert({
            suggestion_id: suggestionId,
            user_id: currentUserId
          })

        setUserUpvotes(prev => new Set(prev).add(suggestionId))
      }

      loadSuggestions() // Refresh to update counts
    } catch (error) {
      console.error('Error voting:', error)
      alert('Failed to record vote')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">
          ← Back to Dashboard
        </Link>
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Feature Suggestions</h1>
              <p className="mt-2 text-slate-600">
                Help us improve by suggesting new features and enhancements
              </p>
            </div>
            <Link
              href="/suggestions/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Suggest Feature
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {(['submitted', 'under_review', 'planned', 'in_progress', 'completed'] as SuggestionStatus[]).map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {SUGGESTION_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* Suggestions List */}
        {loading ? (
          <p className="text-center text-slate-600">Loading suggestions...</p>
        ) : suggestions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-4">💡</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Suggestions Yet</h3>
            <p className="text-slate-600 mb-6">Be the first to suggest a new feature!</p>
            <Link
              href="/suggestions/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Suggest a Feature
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
              >
                <div className="flex gap-4">
                  {/* Upvote Button */}
                  <button
                    onClick={() => handleUpvote(suggestion.id)}
                    disabled={!currentUserId}
                    className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition ${
                      userUpvotes.has(suggestion.id)
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-slate-300 hover:border-blue-300 text-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="text-xl">▲</span>
                    <span className="text-sm font-bold">{suggestion.upvote_count}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{suggestion.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        SUGGESTION_STATUS_COLORS[suggestion.status]
                      }`}>
                        {SUGGESTION_STATUS_LABELS[suggestion.status]}
                      </span>
                    </div>

                    <p className="text-slate-700 mb-3">{suggestion.description}</p>

                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span>
                        By {suggestion.submitter?.display_name || suggestion.submitter?.email || 'Anonymous'}
                      </span>
                      <span>•</span>
                      <span>{new Date(suggestion.created_at).toLocaleDateString()}</span>
                      {suggestion.category && (
                        <>
                          <span>•</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                            {suggestion.category}
                          </span>
                        </>
                      )}
                    </div>

                    {suggestion.admin_notes && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">Admin Note:</p>
                        <p className="text-sm text-blue-800">{suggestion.admin_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
