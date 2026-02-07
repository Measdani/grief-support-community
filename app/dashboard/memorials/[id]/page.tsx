'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ImageUpload } from '@/components/ImageUpload'
import { uploadMemorialPhoto } from '@/lib/utils/file-upload'

export const dynamic = 'force-dynamic'

interface Memorial {
  id: string
  created_by: string
  first_name: string
  middle_name: string | null
  last_name: string
  nickname: string | null
  date_of_birth: string | null
  date_of_passing: string
  obituary: string | null
  life_story: string | null
  favorite_memory: string | null
  profile_photo_url: string | null
  cover_photo_url: string | null
  relationship_to_creator: string | null
  occupation: string | null
  hobbies: string[] | null
  favorite_quote: string | null
  service_links: Array<{type: string, url: string, title: string}> | null
  is_public: boolean
  allow_tributes: boolean
  allow_photos: boolean
  view_count: number
  tribute_count: number
  created_at: string
}

interface CreatorProfile {
  id: string
  display_name: string | null
  full_name: string | null
  profile_image_url: string | null
  verification_status: string
}

interface Tribute {
  id: string
  memorial_id: string
  author_id: string
  tribute_type: string
  content: string | null
  photo_url?: string | null
  created_at: string
  author?: {
    display_name: string | null
    email: string
  }
}

interface Candle {
  id: string
  memorial_id: string
  lit_by: string
  message: string | null
  created_at: string
  lighter?: {
    display_name: string | null
    email: string
  }
}

interface MemorialStoreItem {
  id: string
  memorial_id: string
  purchaser_name: string
  dedication_message: string | null
  product_name: string
  product_type: string
  preview_image_url: string
  is_visible: boolean
  created_at: string
}

