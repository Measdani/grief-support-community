// Loss categories for meetup targeting
export type LossCategory =
  | 'spouse_partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'friend'
  | 'pet'
  | 'pregnancy_infant'
  | 'suicide'
  | 'overdose'
  | 'terminal_illness'
  | 'sudden_loss'
  | 'general'

export type MeetupFormat = 'in_person' | 'virtual' | 'hybrid'
export type MeetupStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type RsvpStatus = 'attending' | 'maybe' | 'declined' | 'waitlist'

export interface Meetup {
  id: string
  organizer_id: string
  title: string
  description: string
  loss_categories: LossCategory[]
  format: MeetupFormat
  start_time: string
  end_time: string
  timezone: string
  location_name: string | null
  location_address: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  location_country: string
  location_lat: number | null
  location_lng: number | null
  virtual_link: string | null
  virtual_platform: string | null
  virtual_meeting_id: string | null
  virtual_passcode: string | null
  max_attendees: number | null
  requires_approval: boolean
  registration_deadline: string | null
  status: MeetupStatus
  attendee_count: number
  is_recurring: boolean
  recurrence_rule: string | null
  parent_meetup_id: string | null
  cover_image_url: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
}

export interface MeetupRsvp {
  id: string
  meetup_id: string
  user_id: string
  status: RsvpStatus
  approved_at: string | null
  approved_by: string | null
  message: string | null
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export interface MeetupComment {
  id: string
  meetup_id: string
  author_id: string
  content: string
  is_pinned: boolean
  is_organizer_update: boolean
  created_at: string
  updated_at: string
}

// Extended types with relations
export interface MeetupWithOrganizer extends Meetup {
  organizer?: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
    verification_status: string
  }
}

export interface MeetupRsvpWithUser extends MeetupRsvp {
  user?: {
    id: string
    display_name: string | null
    email: string
    avatar_url: string | null
  }
}

export interface MeetupCommentWithAuthor extends MeetupComment {
  author?: {
    id: string
    display_name: string | null
    avatar_url: string | null
  }
}

// Labels for UI display
export const lossCategoryLabels: Record<LossCategory, string> = {
  spouse_partner: 'Loss of Spouse/Partner',
  parent: 'Loss of Parent',
  child: 'Loss of Child',
  sibling: 'Loss of Sibling',
  friend: 'Loss of Friend',
  pet: 'Loss of Pet',
  pregnancy_infant: 'Pregnancy/Infant Loss',
  suicide: 'Loss to Suicide',
  overdose: 'Loss to Overdose',
  terminal_illness: 'Loss to Terminal Illness',
  sudden_loss: 'Sudden/Unexpected Loss',
  general: 'General Grief Support',
}

export const meetupFormatLabels: Record<MeetupFormat, string> = {
  in_person: 'In-Person',
  virtual: 'Virtual',
  hybrid: 'Hybrid',
}

export const meetupFormatIcons: Record<MeetupFormat, string> = {
  in_person: '📍',
  virtual: '💻',
  hybrid: '🔄',
}

export const rsvpStatusLabels: Record<RsvpStatus, string> = {
  attending: 'Attending',
  maybe: 'Maybe',
  declined: 'Not Attending',
  waitlist: 'Waitlist',
}
