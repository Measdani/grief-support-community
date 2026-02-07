'use client'

import { useState } from 'react'
import { ResourceType, ResourceCategory, resourceTypeLabels, resourceTypeIcons, resourceCategoryLabels } from '@/lib/types/resource'

interface SubmitResourceFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export default function SubmitResourceForm({ onSuccess, onCancel }: SubmitResourceFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'article' as ResourceType,
    categories: [] as ResourceCategory[],
    external_url: '',
    phone_number: '',
    author: '',
    source: '',
    submitter_name: '',
    submitter_email: '',
    submitter_notes: '',
  })

  function toggleCategory(category: ResourceCategory) {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim() || formData.categories.length === 0) {
      alert('Please fill in title, description, and select at least one category')
      return
    }

    if (!formData.submitter_name.trim() || !formData.submitter_email.trim()) {
      alert('Please provide your name and email')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/resources/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to submit')

      setSubmitted(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (error) {
      console.error('Error submitting resource:', error)
      alert('Failed to submit resource. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">Thank You!</h3>
        <p className="text-slate-600">
          Your resource submission has been received. We'll review it and add it to our resources if appropriate.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Resource Details Section */}
      <div>
        <h3 className="font-bold text-slate-900 mb-4">Resource Details</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Resource Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Understanding Grief - Mayo Clinic Guide"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Briefly describe this resource and why it's helpful..."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type *
              </label>
              <select
                value={formData.resource_type}
                onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as ResourceType })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(resourceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {resourceTypeIcons[key as ResourceType]} {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {formData.resource_type === 'hotline' ? 'Phone Number *' : 'Website URL *'}
              </label>
              {formData.resource_type === 'hotline' ? (
                <input
                  type="tel"
                  required={formData.resource_type === 'hotline'}
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1-800-000-0000"
                />
              ) : (
                <input
                  type="url"
                  required
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Author / Organization (Optional)
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Mayo Clinic"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Source / Publisher (Optional)
              </label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Medical Institution"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Categories * (select at least one)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
              {Object.entries(resourceCategoryLabels).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(key as ResourceCategory)}
                    onChange={() => toggleCategory(key as ResourceCategory)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Submitter Info Section */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="font-bold text-slate-900 mb-4">Your Information</h3>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                required
                value={formData.submitter_name}
                onChange={(e) => setFormData({ ...formData, submitter_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your Email *
              </label>
              <input
                type="email"
                required
                value={formData.submitter_email}
                onChange={(e) => setFormData({ ...formData, submitter_email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Why is this resource helpful? (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.submitter_notes}
              onChange={(e) => setFormData({ ...formData, submitter_notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tell us why you think this resource would benefit our community..."
            />
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-slate-600 italic">
        Submissions are reviewed periodically and may not receive a response.
      </p>

      {/* Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Resource'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
