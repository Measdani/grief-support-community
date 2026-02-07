'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PremiumMembershipModal from './PremiumMembershipModal'

interface Theme {
  id: string
  name: string
  description: string
  is_premium: boolean
  sort_order: number
}

interface ThemePickerProps {
  selectedThemeId: string | null
  onThemeSelect: (themeId: string) => void
  isPremium: boolean
}

export default function ThemePicker({
  selectedThemeId,
  onThemeSelect,
  isPremium,
}: ThemePickerProps) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [attemptedPremiumTheme, setAttemptedPremiumTheme] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadThemes()
  }, [])

  async function loadThemes() {
    try {
      // If user is premium, fetch all themes; otherwise only free themes
      let query = supabase.from('themes').select('*').eq('is_active', true).order('sort_order')

      if (!isPremium) {
        query = query.eq('is_premium', false)
      }

      const { data, error } = await query

      if (error) throw error
      setThemes(data || [])
    } catch (error) {
      console.error('Error loading themes:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleThemeSelect(theme: Theme) {
    // If it's a premium theme and user isn't premium, show modal
    if (theme.is_premium && !isPremium) {
      setAttemptedPremiumTheme(theme.id)
      setShowPremiumModal(true)
      return
    }

    // Otherwise, select the theme
    onThemeSelect(theme.id)
  }

  if (loading) {
    return <div className="text-slate-500">Loading themes...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Memorial Theme</h3>
        <p className="text-sm text-slate-600">
          Choose a background theme for your memorial page
        </p>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <div key={theme.id} className="relative">
            {/* Theme Card */}
            <button
              onClick={() => handleThemeSelect(theme)}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${
                  selectedThemeId === theme.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }
                ${theme.is_premium && !isPremium ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {/* Theme Name */}
              <p className="font-medium text-slate-900">{theme.name}</p>

              {/* Theme Description */}
              <p className="text-xs text-slate-500 mt-1">{theme.description}</p>

              {/* Premium Badge */}
              {theme.is_premium && (
                <div className="mt-2 inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded">
                  Premium
                </div>
              )}

              {/* Locked Icon for Premium Themes (non-premium users) */}
              {theme.is_premium && !isPremium && (
                <div className="absolute top-2 right-2 bg-slate-700 text-white rounded-full p-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              {/* Selected Checkmark */}
              {selectedThemeId === theme.id && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Premium Modal */}
      <PremiumMembershipModal
        isOpen={showPremiumModal}
        onClose={() => {
          setShowPremiumModal(false)
          setAttemptedPremiumTheme(null)
        }}
      />

      {/* Free Theme Note */}
      {!isPremium && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
          💡 Free themes are available to all users. Premium themes unlock with a verified membership.
        </div>
      )}
    </div>
  )
}
