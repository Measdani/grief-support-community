// User Verification Types

export type VerificationStatus =
  | 'unverified'
  | 'email_verified'
  | 'id_verified'
  | 'meetup_organizer'

export type ProfileVisibility = 'public' | 'verified_members' | 'private'

export type VerificationRequestType = 'id_verification' | 'meetup_organizer'

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  display_name: string | null
  bio: string | null
  profile_image_url: string | null

  // Emergency Contact
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null

  // Verification
  verification_status: VerificationStatus
  email_verified_at: string | null
  id_verified_at: string | null
  meetup_organizer_verified_at: string | null

  // ID Verification
  id_verification_requested_at: string | null
  id_verification_notes: string | null
  id_verification_method: string | null

  // Safety
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null

  // Privacy
  profile_visibility: ProfileVisibility
  allow_messages: boolean
  show_in_directory: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

export interface VerificationRequest {
  id: string
  user_id: string
  request_type: VerificationRequestType
  status: VerificationRequestStatus

  // Submitted info
  submitted_info: Record<string, unknown> | null
  submitted_documents: string[] | null

  // Admin review
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  rejection_reason: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface UserActivityLog {
  id: string
  user_id: string
  action: string
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Helper types for verification levels
export interface VerificationLevel {
  status: VerificationStatus
  label: string
  description: string
  permissions: {
    canBrowse: boolean
    canPost: boolean
    canMessage: boolean
    canJoinMeetups: boolean
    canCreateMeetups: boolean
  }
  badge: {
    icon: string
    color: string
  }
}

// Verification level definitions
export const VERIFICATION_LEVELS: Record<VerificationStatus, VerificationLevel> = {
  unverified: {
    status: 'unverified',
    label: 'Unverified',
    description: 'Complete your profile and verify your email to access more features',
    permissions: {
      canBrowse: true,
      canPost: false,
      canMessage: false,
      canJoinMeetups: false,
      canCreateMeetups: false,
    },
    badge: {
      icon: '⏳',
      color: 'gray',
    },
  },
  email_verified: {
    status: 'email_verified',
    label: 'Email Verified',
    description: 'Complete ID verification to join meetups and connect with members',
    permissions: {
      canBrowse: true,
      canPost: true,
      canMessage: false,
      canJoinMeetups: false,
      canCreateMeetups: false,
    },
    badge: {
      icon: '📧',
      color: 'blue',
    },
  },
  id_verified: {
    status: 'id_verified',
    label: 'Verified Member',
    description: 'Full access to community features',
    permissions: {
      canBrowse: true,
      canPost: true,
      canMessage: true,
      canJoinMeetups: true,
      canCreateMeetups: false,
    },
    badge: {
      icon: '✅',
      color: 'green',
    },
  },
  meetup_organizer: {
    status: 'meetup_organizer',
    label: 'Trusted Organizer',
    description: 'Can create and host community meetups',
    permissions: {
      canBrowse: true,
      canPost: true,
      canMessage: true,
      canJoinMeetups: true,
      canCreateMeetups: true,
    },
    badge: {
      icon: '⭐',
      color: 'purple',
    },
  },
}

// Helper function to check permissions
export function hasPermission(
  status: VerificationStatus,
  permission: keyof VerificationLevel['permissions']
): boolean {
  return VERIFICATION_LEVELS[status].permissions[permission]
}

// Helper function to get verification badge
export function getVerificationBadge(status: VerificationStatus) {
  return VERIFICATION_LEVELS[status].badge
}

// Helper function to get next verification step
export function getNextVerificationStep(
  status: VerificationStatus
): string | null {
  switch (status) {
    case 'unverified':
      return 'Verify your email address'
    case 'email_verified':
      return 'Submit ID verification to unlock full access'
    case 'id_verified':
      return 'Apply to become a meetup organizer'
    case 'meetup_organizer':
      return null // Highest level
    default:
      return null
  }
}
