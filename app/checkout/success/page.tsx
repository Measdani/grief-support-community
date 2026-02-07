'use client'

import { Suspense } from 'react'
import CheckoutSuccessContent from './CheckoutSuccessContent'

export const dynamic = 'force-dynamic'

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center"><p className="text-slate-600">Loading...</p></div>}>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
