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

export interface ConversationWithParticipant extends Conversation {
  other_user?: {
    id: string
    display_name: string | null
    profile_image_url: string | null
    verification_status: string
  }
  participant_info?: ConversationParticipant
}

export interface MessageWithAuthor extends Message {
  sender?: {
    id: string
    display_name: string | null
    profile_image_url: string | null
    verification_status: string
  }
}
