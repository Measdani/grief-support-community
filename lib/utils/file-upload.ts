import { createClient } from '@/lib/supabase/client'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, WEBP, or GIF image.'
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    }
  }

  return { valid: true }
}

export async function uploadMemorialPhoto(
  file: File,
  userId: string,
  memorialId: string,
  photoType: 'profile' | 'cover' | 'gallery' | 'tribute'
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate file
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${photoType}-${timestamp}.${fileExt}`
    const filePath = `${userId}/${memorialId}/${fileName}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('memorial-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('memorial-photos')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload file'
    }
  }
}

export async function deleteMemorialPhoto(filePath: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.storage
      .from('memorial-photos')
      .remove([filePath])

    return !error
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Product asset upload
export async function uploadProductAsset(
  file: File,
  productId: string,
  assetType: 'preview' | 'digital'
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate file
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  try {
    // Generate filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${assetType}.${fileExt}`
    const filePath = `${productId}/${fileName}`

    // Upload to storage
    const { data, error } = await supabase.storage
      .from('product-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwriting
      })

    if (error) throw error

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-assets')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrl,
      path: filePath
    }
  } catch (error: any) {
    console.error('Product upload error:', error)
    return {
      success: false,
      error: error.message || 'Failed to upload file'
    }
  }
}

export async function deleteProductAsset(filePath: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.storage
      .from('product-assets')
      .remove([filePath])

    return !error
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Client-side image preview generator
export function generateImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
