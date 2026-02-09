'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUpload } from '@/components/ImageUpload'
import { uploadMemorialPhoto } from '@/lib/utils/file-upload'
import ThemePicker from '@/components/ThemePicker'
import CustomUrlEditor from '@/components/CustomUrlEditor'
import VideoLinkInput from '@/components/VideoLinkInput'
import QRCodeButton from '@/components/QRCodeButton'
import { generateUniqueSlug } from '@/lib/utils/slug'

interface MemorialEditorProps {
  mode: 'create' | 'edit'
  memorialId?: string
  onSuccess?: (memorialId: string) => void
}

interface FormData {
  first_name: string
  middle_name: string
  last_name: string
  nickname: string
  date_of_birth: string
  date_of_passing: string
  obituary: string
  life_story: string
  favorite_memory: string
  relationship_to_creator: string
  occupation: string
  hobbies: string
  favorite_quote: string
  is_public: boolean
  allow_tributes: boolean
  allow_photos: boolean
  // Premium features
  slug?: string
  theme_id: string | null
  video_url: string | null
}

export default function MemorialEditor({
  mode,
  memorialId,
  onSuccess,
}: MemorialEditorProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null)
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isPremium, setIsPremium] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    nickname: '',
    date_of_birth: '',
    date_of_passing: '',
    obituary: '',
    life_story: '',
    favorite_memory: '',
    relationship_to_creator: '',
    occupation: '',
    hobbies: '',
    favorite_quote: '',
    is_public: true,
    allow_tributes: true,
    allow_photos: true,
    slug: '',
    theme_id: null,
    video_url: null,
  })

  // Service links state
  const [serviceLinks, setServiceLinks] = useState<Array<{ type: string; url: string; title: string }>>([])
  const [newLinkType, setNewLinkType] = useState('gofundme')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [newLinkTitle, setNewLinkTitle] = useState('')

  const router = useRouter()
  const supabaseRef = useRef<any>(null)

  // Load user profile and existing memorial (if edit mode)
  useEffect(() => {
    supabaseRef.current = createClient()
    loadInitialData()
  }, [])

  async function loadInitialData() {
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user profile
      const { data: profile } = await supabaseRef.current
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single()

      setUserProfile(profile)
      setIsPremium(profile?.subscription_tier === 'premium')

      // If editing, load existing memorial
      if (mode === 'edit' && memorialId) {
        const { data: memorial, error } = await supabaseRef.current
          .from('memorials')
          .select('*')
          .eq('id', memorialId)
          .single()

        if (error) throw error

        setFormData({
          first_name: memorial.first_name,
          middle_name: memorial.middle_name || '',
          last_name: memorial.last_name,
          nickname: memorial.nickname || '',
          date_of_birth: memorial.date_of_birth || '',
          date_of_passing: memorial.date_of_passing,
          obituary: memorial.obituary || '',
          life_story: memorial.life_story || '',
          favorite_memory: memorial.favorite_memory || '',
          relationship_to_creator: memorial.relationship_to_creator || '',
          occupation: memorial.occupation || '',
          hobbies: memorial.hobbies?.join(', ') || '',
          favorite_quote: memorial.favorite_quote || '',
          is_public: memorial.is_public,
          allow_tributes: memorial.allow_tributes,
          allow_photos: memorial.allow_photos,
          slug: memorial.slug || '',
          theme_id: memorial.theme_id,
          video_url: memorial.video_url,
        })

        if (memorial.service_links) {
          setServiceLinks(memorial.service_links)
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  function addServiceLink() {
    if (!newLinkUrl.trim() || !newLinkTitle.trim()) {
      alert('Please fill in both URL and title')
      return
    }
    setServiceLinks([...serviceLinks, { type: newLinkType, url: newLinkUrl, title: newLinkTitle }])
    setNewLinkUrl('')
    setNewLinkTitle('')
  }

  function removeServiceLink(index: number) {
    setServiceLinks(serviceLinks.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.first_name.trim() || !formData.last_name.trim() || !formData.date_of_passing) {
      alert('Please fill in all required fields')
      return
    }

    setLoading(true)
    setUploadingPhotos(true)

    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser()
      if (!user) {
        alert('You must be logged in')
        return
      }

      // Process hobbies
      const hobbiesArray = formData.hobbies
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0)

      // Generate slug for new memorials
      let finalSlug = formData.slug
      if (mode === 'create') {
        finalSlug = await generateUniqueSlug(`${formData.first_name} ${formData.last_name}`, supabaseRef.current)
      }

      const memorialData = {
        created_by: user.id,
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        last_name: formData.last_name,
        nickname: formData.nickname || null,
        date_of_birth: formData.date_of_birth || null,
        date_of_passing: formData.date_of_passing,
        obituary: formData.obituary || null,
        life_story: formData.life_story || null,
        favorite_memory: formData.favorite_memory || null,
        relationship_to_creator: formData.relationship_to_creator || null,
        occupation: formData.occupation || null,
        hobbies: hobbiesArray.length > 0 ? hobbiesArray : null,
        service_links: serviceLinks.length > 0 ? serviceLinks : null,
        favorite_quote: formData.favorite_quote || null,
        is_public: formData.is_public,
        allow_tributes: formData.allow_tributes,
        allow_photos: formData.allow_photos,
        slug: finalSlug,
        theme_id: formData.theme_id,
        video_url: formData.video_url || null,
      }

      let memorial
      if (mode === 'create') {
        const { data, error } = await supabaseRef.current
          .from('memorials')
          .insert(memorialData)
          .select()
          .single()

        if (error) throw error
        memorial = data
      } else {
        const { data, error } = await supabaseRef.current
          .from('memorials')
          .update(memorialData)
          .eq('id', memorialId)
          .select()
          .single()

        if (error) throw error
        memorial = data
      }

      // Upload photos if provided
      let profilePhotoUrl = null
      let coverPhotoUrl = null

      if (profilePhotoFile) {
        const uploadResult = await uploadMemorialPhoto(
          profilePhotoFile,
          user.id,
          memorial.id,
          'profile'
        )
        if (uploadResult.success) {
          profilePhotoUrl = uploadResult.url
        }
      }

      if (coverPhotoFile) {
        const uploadResult = await uploadMemorialPhoto(
          coverPhotoFile,
          user.id,
          memorial.id,
          'cover'
        )
        if (uploadResult.success) {
          coverPhotoUrl = uploadResult.url
        }
      }

      // Update with photo URLs
      if (profilePhotoUrl || coverPhotoUrl) {
        await supabaseRef.current
          .from('memorials')
          .update({
            profile_photo_url: profilePhotoUrl,
            cover_photo_url: coverPhotoUrl,
          })
          .eq('id', memorial.id)
      }

      const message = mode === 'create'
        ? 'This remembrance has been placed with care.'
        : 'Memorial updated successfully.'
      alert(message)

      if (onSuccess) {
        onSuccess(memorial.id)
      } else {
        router.push(`/dashboard/memorials/${memorial.id}`)
      }
    } catch (error) {
      console.error('Error saving memorial:', error)
      alert('Failed to save memorial. Please try again.')
    } finally {
      setLoading(false)
      setUploadingPhotos(false)
    }
  }

  const backLink = mode === 'create' ? '/dashboard/memorials' : `/dashboard/memorials/${memorialId}`
  const pageTitle = mode === 'create' ? 'Create Memorial' : 'Edit Memorial'
  const pageDescription = mode === 'create'
    ? 'Create a lasting tribute to honor and remember your loved one'
    : 'Update the memorial details'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href={backLink} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
            ← Back
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{pageTitle}</h1>
          <p className="text-slate-600 mb-8">{pageDescription}</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ========== BASIC INFORMATION ========== */}
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>📝</span> Basic Information
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder='e.g., "Papa" or "Grandma"'
                  />
                </div>
              </div>

              {/* Dates */}
              <h3 className="text-lg font-medium text-slate-800 mt-6 mb-4">Important Dates</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date of Passing <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_passing}
                    onChange={(e) => setFormData({ ...formData, date_of_passing: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </section>

            {/* ========== PERSONAL DETAILS ========== */}
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>💭</span> Personal Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Relationship to You
                  </label>
                  <select
                    value={formData.relationship_to_creator}
                    onChange={(e) => setFormData({ ...formData, relationship_to_creator: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="spouse">Spouse</option>
                    <option value="sibling">Sibling</option>
                    <option value="friend">Friend</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Teacher, Engineer, Artist"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hobbies & Interests
                  </label>
                  <input
                    type="text"
                    value={formData.hobbies}
                    onChange={(e) => setFormData({ ...formData, hobbies: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Separate with commas"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Favorite Quote
                  </label>
                  <textarea
                    value={formData.favorite_quote}
                    onChange={(e) => setFormData({ ...formData, favorite_quote: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="A quote that captures their spirit..."
                  />
                </div>
              </div>
            </section>

            {/* ========== THEIR STORY ========== */}
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>📖</span> Their Story
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Obituary
                  </label>
                  <textarea
                    value={formData.obituary}
                    onChange={(e) => setFormData({ ...formData, obituary: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Official obituary or brief biography..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Life Story
                  </label>
                  <textarea
                    value={formData.life_story}
                    onChange={(e) => setFormData({ ...formData, life_story: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Share the story of their life..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Your Favorite Memory
                  </label>
                  <textarea
                    value={formData.favorite_memory}
                    onChange={(e) => setFormData({ ...formData, favorite_memory: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Share a cherished memory..."
                  />
                </div>
              </div>
            </section>

            {/* ========== MEDIA ========== */}
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>🖼️</span> Photos & Media
              </h2>

              <div className="space-y-6 mb-6">
                <ImageUpload
                  label="Profile Photo"
                  helpText="A portrait or favorite photo of your loved one"
                  onFileSelect={setProfilePhotoFile}
                  maxSizeMB={5}
                />

                <ImageUpload
                  label="Cover Photo"
                  helpText="A landscape photo for the memorial header (optional)"
                  onFileSelect={setCoverPhotoFile}
                  maxSizeMB={5}
                />
              </div>

              {/* Video Section (Premium) */}
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <VideoLinkInput
                  videoUrl={formData.video_url}
                  onVideoChange={(url) => setFormData({ ...formData, video_url: url })}
                  isPremium={isPremium}
                />
              </div>
            </section>

            {/* ========== APPEARANCE (THEMES) ========== */}
            {mode === 'edit' && (
              <section className="border-b border-slate-200 pb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <span>🎨</span> Appearance
                </h2>

                <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <ThemePicker
                    selectedThemeId={formData.theme_id}
                    onThemeSelect={(themeId) => setFormData({ ...formData, theme_id: themeId })}
                    isPremium={isPremium}
                  />
                </div>
              </section>
            )}

            {/* ========== SHARING (Custom URL, QR Code) ========== */}
            {mode === 'edit' && formData.slug && (
              <section className="border-b border-slate-200 pb-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                  <span>🔗</span> Sharing
                </h2>

                <div className="space-y-6">
                  {/* Custom URL */}
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <CustomUrlEditor
                      currentSlug={formData.slug}
                      memorialId={memorialId!}
                      memorialName={`${formData.first_name} ${formData.last_name}`}
                      isPremium={isPremium}
                      onSlugChange={(newSlug) => setFormData({ ...formData, slug: newSlug })}
                    />
                  </div>

                  {/* QR Code */}
                  <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Generate QR Code</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Download a QR code that visitors can scan to share this memorial
                    </p>
                    <QRCodeButton
                      memorialSlug={formData.slug}
                      memorialName={`${formData.first_name} ${formData.last_name}`}
                      isPremium={isPremium}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* ========== SERVICE LINKS ========== */}
            <section className="border-b border-slate-200 pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>🔗</span> Service & Fundraising Links
              </h2>

              <div className="bg-slate-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <select
                    value={newLinkType}
                    onChange={(e) => setNewLinkType(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  >
                    <option value="gofundme">GoFundMe</option>
                    <option value="memorial_fund">Memorial Fund</option>
                    <option value="funeral_service">Funeral Service</option>
                    <option value="charity">Charity Donation</option>
                  </select>

                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />

                  <input
                    type="text"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    placeholder="Link title"
                    className="px-3 py-2 border border-slate-300 rounded-md text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={addServiceLink}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  + Add Link
                </button>
              </div>

              {serviceLinks.length > 0 && (
                <div className="space-y-2">
                  {serviceLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            {link.type}
                          </span>
                          <span className="font-medium text-sm text-slate-900">{link.title}</span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {link.url}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeServiceLink(index)}
                        className="ml-3 px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ========== PRIVACY & PERMISSIONS ========== */}
            <section className="pb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <span>🔒</span> Privacy & Permissions
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Make this memorial public</div>
                    <div className="text-sm text-slate-600">Allow anyone to view this memorial</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allow_tributes}
                    onChange={(e) => setFormData({ ...formData, allow_tributes: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Allow tributes</div>
                    <div className="text-sm text-slate-600">Let others share memories and condolences</div>
                  </div>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.allow_photos}
                    onChange={(e) => setFormData({ ...formData, allow_photos: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium text-slate-900">Allow photos</div>
                    <div className="text-sm text-slate-600">Let others upload photos to this memorial</div>
                  </div>
                </label>
              </div>
            </section>

            {/* ========== SUBMIT ========== */}
            <div className="flex gap-3 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={loading || uploadingPhotos}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPhotos ? 'Uploading Photos...' : loading ? `${pageTitle}...` : `Save ${pageTitle}`}
              </button>
              <Link
                href={backLink}
                className="flex-1 text-center bg-slate-200 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-300 transition font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
