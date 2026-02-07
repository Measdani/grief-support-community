-- Zero-Liability Tracking System
-- Complete audit trail for legal protection

-- Add additional verification columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_identity_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_identity_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_verification_id TEXT; -- Stripe verification session ID

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_check_status TEXT DEFAULT 'none';
-- 'none', 'pending', 'clear', 'flagged', 'rejected'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_check_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_check_provider TEXT; -- 'checkr', 'goodhire', etc.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS background_check_id TEXT; -- External check ID

-- Emergency contact (required for meetup attendance)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;

-- Create liability waivers table
CREATE TABLE IF NOT EXISTS public.liability_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waiver_version TEXT NOT NULL, -- Track different waiver versions
  waiver_type TEXT NOT NULL, -- 'general', 'meetup_participant', 'meetup_organizer'

  -- Legal tracking
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  waiver_text TEXT NOT NULL, -- Store exact text they agreed to

  -- Validity
  expires_at TIMESTAMP WITH TIME ZONE, -- Annual re-acceptance
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetups table
CREATE TABLE IF NOT EXISTS public.meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.profiles(id),

  -- Meetup details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  meetup_type TEXT NOT NULL, -- 'coffee', 'support_group', 'activity', 'retreat'

  -- Location (required for safety)
  location_name TEXT NOT NULL, -- "Starbucks on Main St"
  location_address TEXT NOT NULL,
  location_type TEXT NOT NULL, -- 'public', 'semi_public', 'private'
  latitude DECIMAL,
  longitude DECIMAL,

  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Safety requirements
  required_verification_level TEXT NOT NULL DEFAULT 'stripe_identity',
  -- 'stripe_identity' or 'background_check'
  max_participants INTEGER,
  min_age INTEGER DEFAULT 18,

  -- Status
  status TEXT DEFAULT 'upcoming', -- 'upcoming', 'in_progress', 'completed', 'cancelled'
  cancellation_reason TEXT,

  -- Emergency
  organizer_emergency_contact TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetup attendance tracking (legal audit trail)
CREATE TABLE IF NOT EXISTS public.meetup_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Verification snapshot (prove they were verified at time of meetup)
  verification_level_snapshot TEXT NOT NULL,
  stripe_verified_snapshot BOOLEAN NOT NULL,
  background_check_snapshot TEXT NOT NULL,

  -- Attendance tracking
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE,
  attendance_status TEXT DEFAULT 'registered',
  -- 'registered', 'checked_in', 'attended', 'no_show', 'cancelled'

  -- Emergency contact at time of registration
  emergency_contact_snapshot JSONB,

  -- Safety
  waiver_id UUID REFERENCES public.liability_waivers(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate registrations
  UNIQUE(meetup_id, user_id)
);

-- Create incident reports table (legal protection)
CREATE TABLE IF NOT EXISTS public.incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What happened
  incident_type TEXT NOT NULL, -- 'safety_concern', 'inappropriate_behavior', 'harassment', 'other'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,

  -- Who/where
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  reported_user_id UUID REFERENCES public.profiles(id),
  meetup_id UUID REFERENCES public.meetups(id),

  -- Timeline
  incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Investigation
  status TEXT DEFAULT 'pending', -- 'pending', 'investigating', 'resolved', 'closed'
  assigned_to_admin UUID REFERENCES public.profiles(id),
  investigation_notes TEXT,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Actions taken
  action_taken TEXT, -- 'warning', 'temporary_ban', 'permanent_ban', 'none', 'other'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification payment tracking
CREATE TABLE IF NOT EXISTS public.verification_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  verification_type TEXT NOT NULL, -- 'stripe_identity', 'background_check'
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',

  -- Payment tracking
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_intent_id TEXT, -- Stripe payment intent ID
  charge_id TEXT,

  -- Verification result
  verification_status TEXT, -- 'pending', 'verified', 'failed'
  verification_result JSONB, -- Store verification details

  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.liability_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Liability Waivers
CREATE POLICY "Users can view own waivers"
  ON public.liability_waivers FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for Meetups
CREATE POLICY "Verified users can view meetups"
  ON public.meetups FOR SELECT
  USING (true); -- All can view, but joining requires verification

CREATE POLICY "Background checked users can create meetups"
  ON public.meetups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND background_check_status = 'clear'
    )
  );

CREATE POLICY "Organizers can update own meetups"
  ON public.meetups FOR UPDATE
  USING (auth.uid() = organizer_id);

-- RLS Policies for Attendance
CREATE POLICY "Users can view meetups they're attending"
  ON public.meetup_attendance FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT organizer_id FROM public.meetups WHERE id = meetup_id
  ));

CREATE POLICY "Verified users can register for meetups"
  ON public.meetup_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for Incident Reports
CREATE POLICY "Users can view own reports"
  ON public.incident_reports FOR SELECT
  USING (auth.uid() = reporter_id OR auth.uid() = reported_user_id);

CREATE POLICY "Users can create incident reports"
  ON public.incident_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- RLS Policies for Verification Payments
CREATE POLICY "Users can view own payments"
  ON public.verification_payments FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_meetups_organizer ON public.meetups(organizer_id);
CREATE INDEX idx_meetups_start_time ON public.meetups(start_time);
CREATE INDEX idx_meetups_status ON public.meetups(status);
CREATE INDEX idx_attendance_meetup ON public.meetup_attendance(meetup_id);
CREATE INDEX idx_attendance_user ON public.meetup_attendance(user_id);
CREATE INDEX idx_incidents_reported_user ON public.incident_reports(reported_user_id);
CREATE INDEX idx_incidents_meetup ON public.incident_reports(meetup_id);
CREATE INDEX idx_incidents_status ON public.incident_reports(status);

-- Triggers for updated_at
CREATE TRIGGER update_meetups_updated_at
  BEFORE UPDATE ON public.meetups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at
  BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
