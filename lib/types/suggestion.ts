export type SuggestionStatus =
  | 'submitted'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'declined'

export type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical'

export type SuggestionCategory =
  | 'memorials'
  | 'forums'
  | 'meetups'
  | 'messaging'
  | 'resources'
  | 'store'
  | 'general'
  | 'other'

export interface FeatureSuggestion {
  id: string
  submitted_by: string
  title: string
  description: string
  category: string | null
  status: SuggestionStatus
  priority: SuggestionPriority
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  upvote_count: number
  created_at: string
  updated_at: string
}

export interface FeatureSuggestionWithSubmitter extends FeatureSuggestion {
  submitter?: {
    display_name: string | null
    email: string
  }
}

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined'
}

export const SUGGESTION_STATUS_COLORS: Record<SuggestionStatus, string> = {
  submitted: 'bg-slate-100 text-slate-800',
  under_review: 'bg-blue-100 text-blue-800',
  planned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800'
}
