'use client'

import { useState } from 'react'
import PremiumMembershipModal from './PremiumMembershipModal'

interface VideoLinkInputProps {
  videoUrl: string | null
  onVideoChange: (url: string | null) => void
  isPremium: boolean
}

type VideoProvider = 'youtube' | 'vimeo' | 'invalid' | null

export default function VideoLinkInput({
  videoUrl,
  onVideoChange,
  isPremium,
}: VideoLinkInputProps) {
  const [input, setInput] = useState(videoUrl || '')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [provider, setProvider] = useState<VideoProvider>(null)
  const [error, setError] = useState('')

  /**
   * Extracts video ID and provider from various URL formats
   */
  function parseVideoUrl(url: string): { provider: VideoProvider; previewUrl: string | null } {
    if (!url.trim()) return { provider: null, previewUrl: null }

    setError('')

    // YouTube patterns
    const youtubePatterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
    ]

    for (const pattern of youtubePatterns) {
      const match = url.match(pattern)
      if (match) {
        const videoId = match[1]
        return {
          provider: 'youtube',
          previewUrl: `https://www.youtube.com/embed/${videoId}`,
        }
      }
    }

    // Vimeo patterns
    const vimeoPatterns = [
      /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
      /(?:https?:\/\/)?(?:player\.)?vimeo\.com\/video\/(\d+)/,
    ]

    for (const pattern of vimeoPatterns) {
      const match = url.match(pattern)
      if (match) {
        const videoId = match[1]
        return {
          provider: 'vimeo',
          previewUrl: `https://player.vimeo.com/video/${videoId}`,
        }
      }
    }

    // Invalid format
    setError(
      'Please enter a valid YouTube or Vimeo URL (e.g., https://youtube.com/watch?v=... or https://vimeo.com/...)'
    )
    return { provider: 'invalid', previewUrl: null }
  }

  function handleUrlChange(newUrl: string) {
    setInput(newUrl)

    const { provider: detectedProvider, previewUrl: detected } = parseVideoUrl(newUrl)
    setProvider(detectedProvider)
    setPreviewUrl(detected)
  }

  function handleSave() {
    if (!isPremium) {
      setShowPremiumModal(true)
      return
    }

    if (provider === 'youtube' || provider === 'vimeo') {
      onVideoChange(input)
    }
  }

  function handleClear() {
    setInput('')
    setProvider(null)
    setPreviewUrl(null)
    setError('')
    onVideoChange(null)
  }

  const isValid = provider === 'youtube' || provider === 'vimeo'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Tribute Video</h3>
        <p className="text-sm text-slate-600">
          Share a YouTube or Vimeo video to honor your loved one
        </p>
      </div>

      {/* Premium Badge */}
      {!isPremium && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.5 2a1.5 1.5 0 00-1.5 1.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V3.5A1.5 1.5 0 0015.5 2h-11zm0 2h11v9h-11V4z"
              clipRule="evenodd"
            />
          </svg>
          Video uploads are a premium feature. Upgrade to add a tribute video.
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Video URL</label>

        <input
          type="url"
          value={input}
          onChange={(e) => handleUrlChange(e.target.value)}
          disabled={!isPremium}
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          className={`
            w-full px-4 py-2 rounded-lg border transition-colors
            ${
              !isPremium
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
            }
          `}
        />
      </div>

      {/* Validation Messages */}
      {error && <div className="text-sm text-red-700">{error}</div>}

      {isValid && (
        <div className="text-sm text-green-700 font-medium">
          ✓ {provider === 'youtube' ? 'YouTube' : 'Vimeo'} video detected
        </div>
      )}

      {/* Video Preview */}
      {previewUrl && isValid && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Preview:</p>
          <div className="relative w-full bg-slate-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={previewUrl}
              title="Video preview"
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!isPremium || !isValid}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${
              !isPremium || !isValid
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          Save Video
        </button>

        {input && (
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-sm text-blue-900">
        <p className="font-medium mb-1">📹 Supported platforms:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>YouTube (public and unlisted videos)</li>
          <li>Vimeo (public and password-protected)</li>
        </ul>
      </div>

      {/* Premium Modal */}
      <PremiumMembershipModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </div>
  )
}
