'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
export const dynamic = 'force-dynamic'
  Resource,
  ResourceType,
  ResourceCategory,
  resourceTypeLabels,
  resourceTypeIcons,
  resourceCategoryLabels,
} from '@/lib/types/resource'

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    resource_type: 'article' as ResourceType,
    categories: [] as ResourceCategory[],
    external_url: '',
    phone_number: '',
    is_24_7: false,
    thumbnail_url: '',
    author: '',
    source: '',
    published_date: '',
    is_featured: false,
    is_published: true,
    display_order: 0,
  })

  const router = useRouter()

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

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
        router.push('/admin')
        return
      }

      setIsAdmin(true)
      await loadResources()
    } catch (error) {
      console.error('Error checking admin:', error)
      router.push('/auth/login')
    }
  }

  async function loadResources() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('resources')
        .select('*')
        .order('display_order', { ascending: true })
      setResources(data || [])
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      title: '',
      description: '',
      content: '',
      resource_type: 'article',
      categories: [],
      external_url: '',
      phone_number: '',
      is_24_7: false,
      thumbnail_url: '',
      author: '',
      source: '',
      published_date: '',
      is_featured: false,
      is_published: true,
      display_order: 0,
    })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(resource: Resource) {
    setFormData({
      title: resource.title,
      description: resource.description,
      content: resource.content || '',
      resource_type: resource.resource_type,
      categories: resource.categories,
      external_url: resource.external_url || '',
      phone_number: resource.phone_number || '',
      is_24_7: resource.is_24_7,
      thumbnail_url: resource.thumbnail_url || '',
      author: resource.author || '',
      source: resource.source || '',
      published_date: resource.published_date || '',
      is_featured: resource.is_featured,
      is_published: resource.is_published,
      display_order: resource.display_order,
    })
    setEditingId(resource.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Title and description are required')
      return
    }

    setSubmitting(true)
    try {
      const dataToSubmit = {
        title: formData.title,
        description: formData.description,
        content: formData.content || null,
        resource_type: formData.resource_type,
        categories: formData.categories,
        external_url: formData.external_url || null,
        phone_number: formData.phone_number || null,
        is_24_7: formData.is_24_7,
        thumbnail_url: formData.thumbnail_url || null,
        author: formData.author || null,
        source: formData.source || null,
        published_date: formData.published_date || null,
        is_featured: formData.is_featured,
        is_published: formData.is_published,
        display_order: formData.display_order,
      }

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('resources')
          .update(dataToSubmit)
          .eq('id', editingId)

        if (error) throw error
        setResources(resources.map(r => r.id === editingId ? { ...r, ...dataToSubmit } as Resource : r))
      } else {
        // Create new
        const { data, error } = await supabase
          .from('resources')
          .insert([dataToSubmit])
          .select()
          .single()

        if (error) throw error
        if (data) setResources([...resources, data])
      }

      resetForm()
    } catch (error) {
      console.error('Error saving resource:', error)
      alert('Failed to save resource')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)

      if (error) throw error
      setResources(resources.filter(r => r.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource')
    }
  }

  function toggleCategory(category: ResourceCategory) {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }))
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center py-12">
        <p className="text-slate-600">Checking admin access...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center py-12">
        <p className="text-slate-600">Loading resources...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Resource Management</h1>
          <p className="text-slate-600">Add, edit, and manage grief support resources</p>
        </div>

        {/* Add Resource Button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Add New Resource
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingId ? 'Edit Resource' : 'Add New Resource'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resource Type *</label>
                  <select
                    value={formData.resource_type}
                    onChange={(e) => setFormData({ ...formData, resource_type: e.target.value as ResourceType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(resourceTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {resourceTypeIcons[key as ResourceType]} {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Full article content (if internal resource)"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Categories *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

              {/* URLs & Contact */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">External URL</label>
                  <input
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1-800-000-0000"
                  />
                </div>
              </div>

              {/* Hotline specific */}
              {formData.resource_type === 'hotline' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_24_7}
                    onChange={(e) => setFormData({ ...formData, is_24_7: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Available 24/7</span>
                </label>
              )}

              {/* Metadata */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Published Date</label>
                  <input
                    type="date"
                    value={formData.published_date}
                    onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Thumbnail URL</label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Status & Display */}
              <div className="grid md:grid-cols-3 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Published</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700">Featured</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Resource' : 'Create Resource'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Resources List */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Type</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-900">Published</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-900">Featured</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(resource => (
                  <tr key={resource.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{resource.title}</td>
                    <td className="py-3 px-4 text-slate-600">{resourceTypeIcons[resource.resource_type]} {resourceTypeLabels[resource.resource_type]}</td>
                    <td className="py-3 px-4 text-center">
                      {resource.is_published ? '✓' : '✗'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {resource.is_featured ? '⭐' : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(resource)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(resource.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Delete
                        </button>

                        {/* Delete Confirmation */}
                        {deleteConfirm === resource.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                              <h3 className="font-bold text-slate-900 mb-2">Delete Resource?</h3>
                              <p className="text-sm text-slate-600 mb-4">
                                "{resource.title}" will be permanently deleted.
                              </p>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleDelete(resource.id)}
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

          {resources.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-600">No resources yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
