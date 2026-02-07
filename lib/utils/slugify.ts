/**
 * Generates a URL-safe slug from a text string
 * Converts to lowercase, removes special characters, and limits length
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

/**
 * Generates a unique slug for a topic within a category
 * Checks database for existing slugs and appends a counter if needed
 */
export async function generateUniqueSlug(
  title: string,
  categoryId: string,
  supabase: any
): Promise<string> {
  let slug = slugify(title)
  let counter = 1

  // Check for duplicates in same category
  while (true) {
    const { data, error } = await supabase
      .from('forum_topics')
      .select('id')
      .eq('category_id', categoryId)
      .eq('slug', slug)
      .single()

    // If no error and no data found, slug is unique
    if (!data) break

    // If there's an error other than "no rows", log it
    if (error && error.code !== 'PGRST116') {
      console.warn('Error checking slug uniqueness:', error)
      break
    }

    // Slug exists, append counter
    slug = `${slugify(title)}-${counter++}`
  }

  return slug
}
