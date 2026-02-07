export type ResourceType =
  | 'article'
  | 'hotline'
  | 'organization'
  | 'book'
  | 'video'
  | 'podcast'
  | 'guide'

export type ResourceCategory =
  | 'understanding_grief'
  | 'coping_strategies'
  | 'self_care'
  | 'supporting_others'
  | 'children_grief'
  | 'complicated_grief'
  | 'suicide_loss'
  | 'substance_loss'
  | 'pet_loss'
  | 'pregnancy_loss'
  | 'crisis_support'
  | 'professional_help'
  | 'spirituality'
  | 'memorial_planning'

export interface Resource {
  id: string
  title: string
  description: string
  content: string | null
  resource_type: ResourceType
  categories: ResourceCategory[]
  tags: string[] | null
  external_url: string | null
  phone_number: string | null
  is_24_7: boolean
  thumbnail_url: string | null
  author: string | null
  source: string | null
  published_date: string | null
  loss_categories: string[] | null
  is_featured: boolean
  is_published: boolean
  display_order: number
  view_count: number
  helpful_count: number
  created_at: string
  updated_at: string
}

export interface ResourceSubmission {
  id: string
  title: string
  description: string
  resource_type: ResourceType
  categories: ResourceCategory[]
  external_url: string | null
  phone_number: string | null
  author: string | null
  source: string | null
  submitter_name: string
  submitter_email: string
  submitter_notes: string | null
  created_at: string
}

// Labels for UI
export const resourceTypeLabels: Record<ResourceType, string> = {
  article: 'Article',
  hotline: 'Hotline',
  organization: 'Organization',
  book: 'Book',
  video: 'Video',
  podcast: 'Podcast',
  guide: 'Guide',
}

export const resourceTypeIcons: Record<ResourceType, string> = {
  article: '📄',
  hotline: '📞',
  organization: '🏢',
  book: '📚',
  video: '🎬',
  podcast: '🎙️',
  guide: '📋',
}

export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  understanding_grief: 'Understanding Grief',
  coping_strategies: 'Coping Strategies',
  self_care: 'Self-Care',
  supporting_others: 'Supporting Others',
  children_grief: 'Children & Grief',
  complicated_grief: 'Complicated Grief',
  suicide_loss: 'Suicide Loss',
  substance_loss: 'Substance Loss',
  pet_loss: 'Pet Loss',
  pregnancy_loss: 'Pregnancy Loss',
  crisis_support: 'Crisis Support',
  professional_help: 'Professional Help',
  spirituality: 'Spirituality & Faith',
  memorial_planning: 'Memorial Planning',
}
