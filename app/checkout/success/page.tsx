'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useCart } from '@/lib/context/CartContext'
import Link from 'next/link'

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { clearCart } = useCart()
  const router = useRouter()

  useEffect(() => {
    // Clear cart after successful payment
    if (sessionId) {
      clearCart()
    }
  }, [sessionId, clearCart])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-12 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Thank You for Your Purchase!
          </h1>
          <p className="text-slate-600 mb-4">
            Your memorial gift has been successfully purchased.
          </p>
          <p className="text-slate-600 mb-8">
            The items will appear on the memorial page shortly and can be downloaded by you and the memorial creator.
          </p>

          <div className="space-y-3">
            <Link
              href="/dashboard/memorials"
              className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              View Memorials
            </Link>
            <Link
              href="/store"
              className="block px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition font-medium"
            >
              Continue Shopping
            </Link>
            <Link
              href="/dashboard"
              className="block text-slate-600 hover:text-slate-800 text-sm mt-4"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
