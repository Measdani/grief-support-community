export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'community'

export type SponsorStatus = 'active' | 'pending' | 'paused' | 'expired'

export type AdPlacementLocation =
  | 'homepage_banner'
  | 'resources_sidebar'
  | 'forums_banner'
  | 'meetups_sidebar'
  | 'newsletter'
  | 'sponsors_page'

export interface Sponsor {
  id: string
  company_name: string
  slug: string
  description: string | null
  logo_url: string | null
  website_url: string
  contact_email: string
  contact_name: string | null
  tier: SponsorTier
  status: SponsorStatus
  start_date: string | null
  end_date: string | null
  monthly_rate_cents: number | null
  display_order: number
  show_on_homepage: boolean
  tagline: string | null
  categories: string[]
  total_impressions: number
  total_clicks: number
  notes: string | null
  created_at: string
  updated_at: string
  approved_by: string | null
  approved_at: string | null
}

export interface AdPlacement {
  id: string
  sponsor_id: string
  location: AdPlacementLocation
  is_active: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  sponsor?: Sponsor
}

export interface AdvertisingInquiry {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  phone: string | null
  website_url: string | null
  company_description: string
  interested_tiers: SponsorTier[]
  interested_placements: AdPlacementLocation[]
  budget_range: string | null
  message: string
  status: 'new' | 'contacted' | 'negotiating' | 'converted' | 'declined'
  admin_notes: string | null
  responded_by: string | null
  responded_at: string | null
  created_at: string
}

// Tier information for display
export const sponsorTierInfo: Record<SponsorTier, {
  label: string
  price: string
  color: string
  benefits: string[]
}> = {
  platinum: {
    label: 'Platinum Partner',
    price: '$2,000/month',
    color: 'bg-gradient-to-r from-slate-300 to-slate-400',
    benefits: [
      'Homepage banner placement',
      'Featured in all email newsletters',
      'Dedicated sponsor spotlight article',
      'Logo on all pages',
      'Priority support',
    ],
  },
  gold: {
    label: 'Gold Partner',
    price: '$1,000/month',
    color: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    benefits: [
      'Resources page sidebar placement',
      'Monthly newsletter mention',
      'Logo on sponsors page',
      'Social media shoutout',
    ],
  },
  silver: {
    label: 'Silver Partner',
    price: '$500/month',
    color: 'bg-gradient-to-r from-gray-300 to-gray-400',
    benefits: [
      'Forums or meetups sidebar placement',
      'Quarterly newsletter mention',
      'Logo on sponsors page',
    ],
  },
  bronze: {
    label: 'Bronze Partner',
    price: '$200/month',
    color: 'bg-gradient-to-r from-orange-400 to-orange-500',
    benefits: [
      'Logo on sponsors page',
      'Website link',
    ],
  },
  community: {
    label: 'Community Partner',
    price: 'Free / In-kind',
    color: 'bg-gradient-to-r from-green-400 to-green-500',
    benefits: [
      'Logo on sponsors page',
      'For nonprofits and community organizations',
    ],
  },
}

export const placementLabels: Record<AdPlacementLocation, string> = {
  homepage_banner: 'Homepage Banner',
  resources_sidebar: 'Resources Sidebar',
  forums_banner: 'Forums Banner',
  meetups_sidebar: 'Meetups Sidebar',
  newsletter: 'Email Newsletter',
  sponsors_page: 'Sponsors Page',
}
