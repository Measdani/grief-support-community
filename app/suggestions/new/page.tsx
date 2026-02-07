'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SuggestionCategory } from '@/lib/types/suggestion'
export const dynamic = 'force-dynamic'

const CATEGORIES: { value: SuggestionCategory; label: string }[] = [
  { value: 'memorials', label: 'Memorials' },
  { value: 'forums', label: 'Forums' },
  { value: 'meetups', label: 'Meetups' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'resources', label: 'Resources' },
  { value: 'store', label: 'Memorial Store' },
  { value: 'general', label: 'General' },
  { value: 'other', label: 'Other' }
]

export default function NewSuggestionPage() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general' as SuggestionCategory
  })

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to submit suggestions')
        router.push('/auth/login')
        return
      }

      const { error } = await supabase
        .from('feature_suggestions')
        .insert({
          submitted_by: user.id,
          title: formData.title.trim(),
          description: formData.description.trim(),
          category: formData.category
        })

      if (error) throw error

      alert('Thank you for your suggestion!')
      router.push('/suggestions')
    } catch (error) {
      console.error('Error submitting suggestion:', error)
      alert('Failed to submit suggestion. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/suggestions"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Suggestions
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="mb-6">
            <div className="text-4xl mb-3">💡</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Suggest a Feature</h1>
            <p className="text-slate-600">
              Have an idea to improve our platform? We'd love to hear it!
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Brief summary of your suggestion"
                maxLength={200}
              />
              <p className="mt-1 text-xs text-slate-500">
                {formData.title.length}/200 characters
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as SuggestionCategory })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="Describe your feature idea in detail. What problem does it solve? How would it work?"
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-slate-500">
                {formData.description.length}/2000 characters
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Tips for great suggestions:
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Be specific about what you want</li>
                <li>Explain why this feature would be helpful</li>
                <li>Describe how it might work</li>
                <li>Keep it focused on one feature per suggestion</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Suggestion'}
              </button>
              <Link
                href="/suggestions"
                className="flex-1 text-center bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition font-medium"
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
