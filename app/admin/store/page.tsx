'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StoreProduct, ProductType, ProductStatus } from '@/lib/types/store'
import { ImageUpload } from '@/components/ImageUpload'
import { uploadProductAsset } from '@/lib/utils/file-upload'


export const dynamic = 'force-dynamic'

const PRODUCT_TYPES: ProductType[] = ['icon', 'image', 'card', 'keepsake']
const PRODUCT_STATUSES: ProductStatus[] = ['active', 'draft', 'archived']

export default function AdminStorePage() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [previewImageFile, setPreviewImageFile] = useState<File | null>(null)
  const [digitalAssetFile, setDigitalAssetFile] = useState<File | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_type: 'card' as ProductType,
    price_cents: 0,
    tags: [] as string[],
    display_order: 0,
    status: 'draft' as ProductStatus,
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
      await loadProducts()
    } catch (error) {
      console.error('Error checking admin:', error)
      router.push('/auth/login')
    }
  }

  async function loadProducts() {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('store_products')
        .select('*')
        .order('display_order', { ascending: true })
      setProducts(data || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      product_type: 'card',
      price_cents: 0,
      tags: [],
      display_order: 0,
      status: 'draft',
    })
    setPreviewImageFile(null)
    setDigitalAssetFile(null)
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(product: StoreProduct) {
    setFormData({
      name: product.name,
      description: product.description,
      product_type: product.product_type,
      price_cents: product.price_cents,
      tags: product.tags || [],
      display_order: product.display_order,
      status: product.status,
    })
    setPreviewImageFile(null)
    setDigitalAssetFile(null)
    setEditingId(product.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    const supabase = createClient()
    e.preventDefault()
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Name and description are required')
      return
    }

    if (formData.price_cents <= 0) {
      alert('Price must be greater than 0')
      return
    }

    // For new products, require preview image
    if (!editingId && !previewImageFile) {
      alert('Preview image is required for new products')
      return
    }

    setSubmitting(true)
    setUploadingFiles(!!previewImageFile || !!digitalAssetFile)

    try {
      let productId = editingId
      let previewImageUrl: string | null = null
      let digitalAssetPath: string | null = null

      // If creating new product, upload files first, then create product
      if (!editingId) {
        // Generate a temporary ID for file storage (will match product ID)
        const tempId = crypto.randomUUID()

        // Upload preview image (required)
        const previewResult = await uploadProductAsset(previewImageFile!, tempId, 'preview')
        if (!previewResult.success) {
          throw new Error(`Preview image upload failed: ${previewResult.error}`)
        }
        previewImageUrl = previewResult.url!

        // Upload digital asset if provided
        if (digitalAssetFile) {
          const digitalResult = await uploadProductAsset(digitalAssetFile, tempId, 'digital')
          if (!digitalResult.success) {
            console.warn(`Digital asset upload failed: ${digitalResult.error}`)
          } else {
            digitalAssetPath = digitalResult.url!
          }
        }

        // Now create product with URLs and the same ID
        const { data, error } = await supabase
          .from('store_products')
          .insert([{
            id: tempId,
            name: formData.name,
            description: formData.description,
            product_type: formData.product_type,
            price_cents: formData.price_cents,
            tags: formData.tags.length > 0 ? formData.tags : null,
            display_order: formData.display_order,
            status: formData.status,
            preview_image_url: previewImageUrl || '',
            digital_asset_path: digitalAssetPath || ''
          }])
          .select()
          .single()

        if (error) throw error
        if (!data) throw new Error('Failed to create product')
        productId = data.id
      } else {
        // For editing, update basic fields
        const dataToSubmit = {
          name: formData.name,
          description: formData.description,
          product_type: formData.product_type,
          price_cents: formData.price_cents,
          tags: formData.tags.length > 0 ? formData.tags : null,
          display_order: formData.display_order,
          status: formData.status,
        }

        const { error } = await supabase
          .from('store_products')
          .update(dataToSubmit)
          .eq('id', editingId)

        if (error) throw error

        // Upload new files if provided
        if (previewImageFile) {
          const uploadResult = await uploadProductAsset(previewImageFile, productId!, 'preview')
          if (uploadResult.success) {
            previewImageUrl = uploadResult.url!
          } else {
            console.error('Preview image upload failed:', uploadResult.error)
          }
        }

        if (digitalAssetFile) {
          const uploadResult = await uploadProductAsset(digitalAssetFile, productId!, 'digital')
          if (uploadResult.success) {
            digitalAssetPath = uploadResult.url!
          } else {
            console.error('Digital asset upload failed:', uploadResult.error)
          }
        }

        // Update product with new file URLs if any were uploaded
        if (previewImageUrl || digitalAssetPath) {
          const updateObj: any = {}
          if (previewImageUrl) updateObj.preview_image_url = previewImageUrl
          if (digitalAssetPath) updateObj.digital_asset_path = digitalAssetPath

          const { error: updateError } = await supabase
            .from('store_products')
            .update(updateObj)
            .eq('id', productId)

          if (updateError) throw updateError
        }
      }

      // Reload products to get updated data
      await loadProducts()
      resetForm()
    } catch (error) {
      console.error('Error saving product:', error)
      alert(`Failed to save product: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSubmitting(false)
      setUploadingFiles(false)
    }
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', id)

      if (error) throw error
      setProducts(products.filter(p => p.id !== id))
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  function addTag(tag: string) {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }))
    }
  }

  function removeTag(index: number) {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
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
        <p className="text-slate-600">Loading products...</p>
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Memorial Store Management</h1>
          <p className="text-slate-600">Manage digital products for memorial pages</p>
        </div>

        {!showForm && (
          <div className="mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              + Add New Product
            </button>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingId ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Memorial Photo Frame"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Type *</label>
                  <select
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value as ProductType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRODUCT_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
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
                  placeholder="Describe what this product is..."
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Price (USD) *</label>
                  <div className="flex items-center">
                    <span className="mr-2 text-slate-600">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.price_cents / 100}
                      onChange={(e) => {
                      const price = parseFloat(e.target.value)
                      // toFixed(2) normalizes the decimal first to avoid floating point errors
                      const cents = Math.round(parseFloat(price.toFixed(2)) * 100)
                      setFormData({ ...formData, price_cents: cents })
                    }}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
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

              <div className="space-y-6">
                <ImageUpload
                  label="Preview Image"
                  helpText="Image that shows when browsing the store"
                  onFileSelect={setPreviewImageFile}
                  maxSizeMB={5}
                  previewSize="small"
                />

                <ImageUpload
                  label="Digital Asset / Product File"
                  helpText="The image or file customers will receive after purchase"
                  onFileSelect={setDigitalAssetFile}
                  maxSizeMB={5}
                  previewSize="small"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    id="tagInput"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Type tag and press Add..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.currentTarget as HTMLInputElement
                        addTag(input.value)
                        input.value = ''
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('tagInput') as HTMLInputElement
                      addTag(input.value)
                      input.value = ''
                    }}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, i) => (
                    <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        className="hover:text-blue-900 font-bold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProductStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {PRODUCT_STATUSES.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={submitting || uploadingFiles}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {uploadingFiles ? 'Uploading Files...' : submitting ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
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

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-slate-900">Price</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-900">Status</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-900">Purchases</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">{product.name}</td>
                    <td className="py-3 px-4 text-slate-600">{product.product_type}</td>
                    <td className="py-3 px-4 text-right text-slate-900">${(product.price_cents / 100).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.status === 'active' ? 'bg-green-100 text-green-800' :
                        product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{product.purchase_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(product)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium"
                        >
                          Delete
                        </button>

                        {deleteConfirm === product.id && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                              <h3 className="font-bold text-slate-900 mb-2">Delete Product?</h3>
                              <p className="text-sm text-slate-600 mb-4">
                                "{product.name}" will be permanently deleted.
                              </p>
                              <div className="flex gap-3">
                                <button
                                  onClick={() => handleDelete(product.id)}
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

          {products.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-slate-600">No products yet. Create your first one!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
