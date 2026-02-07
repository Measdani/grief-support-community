'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PremiumMembershipModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PremiumMembershipModal({
  isOpen,
  onClose,
}: PremiumMembershipModalProps) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleLearnMore = () => {
    setIsNavigating(true)
    router.push('/pricing')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md mx-4 p-8">
        {/* Header */}
        <h2 className="text-2xl font-bold text-slate-900 mb-4">
          Verified Membership Required
        </h2>

        {/* Body */}
        <p className="text-slate-600 mb-6 leading-relaxed">
          Messaging and in-person connections are available to verified members to help protect everyone in the community.
        </p>

        <p className="text-slate-600 mb-8 leading-relaxed">
          Upgrading unlocks messaging, friend connections, and access to gatherings with added safety measures in place.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleLearnMore}
            disabled={isNavigating}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isNavigating ? 'Loading...' : 'Learn About Verified Membership'}
          </button>
        </div>
      </div>
    </div>
  )
}
