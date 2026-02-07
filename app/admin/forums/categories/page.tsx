'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ForumCategory } from '@/lib/types/forum'

export const dynamic = 'force-dynamic'

export default function ForumCategoriesPage() {
  const [categories, setCategories] = useState<ForumCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '',
    display_order: 0,
    is_active: true,
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
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
      await loadCategories()
    } catch (err) {
      console.error('Error checking admin:', err)
      router.push('/auth/login')
    }
  }

  async function loadCategories() {
    const supabase = createClient()
    try {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true })

      if (err) throw err
      setCategories(data || [])
      setError(null)
    } catch (err) {
      console.error('Error loading categories:', err)
      setError('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50)
  }

  function resetForm() {
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '',
      color: '',
      display_order: 0,
      is_active: true,
    })
    setEditingId(null)
    setShowForm(false)
    setError(null)
  }

  function startEdit(category: ForumCategory) {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '',
      display_order: category.display_order,
      is_active: category.is_active,
    })
    setEditingId(category.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()

    if (!formData.name.trim()) {
      setError('Category name is required')
      return
    }

    setSubmitting(true)
    try {
      const slug = formData.slug || generateSlug(formData.name)

      // Check for duplicate slug (excluding current category if editing)
      const { data: existing } = await supabase
        .from('forum_categories')
        .select('id')
        .eq('slug', slug)
        .neq('id', editingId || '')
        .single()

      if (existing) {
        setError('A category with this slug already exists')
        setSubmitting(false)
        return
      }

      const dataToSubmit = {
        name: formData.name,
        slug,
        description: formData.description || null,
        icon: formData.icon || null,
        color: formData.color || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      }

      if (editingId) {
        const { error: err } = await supabase
          .from('forum_categories')
          .update(dataToSubmit)
          .eq('id', editingId)

        if (err) throw err
        setCategories(categories.map(c => c.id === editingId ? { ...c, ...dataToSubmit } as ForumCategory : c))
      } else {
        const { data, error: err } = await supabase
          .from('forum_categories')
          .insert([dataToSubmit])
          .select()
          .single()

        if (err) throw err
        if (data) setCategories([...categories, data])
      }

      resetForm()
    } catch (err) {
      console.error('Error saving category:', err)
      setError('Failed to save category')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteCategory(id: string) {
    const supabase = createClient()
    try {
      const { error: err } = await supabase
        .from('forum_categories')
        .delete()
        .eq('id', id)

      if (err) throw err
      setCategories(categories.filter(c => c.id !== id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting category:', err)
      setError('Failed to delete category')
    }
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const supabase = createClient()
    const index = categories.findIndex(c => c.id === id)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === categories.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const newCategories: ForumCategory[] = [...categories]
    const temp = newCategories[index]
    newCategories[index] = newCategories[newIndex]
    newCategories[newIndex] = temp

    // Update order in database
    try {
      await Promise.all([
        supabase
          .from('forum_categories')
          .update({ display_order: newIndex })
          .eq('id', newCategories[newIndex].id),
        supabase
          .from('forum_categories')
          .update({ display_order: index })
          .eq('id', newCategories[index].id),
      ])

      setCategories(newCategories)
    } catch (err) {
      console.error('Error reordering categories:', err)
      setError('Failed to reorder categories')
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
          <Link href="/admin/forums" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            ← Back to Forum Moderation
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Forum Categories</h1>
          <p className="text-slate-600">Create, edit, and manage forum discussion categories</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Add Category Button */}
        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Add New Category
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingId ? 'Edit Category' : 'Add New Category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setFormData({ ...formData, name, slug: generateSlug(name) })
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., Grief Support"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Auto-generated from name"

                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="What is this category about?"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Icon (emoji)</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    maxLength={10}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-2xl"
                    placeholder="💬"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Color (hex)</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#3B82F6"
                  />
                </div>

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

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Active (visible to users)</span>
              </label>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
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

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <p className="text-slate-600">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-slate-600">No categories yet. Create your first one!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Slug</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Topics</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Posts</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-900">Active</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {category.icon && <span className="text-lg">{category.icon}</span>}
                          <span className="font-medium text-slate-900">{category.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{category.slug}</td>
                      <td className="py-3 px-4 text-center">{category.topic_count}</td>
                      <td className="py-3 px-4 text-center">{category.post_count}</td>
                      <td className="py-3 px-4 text-center">
                        {category.is_active ? (
                          <span className="text-green-600 font-medium">✓</span>
                        ) : (
                          <span className="text-slate-400">✗</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveCategory(category.id, 'up')}
                            disabled={categories[0]?.id === category.id}
                            className="text-slate-600 hover:text-slate-900 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveCategory(category.id, 'down')}
                            disabled={categories[categories.length - 1]?.id === category.id}
                            className="text-slate-600 hover:text-slate-900 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => startEdit(category)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(category.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-medium"
                          >
                            Delete
                          </button>

                          {/* Delete Confirmation Modal */}
                          {deleteConfirm === category.id && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                                <h3 className="font-bold text-slate-900 mb-2">Delete Category?</h3>
                                <p className="text-sm text-slate-600 mb-4">
                                  "{category.name}" will be permanently deleted. This will not affect existing topics.
                                </p>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => deleteCategory(category.id)}
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

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-medium">Tip:</span> Use the up/down arrows to reorder categories. Inactive categories are hidden from users but their topics remain intact.
          </p>
        </div>
      </div>
    </div>
  )
}
