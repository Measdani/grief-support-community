-- ============================================
-- User Connections (Friend System) & Reporting
-- Add friends, accept requests, report users
-- ============================================

-- Connection status enum
CREATE TYPE connection_status AS ENUM (
  'pending',    -- Request sent, awaiting response
  'accepted',   -- Both users are connected
  'declined',   -- Request was declined
  'blocked'     -- User blocked (supersedes blocked_users table for connections)
);

-- User Connections (friend requests & friendships)
CREATE TABLE IF NOT EXISTS public.user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user who initiated the request
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- The user receiving the request
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status connection_status NOT NULL DEFAULT 'pending',

  -- Optional message with request
  message TEXT,

  -- Timestamps
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate requests
  UNIQUE(requester_id, addressee_id),

  -- Can't friend yourself
  CHECK (requester_id != addressee_id)
);

-- Report types
CREATE TYPE report_type AS ENUM (
  'spam',
  'harassment',
  'hate_speech',
  'inappropriate_content',
  'impersonation',
  'scam',
  'self_harm',
  'misinformation',
  'other'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'under_review',
  'resolved_action_taken',
  'resolved_no_action',
  'dismissed'
);

CREATE TYPE reportable_type AS ENUM (
  'user',
  'post',
  'message',
  'memorial',
  'tribute',
  'meetup',
  'comment'
);

-- Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is reporting
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- What is being reported
  reportable_type reportable_type NOT NULL,
  reportable_id UUID NOT NULL, -- ID of the reported item

  -- Report details
  report_type report_type NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- Screenshots, links, etc.

  -- Status tracking
  status report_status DEFAULT 'pending',

  -- Admin handling
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  action_taken TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User warnings/strikes (for admin to track)
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES public.profiles(id),

  reason TEXT NOT NULL,
  report_id UUID REFERENCES public.reports(id), -- Link to report if applicable

  -- Severity
  severity TEXT NOT NULL DEFAULT 'warning', -- 'warning', 'strike', 'suspension', 'ban'

  -- For temporary suspensions
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User Connections
CREATE POLICY "Users can view their own connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send connection requests"
  ON public.user_connections FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    -- Must be verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status != 'unverified'
    ) AND
    -- Can't request if blocked
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = requester_id AND blocked_id = addressee_id)
         OR (blocker_id = addressee_id AND blocked_id = requester_id)
    )
  );

CREATE POLICY "Users can update connections they're part of"
  ON public.user_connections FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own requests"
  ON public.user_connections FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- RLS Policies: Reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Verified users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status != 'unverified'
    )
  );

-- RLS Policies: Warnings (admin-only via service role, but users can see their own)
CREATE POLICY "Users can view own warnings"
  ON public.user_warnings FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_connections_requester ON public.user_connections(requester_id);
CREATE INDEX idx_user_connections_addressee ON public.user_connections(addressee_id);
CREATE INDEX idx_user_connections_status ON public.user_connections(status);
CREATE INDEX idx_user_connections_accepted ON public.user_connections(requester_id, addressee_id) WHERE status = 'accepted';
CREATE INDEX idx_reports_reporter ON public.reports(reporter_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_type ON public.reports(reportable_type, reportable_id);
CREATE INDEX idx_user_warnings_user ON public.user_warnings(user_id);

-- Triggers
CREATE TRIGGER update_user_connections_updated_at
  BEFORE UPDATE ON public.user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to check if two users are connected
CREATE OR REPLACE FUNCTION public.are_users_connected(user_a UUID, user_b UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
      AND ((requester_id = user_a AND addressee_id = user_b)
           OR (requester_id = user_b AND addressee_id = user_a))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get pending connection requests for a user
CREATE OR REPLACE FUNCTION public.get_pending_requests(user_id UUID)
RETURNS TABLE (
  connection_id UUID,
  requester_id UUID,
  message TEXT,
  requested_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id,
    uc.requester_id,
    uc.message,
    uc.requested_at
  FROM public.user_connections uc
  WHERE uc.addressee_id = user_id
    AND uc.status = 'pending'
  ORDER BY uc.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add friend_count to profiles (denormalized)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS friend_count INTEGER DEFAULT 0;

-- Function to update friend count
CREATE OR REPLACE FUNCTION public.update_friend_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Connection accepted
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE public.profiles SET friend_count = friend_count + 1 WHERE id = NEW.requester_id;
      UPDATE public.profiles SET friend_count = friend_count + 1 WHERE id = NEW.addressee_id;
    -- Connection removed from accepted
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE public.profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = NEW.requester_id;
      UPDATE public.profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = NEW.addressee_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'accepted' THEN
    UPDATE public.profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = OLD.requester_id;
    UPDATE public.profiles SET friend_count = GREATEST(friend_count - 1, 0) WHERE id = OLD.addressee_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_connection_status_change
  AFTER UPDATE OR DELETE ON public.user_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_friend_count();

-- Comments
COMMENT ON TABLE public.user_connections IS 'Friend requests and accepted connections between users';
COMMENT ON TABLE public.reports IS 'User reports of inappropriate content or behavior';
COMMENT ON TABLE public.user_warnings IS 'Admin-issued warnings and strikes against users';
COMMENT ON FUNCTION public.are_users_connected IS 'Check if two users have an accepted connection';
COMMENT ON FUNCTION public.get_pending_requests IS 'Get pending friend requests for a user';
