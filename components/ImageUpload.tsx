'use client'

import { useState, useRef } from 'react'
import { generateImagePreview } from '@/lib/utils/file-upload'

interface ImageUploadProps {
  label: string
  helpText?: string
  currentImageUrl?: string
  onFileSelect: (file: File | null) => void
  accept?: string
  maxSizeMB?: number
  required?: boolean
  previewSize?: 'small' | 'medium' | 'large'
}

export function ImageUpload({
  label,
  helpText,
  currentImageUrl,
  onFileSelect,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  maxSizeMB = 5,
  required = false,
  previewSize = 'medium'
}: ImageUploadProps) {
  // Map preview size to Tailwind classes
  const sizeClasses = {
    small: 'w-32 h-32',      // 128px x 128px (thumbnail)
    medium: 'w-full max-w-md h-48',  // Current default
    large: 'w-full max-w-2xl h-96'   // Larger preview
  }
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (file: File | null) => {
    setError(null)

    if (!file) {
      setPreview(currentImageUrl || null)
      onFileSelect(null)
      return
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`)
      return
    }

    // Generate preview
    try {
      const previewUrl = await generateImagePreview(file)
      setPreview(previewUrl)
      onFileSelect(file)
    } catch (err) {
      setError('Failed to load image preview')
      console.error(err)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileChange(file)
    } else {
      setError('Please drop an image file')
    }
  }

  const handleClear = () => {
    setPreview(null)
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {helpText && (
        <p className="text-sm text-slate-600">{helpText}</p>
      )}

      {/* Preview Area */}
      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className={`${sizeClasses[previewSize]} object-cover rounded-lg border-2 border-slate-300`}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm font-medium"
          >
            Remove
          </button>
        </div>
      ) : (
        /* Upload Area */
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <div className="space-y-3">
            <div className="text-4xl">📸</div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Click to upload
              </button>
              <span className="text-slate-600"> or drag and drop</span>
            </div>
            <p className="text-xs text-slate-500">
              PNG, JPG, WEBP or GIF (max {maxSizeMB}MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
