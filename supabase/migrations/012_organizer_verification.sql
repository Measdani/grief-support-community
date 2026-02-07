-- ============================================
-- Paid Meetup Organizer Verification
-- Users pay to become verified meetup organizers
-- ============================================

CREATE TYPE organizer_application_status AS ENUM (
  'pending_payment',
  'payment_complete',
  'under_review',
  'approved',
  'rejected',
  'expired'
);

-- Organizer Applications
CREATE TABLE IF NOT EXISTS public.organizer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Application Details
  experience TEXT NOT NULL, -- Their experience with grief support/facilitation
  motivation TEXT NOT NULL, -- Why they want to host meetups
  planned_meetups TEXT NOT NULL, -- What kind of meetups they plan to host
  certifications TEXT, -- Any relevant certifications
  references_info TEXT, -- References or endorsements

  -- Background check consent
  background_check_consent BOOLEAN DEFAULT false,

  -- Status
  status organizer_application_status DEFAULT 'pending_payment',

  -- Payment tracking
  payment_amount_cents INTEGER NOT NULL DEFAULT 4999, -- $49.99
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Review tracking
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Expiry (applications expire after 30 days if not paid)
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizer verification history (for tracking status changes)
CREATE TABLE IF NOT EXISTS public.organizer_verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  application_id UUID NOT NULL REFERENCES public.organizer_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  old_status organizer_application_status,
  new_status organizer_application_status NOT NULL,

  changed_by UUID REFERENCES public.profiles(id), -- NULL if system-triggered
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizer_verification_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Applications
CREATE POLICY "Users can view own applications"
  ON public.organizer_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
  ON public.organizer_applications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    -- Must be at least email verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status IN ('email_verified', 'id_verified')
    ) AND
    -- Can't have a pending application
    NOT EXISTS (
      SELECT 1 FROM public.organizer_applications
      WHERE user_id = auth.uid()
        AND status IN ('pending_payment', 'payment_complete', 'under_review')
    )
  );

CREATE POLICY "Users can update own pending applications"
  ON public.organizer_applications FOR UPDATE
  USING (
    auth.uid() = user_id AND
    status IN ('pending_payment', 'payment_complete')
  );

-- RLS Policies: History
CREATE POLICY "Users can view own verification history"
  ON public.organizer_verification_history FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_organizer_applications_user ON public.organizer_applications(user_id);
CREATE INDEX idx_organizer_applications_status ON public.organizer_applications(status);
CREATE INDEX idx_organizer_applications_stripe ON public.organizer_applications(stripe_checkout_session_id);
CREATE INDEX idx_organizer_history_application ON public.organizer_verification_history(application_id);
CREATE INDEX idx_organizer_history_user ON public.organizer_verification_history(user_id);

-- Triggers
CREATE TRIGGER update_organizer_applications_updated_at
  BEFORE UPDATE ON public.organizer_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_organizer_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.organizer_verification_history (
      application_id,
      user_id,
      old_status,
      new_status
    ) VALUES (
      NEW.id,
      NEW.user_id,
      OLD.status,
      NEW.status
    );

    -- If approved, update user's verification status
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET verification_status = 'meetup_organizer'
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_organizer_application_status_change
  AFTER UPDATE ON public.organizer_applications
  FOR EACH ROW EXECUTE FUNCTION public.log_organizer_status_change();

-- Comments
COMMENT ON TABLE public.organizer_applications IS 'Applications to become a verified meetup organizer';
COMMENT ON TABLE public.organizer_verification_history IS 'Audit log of application status changes';
COMMENT ON COLUMN public.organizer_applications.payment_amount_cents IS 'Verification fee in cents (default $49.99)';
