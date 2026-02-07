/**
 * Slug Generation & Validation for Memorial URLs
 * Generates URL-safe slugs from memorial names with duplicate prevention
 */

const RESERVED_WORDS = [
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
  'memorial',
  'memorials',
  'profile',
  'profiles',
  'share',
]

/**
 * Validates a memorial slug against reserved words and format rules
 * @param slug - The slug to validate
 * @returns true if valid, false otherwise
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false

  // Check length
  if (slug.length === 0 || slug.length > 100) return false

  // Check format: lowercase alphanumeric and hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) return false

  // Check for leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) return false

  // Check against reserved words
  const slugLower = slug.toLowerCase()
  if (RESERVED_WORDS.includes(slugLower)) return false

  return true
}

/**
 * Generates a URL-safe slug from a string
 * @param text - The text to convert to a slug
 * @returns A URL-safe slug
 */
export function generateSlugFromText(text: string): string {
  if (!text || typeof text !== 'string') return ''

  return text
    .toLowerCase() // Convert to lowercase
    .trim() // Remove leading/trailing whitespace
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters (keep alphanumeric, spaces, hyphens)
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug by calling the Supabase function
 * Used when creating new memorials
 * @param memorialName - The name to generate slug from
 * @param supabase - Supabase client instance
 * @returns The generated unique slug
 */
export async function generateUniqueSlug(
  memorialName: string,
  supabase: any
): Promise<string> {
  try {
    // Call the Supabase database function that generates unique slugs
    const { data, error } = await supabase.rpc('generate_memorial_slug', {
      base_name: memorialName,
    })

    if (error) {
      console.error('Error generating unique slug:', error)
      // Fallback: generate locally
      return generateSlugFromText(memorialName)
    }

    return data || generateSlugFromText(memorialName)
  } catch (err) {
    console.error('Exception generating unique slug:', err)
    return generateSlugFromText(memorialName)
  }
}

/**
 * Checks if a custom slug is available (not taken)
 * @param slug - The slug to check
 * @param supabase - Supabase client instance
 * @param currentMemorialId - Optional: exclude current memorial from check
 * @returns true if available, false if taken
 */
export async function isSlugAvailable(
  slug: string,
  supabase: any,
  currentMemorialId?: string
): Promise<boolean> {
  // First validate the slug format
  if (!validateSlug(slug)) return false

  try {
    let query = supabase.from('memorials').select('id').eq('slug', slug)

    // If updating an existing memorial, exclude it from the check
    if (currentMemorialId) {
      query = query.neq('id', currentMemorialId)
    }

    const { data, error } = await query.limit(1)

    if (error) {
      console.error('Error checking slug availability:', error)
      return false
    }

    // Slug is available if no results found
    return !data || data.length === 0
  } catch (err) {
    console.error('Exception checking slug availability:', err)
    return false
  }
}

/**
 * Generates memorial URL from slug
 * @param slug - The memorial slug
 * @param domain - Optional: override domain (defaults to NEXT_PUBLIC_SITE_URL)
 * @returns The full memorial URL
 */
export function getMemorialUrl(slug: string, domain?: string): string {
  const baseUrl = domain || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/memorial/${slug}`
}
