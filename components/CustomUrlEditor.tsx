'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateSlug, isSlugAvailable, getMemorialUrl } from '@/lib/utils/slug'
import PremiumMembershipModal from './PremiumMembershipModal'

interface CustomUrlEditorProps {
  currentSlug: string
  memorialId: string
  memorialName: string
  isPremium: boolean
  onSlugChange: (newSlug: string) => void
}

type ValidationState = 'idle' | 'checking' | 'valid' | 'invalid' | 'reserved' | 'taken'

export default function CustomUrlEditor({
  currentSlug,
  memorialId,
  memorialName,
  isPremium,
  onSlugChange,
}: CustomUrlEditorProps) {
  const [slug, setSlug] = useState(currentSlug)
  const [validationState, setValidationState] = useState<ValidationState>('idle')
  const [validationMessage, setValidationMessage] = useState('')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const supabase = createClient()
  let validationTimeout: NodeJS.Timeout

  // Validate slug as user types
  useEffect(() => {
    clearTimeout(validationTimeout)

    if (!slug) {
      setValidationState('idle')
      return
    }

    setValidationState('checking')

    validationTimeout = setTimeout(async () => {
      const isValid = validateSlug(slug)

      if (!isValid) {
        // Check if it's a reserved word or just bad format
        const reservedWords = [
          'login',
          'admin',
          'resources',
          'meetups',
          'api',
          'auth',
          'dashboard',
          'pricing',
          'settings',
          'messages',
          'connections',
          'host-gatherings',
          'forums',
          'candles',
        ]

        if (reservedWords.includes(slug.toLowerCase())) {
          setValidationState('reserved')
          setValidationMessage('This URL is reserved and cannot be used.')
        } else {
          setValidationState('invalid')
          setValidationMessage(
            'URL can only contain letters, numbers, and hyphens (no spaces or special characters).'
          )
        }
        return
      }

      // Check if slug is available
      const available = await isSlugAvailable(slug, supabase, memorialId)

      if (available) {
        setValidationState('valid')
        setValidationMessage(`✓ ${getMemorialUrl(slug).replace(/^https?:\/\//, '')} is available`)
      } else {
        setValidationState('taken')
        setValidationMessage('This URL is already taken. Please choose another.')
      }
    }, 500)

    return () => clearTimeout(validationTimeout)
  }, [slug, memorialId, supabase])

  async function handleSave() {
    // Premium feature check
    if (!isPremium) {
      setShowPremiumModal(true)
      return
    }

    // Validate before saving
    if (validationState !== 'valid') {
      return
    }

    setIsSaving(true)

    try {
      const { error } = await supabase
        .from('memorials')
        .update({ slug })
        .eq('id', memorialId)

      if (error) throw error

      onSlugChange(slug)
      setValidationMessage('✓ URL saved successfully!')
    } catch (error) {
      console.error('Error saving custom URL:', error)
      setValidationMessage('Failed to save URL. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Memorial URL</h3>
        <p className="text-sm text-slate-600">
          Create a custom URL to make your memorial easy to share
        </p>
      </div>

      {/* Premium Badge */}
      {!isPremium && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zm-1-9a1 1 0 00-1 1v1h3V0a1 1 0 00-1-1zM5 8a2 2 0 11-4 0 2 2 0 014 0zM6 0a1 1 0 00-1 1v1H2V0a1 1 0 00-1-1h5z"
              clipRule="evenodd"
            />
          </svg>
          Custom URLs are a premium feature. Upgrade to customize your memorial URL.
        </div>
      )}

      {/* URL Input Group */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">
          Your Memorial URL
        </label>

        <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-300 p-3">
          <span className="text-sm text-slate-600 whitespace-nowrap">
            {process.env.NEXT_PUBLIC_SITE_URL || 'https://holdingspacetogether.org'}/memorial/
          </span>

          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            disabled={!isPremium}
            placeholder="john-doe-2024"
            className={`
              flex-1 bg-transparent border-0 outline-0 text-sm
              ${!isPremium ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'}
            `}
          />
        </div>

        {/* Validation Messages */}
        {validationState === 'checking' && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            Checking availability...
          </div>
        )}

        {validationState === 'valid' && (
          <div className="text-sm text-green-700 font-medium">{validationMessage}</div>
        )}

        {(validationState === 'invalid' ||
          validationState === 'reserved' ||
          validationState === 'taken') && (
          <div className="text-sm text-red-700">{validationMessage}</div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={
            !isPremium ||
            validationState !== 'valid' ||
            isSaving ||
            slug === currentSlug
          }
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${
              !isPremium ||
              validationState !== 'valid' ||
              isSaving ||
              slug === currentSlug
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isSaving ? 'Saving...' : 'Save Custom URL'}
        </button>

        {slug !== currentSlug && isPremium && (
          <button
            onClick={() => setSlug(currentSlug)}
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Current URL */}
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
        <p className="text-xs text-slate-600 mb-1">Current URL:</p>
        <p className="text-sm font-mono text-slate-900 break-all">
          {getMemorialUrl(currentSlug)}
        </p>
      </div>

      {/* Premium Modal */}
      <PremiumMembershipModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  )
}
