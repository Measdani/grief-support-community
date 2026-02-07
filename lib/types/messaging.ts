export interface Conversation {
  id: string
  participant_one: string
  participant_two: string
  last_message_at: string
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  deleted_by_sender: boolean
  deleted_by_recipient: boolean
  created_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  is_muted: boolean
  is_archived: boolean
  unread_count: number
  last_read_at: string | null
  created_at: string
  updated_at: string
}

export interface BlockedUser {
  id: string
  blocker_id: string
  blocked_id: string
  reason: string | null
  created_at: string
}

// Extended types
export interface ConversationWithParticipant extends Conversation {
  other_user?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
  unread_count?: number
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

// Connection types
export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'blocked'

export interface UserConnection {
  id: string
  requester_id: string
  addressee_id: string
  status: ConnectionStatus
  message: string | null
  requested_at: string
  responded_at: string | null
  created_at: string
  updated_at: string
}

export interface UserConnectionWithUser extends UserConnection {
  requester?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
  addressee?: {
    id: string
    display_name: string | null
    avatar_url: string | null
    verification_status: string
  }
}

// Report types
export type ReportType =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'impersonation'
  | 'scam'
  | 'self_harm'
  | 'misinformation'
  | 'other'

export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'resolved_action_taken'
  | 'resolved_no_action'
  | 'dismissed'

export type ReportableType =
  | 'user'
  | 'post'
  | 'message'
  | 'memorial'
  | 'tribute'
  | 'meetup'
  | 'comment'

export interface Report {
  id: string
  reporter_id: string
  reportable_type: ReportableType
  reportable_id: string
  report_type: ReportType
  description: string
  evidence_urls: string[] | null
  status: ReportStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  action_taken: string | null
  created_at: string
  updated_at: string
}

export const reportTypeLabels: Record<ReportType, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate Speech',
  inappropriate_content: 'Inappropriate Content',
  impersonation: 'Impersonation',
  scam: 'Scam or Fraud',
  self_harm: 'Self-Harm or Suicide',
  misinformation: 'Misinformation',
  other: 'Other',
}
