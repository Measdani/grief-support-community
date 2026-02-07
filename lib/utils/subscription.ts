import { createClient } from '@/lib/supabase/client'

/**
 * Check if a user has premium subscription access
 * @param userId - The user ID to check
 * @returns true if user has active premium subscription
 */
export async function checkPremiumAccess(userId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return false
    }

    return (
      profile.subscription_tier === 'premium' &&
      profile.subscription_status === 'active'
    )
  } catch (error) {
    console.error('Error checking premium access:', error)
    return false
  }
}

/**
 * Get the user's background check status
 * @param userId - The user ID to check
 * @returns Background check status or null if not found
 */
export async function checkBackgroundCheckStatus(userId: string): Promise<{
  status: string
  approvedAt: string | null
  expiresAt: string | null
  isExpired: boolean
  notes: string | null
} | null> {
  try {
    const supabase = createClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(
        'background_check_status, background_check_approved_at, background_check_expires_at, background_check_notes'
      )
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return null
    }

    const expiresAt = profile.background_check_expires_at
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false

    return {
      status: profile.background_check_status || 'not_started',
      approvedAt: profile.background_check_approved_at,
      expiresAt: profile.background_check_expires_at,
      isExpired,
      notes: profile.background_check_notes,
    }
  } catch (error) {
    console.error('Error checking background check status:', error)
    return null
  }
}

/**
 * Check if a user can host gatherings (premium + valid background check)
 * @param userId - The user ID to check
 * @returns true if user meets hosting requirements
 */
export async function canHostGatherings(userId: string): Promise<boolean> {
  try {
    // Must be premium
    const isPremium = await checkPremiumAccess(userId)
    if (!isPremium) {
      return false
    }

    // Must have approved background check that hasn't expired
    const bgCheck = await checkBackgroundCheckStatus(userId)
    if (!bgCheck) {
      return false
    }

    return bgCheck.status === 'approved' && !bgCheck.isExpired
  } catch (error) {
    console.error('Error checking hosting eligibility:', error)
    return false
  }
}

/**
 * Format a subscription status for display
 * @param status - Raw subscription status from database
 * @returns Human-readable status string
 */
export function formatSubscriptionStatus(
  status: string | null | undefined
): string {
  if (!status) return 'Unknown'

  const statusMap: Record<string, string> = {
    active: 'Active',
    cancelled: 'Cancelled',
    past_due: 'Past Due',
    incomplete: 'Incomplete',
  }

  return statusMap[status] || status
}

/**
 * Format a background check status for display
 * @param status - Raw background check status from database
 * @returns Human-readable status string
 */
export function formatBackgroundCheckStatus(
  status: string | null | undefined
): string {
  if (!status) return 'Not Started'

  const statusMap: Record<string, string> = {
    not_started: 'Not Started',
    pending: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
  }

  return statusMap[status] || status
}

/**
 * Get the badge color for a subscription status
 * @param status - Subscription status
 * @returns Tailwind CSS classes
 */
export function getSubscriptionStatusColor(
  status: string | null | undefined
): string {
  if (!status) return 'bg-slate-100 text-slate-800'

  const colorMap: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-slate-100 text-slate-800',
    past_due: 'bg-yellow-100 text-yellow-800',
    incomplete: 'bg-red-100 text-red-800',
  }

  return colorMap[status] || 'bg-slate-100 text-slate-800'
}

/**
 * Get the badge color for a background check status
 * @param status - Background check status
 * @returns Tailwind CSS classes
 */
export function getBackgroundCheckStatusColor(
  status: string | null | undefined
): string {
  if (!status) return 'bg-slate-100 text-slate-800'

  const colorMap: Record<string, string> = {
    not_started: 'bg-slate-100 text-slate-800',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
  }

  return colorMap[status] || 'bg-slate-100 text-slate-800'
}
