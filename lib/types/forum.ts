export interface ForumCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  color: string | null
  display_order: number
  is_active: boolean
  topic_count: number
  post_count: number
  created_at: string
  updated_at: string
}

export interface ForumTopic {
  id: string
  category_id: string
  author_id: string
  title: string
  slug: string
  is_pinned: boolean
  is_locked: boolean
  is_announcement: boolean
  view_count: number
  reply_count: number
  last_post_at: string
  last_post_by: string | null
  created_at: string
  updated_at: string
}

export interface ForumPost {
  id: string
  topic_id: string
  author_id: string
  content: string
  parent_post_id: string | null
  is_edited: boolean
  edited_at: string | null
  is_hidden: boolean
  hidden_reason: string | null
  hidden_by: string | null
  like_count: number
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface ForumTopicWithAuthor extends ForumTopic {
  author?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
  category?: ForumCategory
  last_post_author?: {
    display_name: string | null
  }
}

export interface ForumPostWithAuthor extends ForumPost {
  author?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
}

export interface ForumCategoryWithLatestTopic extends ForumCategory {
  latest_topic?: {
    title: string
    slug: string
    last_post_at: string
  }
}