export default function MemorialDetailPage({ params }: { params: { id: string } }) {
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [tributes, setTributes] = useState<Tribute[]>([])
  const [candles, setCandles] = useState<Candle[]>([])
  const [storeItems, setStoreItems] = useState<MemorialStoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted' | 'sent'>('none')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [sendingRequest, setSendingRequest] = useState(false)

  // Form states
  const [tributeContent, setTributeContent] = useState('')
  const [tributeType, setTributeType] = useState('memory')
  const [tributePhotoFile, setTributePhotoFile] = useState<File | null>(null)
  const [candleMessage, setCandleMessage] = useState('')
  const [tributeSubmitting, setTributeSubmitting] = useState(false)
  const [candleSubmitting, setCandleSubmitting] = useState(false)

  const supabaseRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabaseRef.current = createClient()
    loadMemorial()
    loadTributes()
    loadCandles()
    loadStoreItems()
    getCurrentUser()
  }, [params.id])

  useEffect(() => {
    if (memorial && currentUserId) {
      loadCreatorProfile()
      if (currentUserId !== memorial.created_by) {
        loadConnectionStatus()
      }
    }
  }, [memorial?.created_by, currentUserId])

  async function getCurrentUser() {
    const supabase = supabaseRef.current
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  async function loadCreatorProfile() {
    const supabase = supabaseRef.current
    if (!memorial) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, full_name, profile_image_url, verification_status')
        .eq('id', memorial.created_by)
        .single()

      if (error) throw error
      setCreator(data)
    } catch (error) {
      console.error('Error loading creator profile:', error)
    }
  }

  async function loadConnectionStatus() {
    const supabase = supabaseRef.current
    if (!memorial || !currentUserId) return

    try {
      const { data } = await supabase
        .from('user_connections')
        .select('id, status, requester_id')
        .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${memorial.created_by}),and(requester_id.eq.${memorial.created_by},addressee_id.eq.${currentUserId})`)

      if (data && data.length > 0) {
        const connection = data[0]
        setConnectionId(connection.id)
        if (connection.status === 'accepted') {
          setConnectionStatus('accepted')
        } else if (connection.status === 'pending') {
          setConnectionStatus(connection.requester_id === currentUserId ? 'sent' : 'pending')
        }
      } else {
        setConnectionStatus('none')
      }
    } catch (error) {
      console.error('Error loading connection status:', error)
    }
  }

  async function handleAddFriend() {
    const supabase = supabaseRef.current
    if (!currentUserId || !memorial) {
      router.push('/auth/login')
      return
    }

    setSendingRequest(true)
    try {
      const { data, error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: currentUserId,
          addressee_id: memorial.created_by,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      setConnectionId(data.id)
      setConnectionStatus('sent')
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Failed to send friend request')
    } finally {
      setSendingRequest(false)
    }
  }

  async function handleCancelRequest() {
    const supabase = supabaseRef.current
    if (!connectionId) return

    try {
      const { error } = await supabase
        .from('user_connections')
        .delete()
        .eq('id', connectionId)

      if (error) throw error

      setConnectionStatus('none')
      setConnectionId(null)
    } catch (error) {
      console.error('Error canceling request:', error)
      alert('Failed to cancel request')
    }
  }

  async function loadMemorial() {
    const supabase = supabaseRef.current
    try {
      const { data, error } = await supabase
        .from('memorials')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) throw error
      setMemorial(data)

      // Increment view count
      await supabase
        .from('memorials')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', params.id)
    } catch (error) {
      console.error('Error loading memorial:', error)
      alert('Failed to load memorial')
    } finally {
      setLoading(false)
    }
  }

  async function loadTributes() {
    const supabase = supabaseRef.current
    try {
      const { data, error } = await supabase
        .from('memorial_tributes')
        .select(`
          *,
          author:profiles!memorial_tributes_author_id_fkey(display_name, email)
        `)
        .eq('memorial_id', params.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTributes(data || [])
    } catch (error) {
      console.error('Error loading tributes:', error)
    }
  }

  async function loadCandles() {
    const supabase = supabaseRef.current
    try {
      const { data, error } = await supabase
        .from('memorial_candles')
        .select(`
          *,
          lighter:profiles!memorial_candles_lit_by_fkey(display_name, email)
        `)
        .eq('memorial_id', params.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setCandles(data || [])
    } catch (error) {
      console.error('Error loading candles:', error)
    }
  }

  async function loadStoreItems() {
    const supabase = supabaseRef.current
    try {
      const { data, error } = await supabase
        .from('memorial_store_items')
        .select('*')
        .eq('memorial_id', params.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStoreItems(data || [])
    } catch (error) {
      console.error('Error loading store items:', error)
    }
  }

  async function submitTribute(e: React.FormEvent) {
    const supabase = supabaseRef.current
    e.preventDefault()

    // Validation based on tribute type
    if (tributeType === 'photo' && !tributePhotoFile) {
      alert('Please select a photo')
      return
    }
    if (tributeType !== 'photo' && !tributeContent.trim()) {
      alert('Please enter text for your tribute')
      return
    }

    setTributeSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to leave a tribute')
        return
      }

      let photoUrl = null

      // Upload photo if provided
      if (tributePhotoFile && tributeType === 'photo') {
        const uploadResult = await uploadMemorialPhoto(
          tributePhotoFile,
          user.id,
          params.id,
          'tribute'
        )
        if (uploadResult.success) {
          photoUrl = uploadResult.url
        } else {
          throw new Error(uploadResult.error || 'Failed to upload photo')
        }
      }

      const { error } = await supabase
        .from('memorial_tributes')
        .insert({
          memorial_id: params.id,
          author_id: user.id,
          tribute_type: tributeType,
          content: tributeContent || null,
          photo_url: photoUrl,
        })

      if (error) throw error

      setTributeContent('')
      setTributePhotoFile(null)
      setTributeType('memory')
      alert('Your tribute is now part of this space.')
      loadTributes()
      loadMemorial() // Refresh to update tribute count
    } catch (error) {
      console.error('Error submitting tribute:', error)
      alert('Failed to submit tribute. Please try again.')
    } finally {
      setTributeSubmitting(false)
    }
  }

  async function lightCandle(e: React.FormEvent) {
    const supabase = supabaseRef.current
    e.preventDefault()

    setCandleSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('You must be logged in to light a candle')
        return
      }

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

      const { error } = await supabase
        .from('memorial_candles')
        .insert({
          memorial_id: params.id,
          lit_by: user.id,
          message: candleMessage.trim() || null,
          expires_at: expiresAt.toISOString(),
        })

      if (error) throw error

      setCandleMessage('')
      alert('Candle lit! 🕯️')
      loadCandles()
    } catch (error) {
      console.error('Error lighting candle:', error)
      alert('Failed to light candle. Please try again.')
    } finally {
      setCandleSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🕯️</div>
          <p className="text-slate-600">Loading memorial...</p>
        </div>
      </div>
    )
  }

  if (!memorial) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Memorial Not Found</h1>
          <Link href="/dashboard/memorials" className="text-blue-600 hover:text-blue-700">
            ← Back to Memorials
          </Link>
        </div>
      </div>
    )
  }

  const age = memorial.date_of_birth && memorial.date_of_passing
    ? new Date(memorial.date_of_passing).getFullYear() - new Date(memorial.date_of_birth).getFullYear()
    : null

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pt-4">
      {/* Cover Photo */}
      <div className="h-64 bg-gradient-to-br from-slate-300 to-slate-400 relative mx-4 sm:mx-6 lg:mx-8 rounded-t-xl overflow-hidden">
        {memorial.cover_photo_url && (
          <img
            src={memorial.cover_photo_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <Link
            href="/dashboard/memorials"
            className="px-4 py-2 bg-white/90 backdrop-blur-sm text-slate-900 rounded-lg hover:bg-white transition font-medium text-sm"
          >
            ← Back
          </Link>
          {currentUserId === memorial.created_by && (
            <Link
              href={`/dashboard/memorials/${params.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              ✏️ Edit
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Profile Section */}
        <div className="bg-white rounded-b-xl shadow-lg border border-slate-200 border-t-0 p-8 mb-6 -mt-16 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Profile Photo */}
            <div className="w-40 h-40 rounded-full border-4 border-white shadow-lg bg-slate-300 overflow-hidden flex-shrink-0">
              {memorial.profile_photo_url ? (
                <img
                  src={memorial.profile_photo_url}
                  alt={`${memorial.first_name} ${memorial.last_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl text-slate-500">
                  👤
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-slate-900 mb-2">
                {memorial.first_name} {memorial.middle_name && `${memorial.middle_name} `}{memorial.last_name}
              </h1>
              {memorial.nickname && (
                <p className="text-lg text-slate-600 mb-3">"{memorial.nickname}"</p>
              )}

              <div className="flex items-center gap-3 text-lg text-slate-600 mb-4">
                {memorial.date_of_birth && (
                  <span>{new Date(memorial.date_of_birth).toLocaleDateString()}</span>
                )}
                <span>—</span>
                <span>{new Date(memorial.date_of_passing).toLocaleDateString()}</span>
                {age && <span className="text-slate-500">({age} years old)</span>}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                {memorial.relationship_to_creator && (
                  <div className="bg-blue-50 px-3 py-1 rounded-full text-blue-800">
                    <span className="font-medium">Relationship:</span> {memorial.relationship_to_creator}
                  </div>
                )}
                {memorial.occupation && (
                  <div className="bg-green-50 px-3 py-1 rounded-full text-green-800">
                    <span className="font-medium">Occupation:</span> {memorial.occupation}
                  </div>
                )}
              </div>

              {memorial.hobbies && memorial.hobbies.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-700 mb-1">Hobbies & Interests:</p>
                  <div className="flex flex-wrap gap-2">
                    {memorial.hobbies.map((hobby, i) => (
                      <span key={i} className="bg-purple-50 text-purple-800 px-2 py-1 rounded text-xs">
                        {hobby}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Creator Card */}
        {creator && currentUserId !== memorial.created_by && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <p className="text-sm text-slate-600 mb-4">Memorial created by</p>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="flex-shrink-0">
                  {creator.profile_image_url ? (
                    <img
                      src={creator.profile_image_url}
                      alt={creator.display_name || 'Creator'}
                      className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-300 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profiles/${creator.id}`}
                    className="font-semibold text-slate-900 hover:text-blue-600 transition"
                  >
                    {creator.full_name || creator.display_name || 'Community Member'}
                  </Link>
                  {creator.verification_status !== 'unverified' && (
                    <p className="text-xs text-slate-600 mt-1">
                      ✅ Verified Member
                    </p>
                  )}
                </div>
              </div>

              {/* Connection Buttons */}
              <div className="flex gap-2 flex-wrap">
                {connectionStatus === 'none' && (
                  <button
                    onClick={handleAddFriend}
                    disabled={sendingRequest}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    👥 Add Friend
                  </button>
                )}
                {connectionStatus === 'sent' && (
                  <button
                    onClick={handleCancelRequest}
                    className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition text-sm font-medium whitespace-nowrap"
                  >
                    ⏳ Request Sent
                  </button>
                )}
                {connectionStatus === 'pending' && (
                  <button
                    className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium cursor-default whitespace-nowrap"
                  >
                    ⏳ Pending
                  </button>
                )}
                {connectionStatus === 'accepted' && (
                  <button
                    className="px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium cursor-default whitespace-nowrap"
                  >
                    ✓ Friends
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Favorite Quote */}
            {memorial.favorite_quote && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-4xl mb-3">💭</div>
                <blockquote className="text-lg italic text-slate-700">
                  "{memorial.favorite_quote}"
                </blockquote>
              </div>
            )}

            {/* Obituary */}
            {memorial.obituary && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">Obituary</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{memorial.obituary}</p>
              </div>
            )}

            {/* Life Story */}
            {memorial.life_story && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">Life Story</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{memorial.life_story}</p>
              </div>
            )}

            {/* Favorite Memory */}
            {memorial.favorite_memory && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-3">A Cherished Memory</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{memorial.favorite_memory}</p>
              </div>
            )}

            {/* Memorial Gifts Gallery */}
            {storeItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-900">
                    Memorial Gifts ({storeItems.length})
                  </h2>
                  <Link
                    href={`/store?memorial=${params.id}`}
                    className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Add a Gift
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {storeItems.map((item) => (
                    <div key={item.id} className="group">
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-2">
                        <img
                          src={item.preview_image_url}
                          alt={item.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      </div>
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-slate-600">
                        From {item.purchaser_name}
                      </p>
                      {item.dedication_message && (
                        <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                          "{item.dedication_message}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tributes Section */}
            {memorial.allow_tributes && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  Tributes & Memories ({memorial.tribute_count || 0})
                </h2>

                {/* Submit Tribute Form */}
                <form onSubmit={submitTribute} className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-medium text-slate-900 mb-3">Share Your Memory</h3>

                  <div className="mb-3">
                    <select
                      value={tributeType}
                      onChange={(e) => {
                        setTributeType(e.target.value)
                        if (e.target.value !== 'photo') {
                          setTributePhotoFile(null)
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mb-2"
                    >
                      <option value="memory">Memory</option>
                      <option value="condolence">Condolence</option>
                      <option value="story">Story</option>
                      <option value="photo">Photo</option>
                    </select>

                    {tributeType === 'photo' ? (
                      <div className="mt-3">
                        <ImageUpload
                          label="Share a Photo"
                          helpText="Upload a photo of a special moment or memory"
                          onFileSelect={setTributePhotoFile}
                          maxSizeMB={5}
                          previewSize="small"
                        />
                        <textarea
                          value={tributeContent}
                          onChange={(e) => setTributeContent(e.target.value)}
                          rows={2}
                          placeholder="Optional caption for your photo..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm mt-3"
                        />
                      </div>
                    ) : (
                      <textarea
                        value={tributeContent}
                        onChange={(e) => setTributeContent(e.target.value)}
                        rows={3}
                        placeholder="Share a memory, story, or message of condolence..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                      />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={tributeSubmitting || (tributeType === 'photo' ? !tributePhotoFile : !tributeContent.trim())}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {tributeSubmitting ? 'Submitting...' : 'Submit Tribute'}
                  </button>
                </form>

                {/* Tributes List */}
                <div className="space-y-4">
                  {tributes.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">
                      No tributes yet. Be the first to share a memory.
                    </p>
                  ) : (
                    tributes.map((tribute) => (
                      <div key={tribute.id} className="border-l-4 border-blue-300 pl-4 py-3 bg-slate-50 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-slate-900">
                            {tribute.author?.display_name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(tribute.created_at).toLocaleDateString()}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                            tribute.tribute_type === 'photo'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {tribute.tribute_type === 'photo' ? '📸 Photo' : tribute.tribute_type}
                          </span>
                        </div>
                        {tribute.photo_url && (
                          <img
                            src={tribute.photo_url}
                            alt="Tribute photo"
                            className="w-full max-w-sm h-48 object-cover rounded-lg mb-2 border border-slate-200"
                          />
                        )}
                        {tribute.content && (
                          <p className="text-slate-700 whitespace-pre-wrap">{tribute.content}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Light a Candle */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
              <style>{`
                @keyframes flicker {
                  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; }
                  20%, 24%, 55% { opacity: 0.4; }
                }
                @keyframes glow {
                  0%, 100% { box-shadow: 0 0 10px rgba(217, 119, 6, 0.3), 0 0 20px rgba(251, 146, 60, 0.2); }
                  50% { box-shadow: 0 0 20px rgba(217, 119, 6, 0.6), 0 0 40px rgba(251, 146, 60, 0.4); }
                }
                @keyframes float {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-8px); }
                }
                @keyframes sparkle {
                  0%, 100% { opacity: 0; transform: scale(0); }
                  50% { opacity: 1; transform: scale(1); }
                }
                .candle-icon {
                  display: inline-block;
                  animation: float 3s ease-in-out infinite;
                }
                .candle-lit {
                  animation: flicker 3s linear infinite, glow 2s ease-in-out infinite !important;
                }
                .light-button:active {
                  transform: scale(0.98);
                }
                .sparkle {
                  position: absolute;
                  animation: sparkle 0.6s ease-out forwards;
                  pointer-events: none;
                }
              `}</style>

              <div className="text-center mb-4">
                <div className="relative inline-block text-5xl mb-2">
                  <div className={`candle-icon ${candles.length > 0 ? 'candle-lit' : ''}`}>
                    🕯️
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Light a Candle</h3>
                <p className="text-sm text-amber-700 font-medium">
                  {candles.length} {candles.length === 1 ? 'candle' : 'candles'} burning
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Each candle burns for 1 hour
                </p>
              </div>

              <form onSubmit={lightCandle} className="space-y-3">
                <textarea
                  value={candleMessage}
                  onChange={(e) => setCandleMessage(e.target.value)}
                  rows={2}
                  placeholder="Optional message..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-md text-sm focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="submit"
                  disabled={candleSubmitting}
                  className="light-button w-full px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {candleSubmitting ? '🕯️ Lighting...' : '🕯️ Light a Candle'}
                </button>
              </form>

              {/* Recent Candles */}
              {candles.length > 0 && (
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <p className="text-xs font-medium text-amber-900 mb-3">✨ Recently Lit:</p>
                  <div className="space-y-2">
                    {candles.slice(0, 5).map((candle, idx) => (
                      <div
                        key={candle.id}
                        className="text-xs bg-white bg-opacity-70 rounded-lg p-3 border-l-2 border-amber-400 hover:bg-opacity-100 transition"
                        style={{
                          animation: `slideIn 0.5s ease-out ${idx * 0.1}s both`,
                        }}
                      >
                        <style>{`
                          @keyframes slideIn {
                            from {
                              opacity: 0;
                              transform: translateX(-10px);
                            }
                            to {
                              opacity: 1;
                              transform: translateX(0);
                            }
                          }
                        `}</style>
                        <p className="font-medium text-amber-900">
                          🕯️ {candle.lighter?.display_name || 'Anonymous'}
                        </p>
                        {candle.message && (
                          <p className="text-slate-700 italic mt-1">"{candle.message}"</p>
                        )}
                        <p className="text-slate-500 text-xs mt-1">
                          {new Date(candle.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Service Links */}
            {memorial.service_links && memorial.service_links.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">Service & Support</h3>
                <div className="space-y-3">
                  {memorial.service_links.map((link, index) => {
                    const linkIcons: Record<string, string> = {
                      gofundme: '💰',
                      memorial_fund: '🎗️',
                      funeral_service: '⚱️',
                      charity: '❤️',
                      other: '🔗'
                    }
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xl">{linkIcons[link.type] || '🔗'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm mb-1">{link.title}</p>
                            <p className="text-xs text-slate-500 truncate">{link.url}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                {link.type.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Gift a Memorial Item */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200 p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🎁</div>
                <h3 className="text-lg font-bold text-slate-900">Offer a Small Tribute</h3>
                <p className="text-sm text-slate-600 mt-1">
                  A gentle way to show care, if you wish.
                </p>
              </div>
              <Link
                href={`/store?memorial=${params.id}`}
                className="block w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium text-sm text-center"
              >
                Browse Memorial Store
              </Link>
            </div>

            {/* Purchased Items */}
            {storeItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-3">
                  Memorial Gifts ({storeItems.length})
                </h3>
                <div className="space-y-3">
                  {storeItems.slice(0, 6).map((item) => (
                    <div key={item.id} className="flex gap-3 p-2 bg-slate-50 rounded-lg">
                      <img
                        src={item.preview_image_url}
                        alt={item.product_name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-slate-600">
                          From {item.purchaser_name}
                        </p>
                        {item.dedication_message && (
                          <p className="text-xs text-slate-500 italic mt-1 line-clamp-2">
                            "{item.dedication_message}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {storeItems.length > 6 && (
                    <p className="text-center text-sm text-slate-500">
                      +{storeItems.length - 6} more gifts
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
