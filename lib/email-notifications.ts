export type EmailTemplate =
  | 'welcome'
  | 'organizer_approved'
  | 'organizer_rejected'
  | 'meetup_created'
  | 'new_message'
  | 'forum_reply'
  | 'account_verified'

interface EmailNotification {
  to: string
  templateId: EmailTemplate
  data: Record<string, any>
}

async function sendEmail(notification: EmailNotification) {
  try {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    })

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error sending email notification:', error)
    throw error
  }
}

export async function notifyOrganizerApproved(email: string, displayName: string) {
  return sendEmail({
    to: email,
    templateId: 'organizer_approved',
    data: { displayName },
  })
}

export async function notifyOrganizerRejected(email: string, displayName: string, reason: string) {
  return sendEmail({
    to: email,
    templateId: 'organizer_rejected',
    data: { displayName, reason },
  })
}

export async function notifyMeetupCreated(email: string, meetupTitle: string, meetupId: string) {
  return sendEmail({
    to: email,
    templateId: 'meetup_created',
    data: { meetupTitle, meetupId },
  })
}

export async function notifyNewMessage(email: string, senderName: string, senderId: string) {
  return sendEmail({
    to: email,
    templateId: 'new_message',
    data: { senderName, senderId },
  })
}

export async function notifyForumReply(email: string, topicTitle: string, topicId: string) {
  return sendEmail({
    to: email,
    templateId: 'forum_reply',
    data: { topicTitle, topicId },
  })
}

export async function notifyAccountVerified(email: string, displayName: string) {
  return sendEmail({
    to: email,
    templateId: 'account_verified',
    data: { displayName },
  })
}

export async function notifyWelcome(email: string, displayName: string) {
  return sendEmail({
    to: email,
    templateId: 'welcome',
    data: { displayName },
  })
}
