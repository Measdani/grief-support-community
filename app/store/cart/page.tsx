'use client'

import { useCart } from '@/lib/context/CartContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'

export default function CartPage() {
  const { items, removeItem, updateMessage, clearCart, totalCents, itemCount } = useCart()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleCheckout() {
    if (itemCount === 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Checkout failed')
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout')
    } finally {
      setLoading(false)
    }
  }

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Your Cart is Empty</h1>
            <p className="text-slate-600 mb-6">
              Browse our memorial store to find beautiful digital gifts
            </p>
            <Link
              href="/store"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <Link href="/store" className="text-sm text-blue-600 hover:text-blue-700 mb-4 inline-block">
          ← Continue Shopping
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-6">Shopping Cart</h1>

        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <div key={`${item.productId}-${item.memorialId}`} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex gap-4">
                <img
                  src={item.previewImageUrl}
                  alt={item.productName}
                  className="w-24 h-24 rounded object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-slate-900">{item.productName}</h3>
                  <p className="text-sm text-slate-600">For: {item.memorialName}</p>
                  <p className="text-sm text-slate-500 capitalize">{item.productType}</p>
                  <p className="text-lg font-bold text-slate-900 mt-2">
                    ${(item.priceCents / 100).toFixed(2)}
                  </p>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Dedication Message (Optional)
                    </label>
                    <textarea
                      value={item.dedicationMessage || ''}
                      onChange={(e) => updateMessage(item.productId, item.memorialId, e.target.value)}
                      rows={2}
                      maxLength={200}
                      placeholder="Add a personal message (max 200 characters)..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                    />
                    {item.dedicationMessage && (
                      <p className="text-xs text-slate-500 mt-1">
                        {item.dedicationMessage.length}/200 characters
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.productId, item.memorialId)}
                  className="text-red-600 hover:text-red-700 font-medium text-sm h-fit"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-slate-900">
              ${(totalCents / 100).toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed mb-2"
          >
            {loading ? 'Processing...' : 'Proceed to Checkout'}
          </button>

          <button
            onClick={clearCart}
            className="w-full py-2 text-slate-600 hover:text-slate-800 text-sm"
          >
            Clear Cart
          </button>
        </div>

        <div className="text-center text-sm text-slate-600">
          <p>Secure checkout powered by Stripe</p>
        </div>
      </div>
    </div>
  )
}
