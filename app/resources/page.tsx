'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import SubmitResourceForm from './SubmitResourceForm'
import {
  Resource,
  ResourceType,
  ResourceCategory,
  resourceTypeLabels,
  resourceTypeIcons,
  resourceCategoryLabels,
} from '@/lib/types/resource'

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [featuredResources, setFeaturedResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState<ResourceType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadResources()
  }, [typeFilter, categoryFilter])

  async function loadResources() {
    const supabase = createClient()
    try {
      // Load featured resources (hotlines, crisis support)
      const { data: featured } = await supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('display_order', { ascending: true })

      setFeaturedResources(featured || [])

      // Load all resources with filters
      let query = supabase
        .from('resources')
        .select('*')
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('helpful_count', { ascending: false })

      if (typeFilter !== 'all') {
        query = query.eq('resource_type', typeFilter)
      }

      if (categoryFilter !== 'all') {
        query = query.contains('categories', [categoryFilter])
      }

      const { data, error } = await query

      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = resources.filter(resource => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      resource.title.toLowerCase().includes(query) ||
      resource.description.toLowerCase().includes(query)
    )
  })

  // Separate hotlines from other resources
  const hotlines = filteredResources.filter(r => r.resource_type === 'hotline')
  const otherResources = filteredResources.filter(r => r.resource_type !== 'hotline')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Grief Resources</h1>
          <p className="text-slate-600">
            Educational resources, support hotlines, and helpful information for your grief journey
          </p>
        </div>

        {/* Crisis Support Banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🆘</div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-red-900 mb-2">Need Immediate Support?</h2>
              <p className="text-red-800 mb-4">
                If you're in crisis or having thoughts of suicide, please reach out for help immediately.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="tel:988"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
                >
                  📞 Call 988
                </a>
                <a
                  href="sms:741741?body=HOME"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition font-medium"
                >
                  💬 Text HOME to 741741
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-black text-sm font-bold mb-8">
          If you believe you may be a danger to yourself or others, please seek immediate professional help.
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-4">About These Resources</h2>
          <div className="space-y-3 text-slate-700 text-sm">
            <p>
              The resources listed here are provided for educational and informational purposes only. Holding Space Together does not provide medical, psychological, or crisis intervention services.
            </p>
            <p>
              We share these tools to help you find support beyond this platform when you need it. Each organization operates independently, and Holding Space Together is not affiliated with or responsible for the services they provide.
            </p>
            <p>
              If you are experiencing a crisis or feel unsafe, please contact emergency services or one of the crisis support options above.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search resources..."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ResourceType | 'all')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="all">All Types</option>
                {Object.entries(resourceTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>{resourceTypeIcons[key as ResourceType]} {label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ResourceCategory | 'all')}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="all">All Categories</option>
                {Object.entries(resourceCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading resources...</p>
          </div>
        ) : (
          <>
            {/* Hotlines Section */}
            {(typeFilter === 'all' || typeFilter === 'hotline') && hotlines.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">📞 Support Hotlines</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {hotlines.map((hotline) => (
                    <div
                      key={hotline.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-slate-900">{hotline.title}</h3>
                        {hotline.is_24_7 && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                            24/7
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mb-4">{hotline.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {hotline.phone_number && (
                          <a
                            href={`tel:${hotline.phone_number.replace(/\D/g, '')}`}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                          >
                            📞 {hotline.phone_number}
                          </a>
                        )}
                        {hotline.external_url && (
                          <a
                            href={hotline.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                          >
                            🔗 Website
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Resources */}
            {otherResources.length > 0 ? (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">📚 Resources & Information</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition flex flex-col h-full"
                    >
                      {resource.thumbnail_url && (
                        <div className="relative w-full bg-slate-300 h-40 overflow-hidden flex-shrink-0">
                          <img
                            src={resource.thumbnail_url}
                            alt={resource.title}
                            className="w-full h-full object-cover"
                          />
                          {resource.resource_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black hover:bg-black/90 transition z-10">
                              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition">
                                <span className="text-3xl ml-1">▶</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{resourceTypeIcons[resource.resource_type]}</span>
                          <span className="text-xs text-slate-500 uppercase font-medium">
                            {resourceTypeLabels[resource.resource_type]}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-2">{resource.title}</h3>
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2 flex-1">
                          {resource.description}
                        </p>

                        {/* Categories */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {resource.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs"
                            >
                              {resourceCategoryLabels[cat]}
                            </span>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2">
                          {resource.external_url ? (
                            <a
                              href={resource.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              {resource.resource_type === 'video' ? 'Watch Video →' : 'View Resource →'}
                            </a>
                          ) : resource.content ? (
                            <Link
                              href={`/resources/${resource.id}`}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              Read More →
                            </Link>
                          ) : null}

                          {resource.helpful_count > 0 && (
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              👍 {resource.helpful_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="text-5xl mb-4">📚</div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">No Resources Found</h2>
                <p className="text-slate-600">
                  Try adjusting your filters or check back later for more resources.
                </p>
              </div>
            )}
          </>
        )}

        {/* Submit Resource Link */}
        <div className="mt-12 text-center pb-8">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Know a resource that could help others? Submit it for review.
          </button>
        </div>

        {/* Submit Resource Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
                <h2 className="text-2xl font-bold text-slate-900">Suggest a Resource</h2>
                <p className="text-sm text-slate-600 mt-1">
                  If you know of an organization or resource that supports people through grief, you may submit it for review. All submissions are carefully reviewed. Submission does not guarantee listing.
                </p>
              </div>

              <SubmitResourceForm
                onSuccess={() => setShowSubmitModal(false)}
                onCancel={() => setShowSubmitModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
