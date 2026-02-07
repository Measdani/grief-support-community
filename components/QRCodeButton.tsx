'use client'

import { useState } from 'react'
import { downloadQRCode, getQRCodeDataUrl } from '@/lib/utils/qrcode'
import { getMemorialUrl } from '@/lib/utils/slug'
import PremiumMembershipModal from './PremiumMembershipModal'

interface QRCodeButtonProps {
  memorialSlug: string
  memorialName: string
  isPremium: boolean
}

type QRState = 'idle' | 'generating' | 'previewing' | 'downloading' | 'error'

export default function QRCodeButton({
  memorialSlug,
  memorialName,
  isPremium,
}: QRCodeButtonProps) {
  const [state, setState] = useState<QRState>('idle')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const memorialUrl = getMemorialUrl(memorialSlug)

  async function handleGeneratePreview() {
    if (!isPremium) {
      setShowPremiumModal(true)
      return
    }

    try {
      setState('generating')
      setError(null)

      const dataUrl = await getQRCodeDataUrl(memorialUrl)
      setPreviewUrl(dataUrl)
      setState('previewing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code')
      setState('error')
    }
  }

  async function handleDownload() {
    try {
      setState('downloading')
      setError(null)

      await downloadQRCode(memorialUrl, memorialName)

      // Reset after successful download
      setTimeout(() => {
        setState('previewing')
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download QR code')
      setState('error')
    }
  }

  function handleClose() {
    setPreviewUrl(null)
    setState('idle')
    setError(null)
  }

  return (
    <>
      {/* Main Button */}
      <button
        onClick={handleGeneratePreview}
        disabled={!isPremium || state === 'downloading'}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
          ${
            !isPremium || state === 'downloading'
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        {state === 'generating' && 'Generating...'}
        {state === 'downloading' && 'Downloading...'}
        {(state === 'idle' || state === 'error') && 'Generate QR Code'}
        {state === 'previewing' && 'QR Code Ready'}
      </button>

      {/* Premium Badge */}
      {!isPremium && (
        <p className="text-sm text-amber-700 mt-2">Premium feature - upgrade to download QR codes</p>
      )}

      {/* QR Code Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8">
            {/* Header */}
            <h3 className="text-xl font-bold text-slate-900 mb-4">Memorial QR Code</h3>

            {/* QR Code Display */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 flex justify-center">
              <img
                src={previewUrl}
                alt="QR Code"
                className="w-48 h-48"
              />
            </div>

            {/* Info */}
            <div className="bg-blue-50 rounded-lg p-3 mb-6 text-sm text-blue-900">
              <p className="font-medium mb-1">📱 Share this QR code</p>
              <p className="text-xs">
                People can scan it to visit: <span className="font-mono">{memorialUrl}</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 rounded-lg p-3 mb-4 text-sm text-red-900">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                disabled={state === 'downloading'}
                className={`
                  flex-1 px-4 py-2 rounded-lg font-medium transition-colors
                  ${
                    state === 'downloading'
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {state === 'downloading' ? 'Downloading...' : '⬇️ Download PNG'}
              </button>

              <button
                onClick={handleClose}
                disabled={state === 'downloading'}
                className="flex-1 px-4 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {/* Tip */}
            <p className="text-xs text-slate-600 mt-4 text-center">
              💡 Print the QR code or share it on social media
            </p>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      <PremiumMembershipModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
    </>
  )
}
