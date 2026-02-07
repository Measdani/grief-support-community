'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useCart } from '@/lib/context/CartContext'
import { useRouter, useSearchParams } from 'next/navigation'
export const dynamic = 'force-dynamic'

interface Product {
  id: string
  name: string
  description: string
  product_type: string
  price_cents: number
  preview_image_url: string
  tags: string[] | null
}

interface Memorial {
  id: string
  first_name: string
  last_name: string
}

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedMemorial, setSelectedMemorial] = useState<string | null>(null)
  const [userMemorials, setUserMemorials] = useState<Memorial[]>([])
  const [user, setUser] = useState<any>(null)

  const { addItem, itemCount } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    checkUser()
    loadProducts()
    loadUserMemorials()

    // Check if memorial pre-selected via query param
    const memorialId = searchParams.get('memorial')
    if (memorialId) {
      setSelectedMemorial(memorialId)
    }
  }, [selectedType])

  async function checkUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  async function loadProducts() {
    try {
      const url = selectedType === 'all'
        ? '/api/store/products'
        : `/api/store/products?type=${selectedType}`

      const res = await fetch(url)
      const data = await res.json()
      setProducts(data.products || [])
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUserMemorials() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('memorials')
      .select('id, first_name, last_name')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    setUserMemorials(data || [])
  }

  async function handleAddToCart(product: Product) {
    if (!user) {
      alert('Please log in to make a purchase')
      router.push('/auth/login')
      return
    }

    if (!selectedMemorial) {
      alert('Please select a memorial first')
      return
    }

    const memorial = userMemorials.find(m => m.id === selectedMemorial)
    if (!memorial) {
      alert('Invalid memorial selection')
      return
    }

    addItem({
      productId: product.id,
      memorialId: selectedMemorial,
      memorialName: `${memorial.first_name} ${memorial.last_name}`,
      productName: product.name,
      productType: product.product_type,
      priceCents: product.price_cents,
      previewImageUrl: product.preview_image_url,
    })

    alert('Added to cart!')
  }

  const productTypeLabels: Record<string, string> = {
    all: 'All',
    icon: 'Icons',
    image: 'Images',
    card: 'Cards',
    keepsake: 'Keepsakes'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Memorial Store</h1>
          <p className="text-slate-600">
            Beautiful digital gifts to honor and remember loved ones
          </p>
        </div>

        {/* Memorial Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select a Memorial
          </label>
          <select
            value={selectedMemorial || ''}
            onChange={(e) => setSelectedMemorial(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-md"
          >
            <option value="">Choose memorial...</option>
            {userMemorials.map((memorial) => (
              <option key={memorial.id} value={memorial.id}>
                {memorial.first_name} {memorial.last_name}
              </option>
            ))}
          </select>
          {user && userMemorials.length === 0 && (
            <p className="text-sm text-slate-500 mt-2">
              You need to <Link href="/dashboard/memorials/create" className="text-blue-600 hover:underline">create a memorial</Link> first.
            </p>
          )}
          {!user && (
            <p className="text-sm text-slate-500 mt-2">
              Please <Link href="/auth/login" className="text-blue-600 hover:underline">log in</Link> to make purchases.
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {['all', 'icon', 'image', 'card', 'keepsake'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition whitespace-nowrap ${
                selectedType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {productTypeLabels[type]}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-600">No products available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 mb-20">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition">
                <img
                  src={product.preview_image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-slate-900">
                      ${(product.price_cents / 100).toFixed(2)}
                    </span>
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={!selectedMemorial || !user}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cart Link */}
        {itemCount > 0 && (
          <Link
            href="/store/cart"
            className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
          >
            <span>View Cart</span>
            <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
              {itemCount}
            </span>
          </Link>
        )}
      </div>
    </div>
  )
}
