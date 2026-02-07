'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ForumCategory } from '@/lib/types/forum'
import { generateUniqueSlug } from '@/lib/utils/slugify'

export default function NewTopicPage() {
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
  })

  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const slug = params.slug as string

  useEffect(() => {
    checkAuth()
    loadCategory()
  }, [slug])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
  }

  async function loadCategory() {
    try {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        router.push('/forums')
        return
      }

      setCategory(data)
    } catch (error) {
      console.error('Error loading category:', error)
      router.push('/forums')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !category || !formData.title.trim() || !formData.content.trim()) return

    setSubmitting(true)
    try {
      // Generate unique slug for the topic
      const slug = await generateUniqueSlug(formData.title, category.id, supabase)

      // Create topic
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .insert({
          category_id: category.id,
          author_id: user.id,
          title: formData.title,
          slug: slug,
        })
        .select()
        .single()

      if (topicError) throw topicError

      // Create first post
      const { error: postError } = await supabase
        .from('forum_posts')
        .insert({
          topic_id: topicData.id,
          author_id: user.id,
          content: formData.content,
        })

      if (postError) throw postError

      // Note: DB triggers will handle updating reply_count, last_post_at, last_post_by

      router.push(`/forums/t/${topicData.id}`)
    } catch (error) {
      console.error('Error creating topic:', error)
      alert('Failed to create topic')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/forums/c/${category.slug}`} className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to {category.name}
          </Link>
          <h1 className="text-4xl font-bold text-slate-900">Start a New Discussion</h1>
          <p className="text-slate-600 mt-2">in {category.icon} {category.name}</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Discussion Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What's your discussion about?"
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">{formData.title.length}/200</p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Message *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Share your thoughts, experiences, or questions..."
                required
                rows={8}
                maxLength={5000}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">{formData.content.length}/5000</p>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
              <p className="text-sm text-blue-900 font-medium mb-2">Community Guidelines</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be respectful and compassionate</li>
                <li>• Share experiences, not medical advice</li>
                <li>• Avoid promotional content</li>
                <li>• Respect others' privacy</li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Discussion'}
              </button>
              <Link
                href={`/forums/c/${category.slug}`}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
