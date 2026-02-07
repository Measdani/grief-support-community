-- Background Check Applications Table
-- Tracks background check requests and approvals for gathering hosts

CREATE TABLE public.background_check_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Application details
  status background_check_status DEFAULT 'pending',
  provider TEXT, -- 'manual', 'checkr', future integrations
  provider_reference_id TEXT,

  -- User-submitted information
  full_legal_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  ssn_last_4 TEXT,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,

  -- Admin review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Approval details
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Set to 1 year from approval

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bg_check_apps_user_id ON public.background_check_applications(user_id);
CREATE INDEX idx_bg_check_apps_status ON public.background_check_applications(status);
CREATE INDEX idx_bg_check_apps_created ON public.background_check_applications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.background_check_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own background check applications"
  ON public.background_check_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create background check applications"
  ON public.background_check_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
  ON public.background_check_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR verification_status = 'meetup_organizer')
    )
  );

CREATE POLICY "Admins can update applications"
  ON public.background_check_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND (is_admin = true OR verification_status = 'meetup_organizer')
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_bg_check_apps_updated_at
  BEFORE UPDATE ON public.background_check_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.background_check_applications IS 'Background check applications for gathering hosts';
COMMENT ON COLUMN public.background_check_applications.status IS 'Application status: pending, approved, rejected, or expired';
COMMENT ON COLUMN public.background_check_applications.provider IS 'Background check provider: manual, checkr, etc.';
COMMENT ON COLUMN public.background_check_applications.expires_at IS 'Background check approval expires 1 year after approval';
