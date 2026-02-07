-- ============================================
-- Meetups System
-- Support group meetups (virtual & in-person)
-- ============================================

-- Loss categories for meetup targeting
CREATE TYPE loss_category AS ENUM (
  'spouse_partner',
  'parent',
  'child',
  'sibling',
  'friend',
  'pet',
  'pregnancy_infant',
  'suicide',
  'overdose',
  'terminal_illness',
  'sudden_loss',
  'general'
);

CREATE TYPE meetup_format AS ENUM (
  'in_person',
  'virtual',
  'hybrid'
);

CREATE TYPE meetup_status AS ENUM (
  'draft',
  'published',
  'cancelled',
  'completed'
);

CREATE TYPE rsvp_status AS ENUM (
  'attending',
  'maybe',
  'declined',
  'waitlist'
);

-- Meetups Table
CREATE TABLE IF NOT EXISTS public.meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organizer (must be verified meetup_organizer)
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Categorization
  loss_categories loss_category[] NOT NULL DEFAULT '{general}',
  format meetup_format NOT NULL DEFAULT 'in_person',

  -- Schedule
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  -- Location (for in-person/hybrid)
  location_name TEXT, -- e.g., "Community Center Room 3"
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  location_country TEXT DEFAULT 'US',
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),

  -- Virtual (for virtual/hybrid)
  virtual_link TEXT, -- Zoom/Google Meet link
  virtual_platform TEXT, -- 'zoom', 'google_meet', 'teams', etc.
  virtual_meeting_id TEXT,
  virtual_passcode TEXT,

  -- Capacity & Registration
  max_attendees INTEGER, -- NULL = unlimited
  requires_approval BOOLEAN DEFAULT false,
  registration_deadline TIMESTAMP WITH TIME ZONE,

  -- Status
  status meetup_status DEFAULT 'draft',

  -- Stats (denormalized for performance)
  attendee_count INTEGER DEFAULT 0,

  -- Recurrence (for recurring meetups)
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format
  parent_meetup_id UUID REFERENCES public.meetups(id) ON DELETE SET NULL,

  -- Metadata
  cover_image_url TEXT,
  tags TEXT[],

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSVP Table
CREATE TABLE IF NOT EXISTS public.meetup_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status rsvp_status NOT NULL DEFAULT 'attending',

  -- For approval-required meetups
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),

  -- Optional message to organizer
  message TEXT,

  -- Attendance tracking
  checked_in_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(meetup_id, user_id)
);

-- Meetup Comments (for Q&A, updates)
CREATE TABLE IF NOT EXISTS public.meetup_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_organizer_update BOOLEAN DEFAULT false, -- For official announcements

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Meetups
CREATE POLICY "Anyone can view published meetups"
  ON public.meetups FOR SELECT
  USING (status = 'published' OR organizer_id = auth.uid());

CREATE POLICY "Verified organizers can create meetups"
  ON public.meetups FOR INSERT
  WITH CHECK (
    auth.uid() = organizer_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status = 'meetup_organizer'
    )
  );

CREATE POLICY "Organizers can update own meetups"
  ON public.meetups FOR UPDATE
  USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete own meetups"
  ON public.meetups FOR DELETE
  USING (organizer_id = auth.uid());

-- RLS Policies: RSVPs
CREATE POLICY "Users can view RSVPs for meetups they organize or attend"
  ON public.meetup_rsvps FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = meetup_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can RSVP"
  ON public.meetup_rsvps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSVP"
  ON public.meetup_rsvps FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own RSVP"
  ON public.meetup_rsvps FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies: Comments
CREATE POLICY "Anyone can view comments on published meetups"
  ON public.meetup_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = meetup_id AND status = 'published'
    )
  );

CREATE POLICY "Authenticated users can comment on meetups they RSVP'd to"
  ON public.meetup_comments FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    (
      EXISTS (
        SELECT 1 FROM public.meetup_rsvps
        WHERE meetup_id = meetup_comments.meetup_id AND user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.meetups
        WHERE id = meetup_comments.meetup_id AND organizer_id = auth.uid()
      )
    )
  );

CREATE POLICY "Authors can update own comments"
  ON public.meetup_comments FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "Authors and organizers can delete comments"
  ON public.meetup_comments FOR DELETE
  USING (
    author_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.meetups
      WHERE id = meetup_id AND organizer_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_meetups_organizer ON public.meetups(organizer_id);
CREATE INDEX idx_meetups_status ON public.meetups(status);
CREATE INDEX idx_meetups_start_time ON public.meetups(start_time);
CREATE INDEX idx_meetups_format ON public.meetups(format);
CREATE INDEX idx_meetups_location_city ON public.meetups(location_city);
CREATE INDEX idx_meetups_location_state ON public.meetups(location_state);
CREATE INDEX idx_meetups_loss_categories ON public.meetups USING GIN(loss_categories);
CREATE INDEX idx_meetup_rsvps_meetup ON public.meetup_rsvps(meetup_id);
CREATE INDEX idx_meetup_rsvps_user ON public.meetup_rsvps(user_id);
CREATE INDEX idx_meetup_rsvps_status ON public.meetup_rsvps(status);
CREATE INDEX idx_meetup_comments_meetup ON public.meetup_comments(meetup_id);

-- Triggers
CREATE TRIGGER update_meetups_updated_at
  BEFORE UPDATE ON public.meetups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetup_rsvps_updated_at
  BEFORE UPDATE ON public.meetup_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetup_comments_updated_at
  BEFORE UPDATE ON public.meetup_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update attendee count
CREATE OR REPLACE FUNCTION public.update_meetup_attendee_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.meetups
    SET attendee_count = (
      SELECT COUNT(*) FROM public.meetup_rsvps
      WHERE meetup_id = NEW.meetup_id AND status = 'attending'
    )
    WHERE id = NEW.meetup_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.meetups
    SET attendee_count = (
      SELECT COUNT(*) FROM public.meetup_rsvps
      WHERE meetup_id = OLD.meetup_id AND status = 'attending'
    )
    WHERE id = OLD.meetup_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rsvp_change
  AFTER INSERT OR UPDATE OR DELETE ON public.meetup_rsvps
  FOR EACH ROW EXECUTE FUNCTION public.update_meetup_attendee_count();

-- Comments
COMMENT ON TABLE public.meetups IS 'Support group meetups (virtual and in-person)';
COMMENT ON TABLE public.meetup_rsvps IS 'User RSVPs for meetups';
COMMENT ON TABLE public.meetup_comments IS 'Discussion and updates for meetups';
COMMENT ON COLUMN public.meetups.loss_categories IS 'Types of loss this meetup supports (can be multiple)';
COMMENT ON COLUMN public.meetups.recurrence_rule IS 'iCal RRULE format for recurring meetups';
