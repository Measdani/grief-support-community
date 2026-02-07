-- Update RLS Policies for Subscription Tier Gating
-- Restricts premium features to paid subscribers and background-checked users

-- ============================================
-- Conversations: Require Premium + Permission
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Create new policy requiring premium tier and messaging permissions
CREATE POLICY "Premium users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = participant_one OR auth.uid() = participant_two) AND
    -- Require premium tier
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND subscription_tier = 'premium'
    ) AND
    -- Ensure not blocked
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = participant_one AND blocked_id = participant_two)
         OR (blocker_id = participant_two AND blocked_id = participant_one)
    ) AND
    -- Check messaging permissions
    (
      -- Friends can always message
      EXISTS (
        SELECT 1 FROM public.user_connections
        WHERE status = 'accepted'
          AND ((requester_id = participant_one AND addressee_id = participant_two)
            OR (requester_id = participant_two AND addressee_id = participant_one))
      )
      OR
      -- Same gathering attendees (if preference allows)
      (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = (CASE WHEN auth.uid() = participant_one THEN participant_two ELSE participant_one END)
            AND p.messaging_preference IN ('friends_and_gatherings', 'allow_requests')
        )
        AND EXISTS (
          SELECT 1 FROM public.meetup_rsvps r1
          JOIN public.meetup_rsvps r2 ON r1.meetup_id = r2.meetup_id
          WHERE r1.user_id = participant_one
            AND r2.user_id = participant_two
            AND r1.status = 'attending'
            AND r2.status = 'attending'
        )
      )
      OR
      -- Message request accepted
      EXISTS (
        SELECT 1 FROM public.message_requests
        WHERE status = 'accepted'
          AND ((requester_id = participant_one AND recipient_id = participant_two)
            OR (requester_id = participant_two AND recipient_id = participant_one))
      )
    )
  );

-- ============================================
-- User Connections: Require Premium
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Users can send connection requests" ON public.user_connections;

-- Create new policy requiring premium tier
CREATE POLICY "Premium users can send connection requests"
  ON public.user_connections FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    -- Require premium tier
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND subscription_tier = 'premium'
    ) AND
    -- Can't request if blocked
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = requester_id AND blocked_id = addressee_id)
         OR (blocker_id = addressee_id AND blocked_id = requester_id)
    )
  );

-- ============================================
-- Meetup RSVPs: Require Premium
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Authenticated users can RSVP" ON public.meetup_rsvps;

-- Create new policy requiring premium tier
CREATE POLICY "Premium users can RSVP to meetups"
  ON public.meetup_rsvps FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND subscription_tier = 'premium'
    )
  );

-- ============================================
-- Meetup Creation: Require Background Check
-- ============================================

-- Drop old policy
DROP POLICY IF EXISTS "Verified organizers can create meetups" ON public.meetups;

-- Create new policy requiring background check approval
CREATE POLICY "Background-checked users can create meetups"
  ON public.meetups FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND background_check_status = 'approved'
        AND (background_check_expires_at IS NULL OR background_check_expires_at > NOW())
    )
  );

-- ============================================
-- Comments
-- ============================================
COMMENT ON POLICY "Premium users can create conversations" ON public.conversations
  IS 'Requires premium tier and messaging permissions (friends, shared gatherings, or accepted request)';

COMMENT ON POLICY "Premium users can send connection requests" ON public.user_connections
  IS 'Friend connections require premium tier subscription';

COMMENT ON POLICY "Premium users can RSVP to meetups" ON public.meetup_rsvps
  IS 'RSVP to gatherings requires premium tier subscription';

COMMENT ON POLICY "Background-checked users can create meetups" ON public.meetups
  IS 'Creating/hosting gatherings requires approved background check (valid up to 1 year)';
