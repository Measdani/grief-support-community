-- ============================================
-- Grief Resources System
-- Educational content, hotlines, and support info
-- ============================================

CREATE TYPE resource_type AS ENUM (
  'article',        -- Educational articles
  'hotline',        -- Crisis/support hotlines
  'organization',   -- Support organizations
  'book',           -- Recommended books
  'video',          -- Video resources
  'podcast',        -- Podcast recommendations
  'guide'           -- How-to guides
);

CREATE TYPE resource_category AS ENUM (
  'understanding_grief',
  'coping_strategies',
  'self_care',
  'supporting_others',
  'children_grief',
  'complicated_grief',
  'suicide_loss',
  'substance_loss',
  'pet_loss',
  'pregnancy_loss',
  'crisis_support',
  'professional_help',
  'spirituality',
  'memorial_planning'
);

-- Resources Table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT, -- For articles/guides (markdown supported)

  -- Categorization
  resource_type resource_type NOT NULL,
  categories resource_category[] NOT NULL DEFAULT '{understanding_grief}',
  tags TEXT[],

  -- External Link (for hotlines, orgs, books, etc.)
  external_url TEXT,
  phone_number TEXT, -- For hotlines
  is_24_7 BOOLEAN DEFAULT false, -- For hotlines

  -- Media
  thumbnail_url TEXT,

  -- Attribution
  author TEXT,
  source TEXT,
  published_date DATE,

  -- Targeting (optional - for showing relevant resources)
  loss_categories loss_category[], -- References enum from meetups

  -- Status
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,

  -- Stats
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource Helpfulness Tracking
CREATE TABLE IF NOT EXISTS public.resource_helpful (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_helpful BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_helpful ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view published resources"
  ON public.resources FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admin can view all resources"
  ON public.resources FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Admin can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Admin can update resources"
  ON public.resources FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Admin can delete resources"
  ON public.resources FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Users can mark resources helpful"
  ON public.resource_helpful FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their helpful votes"
  ON public.resource_helpful FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their helpful votes"
  ON public.resource_helpful FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_resources_type ON public.resources(resource_type);
CREATE INDEX idx_resources_categories ON public.resources USING GIN(categories);
CREATE INDEX idx_resources_featured ON public.resources(is_featured) WHERE is_featured = true;
CREATE INDEX idx_resources_published ON public.resources(is_published) WHERE is_published = true;
CREATE INDEX idx_resource_helpful_resource ON public.resource_helpful(resource_id);

-- Trigger for updated_at
CREATE TRIGGER update_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update helpful count
CREATE OR REPLACE FUNCTION public.update_resource_helpful_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.resources
    SET helpful_count = (
      SELECT COUNT(*) FROM public.resource_helpful
      WHERE resource_id = NEW.resource_id AND is_helpful = true
    )
    WHERE id = NEW.resource_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resources
    SET helpful_count = (
      SELECT COUNT(*) FROM public.resource_helpful
      WHERE resource_id = OLD.resource_id AND is_helpful = true
    )
    WHERE id = OLD.resource_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_helpful_change
  AFTER INSERT OR UPDATE OR DELETE ON public.resource_helpful
  FOR EACH ROW EXECUTE FUNCTION public.update_resource_helpful_count();

-- Seed some essential crisis hotlines
INSERT INTO public.resources (title, description, resource_type, categories, phone_number, external_url, is_24_7, is_featured, display_order) VALUES
('988 Suicide & Crisis Lifeline', 'Free, confidential support for people in distress, 24/7. Call or text 988.', 'hotline', '{crisis_support}', '988', 'https://988lifeline.org', true, true, 1),
('Crisis Text Line', 'Free crisis support via text message. Text HOME to 741741.', 'hotline', '{crisis_support}', '741741', 'https://www.crisistextline.org', true, true, 2),
('SAMHSA National Helpline', 'Free, confidential treatment referral and information service for mental health and substance use disorders.', 'hotline', '{crisis_support,professional_help}', '1-800-662-4357', 'https://www.samhsa.gov/find-help/national-helpline', true, true, 3),
('GriefShare', 'Find a grief recovery support group near you.', 'organization', '{understanding_grief,coping_strategies}', NULL, 'https://www.griefshare.org', false, true, 4),
('The Compassionate Friends', 'Support for families after a child dies.', 'organization', '{understanding_grief,coping_strategies}', '1-877-969-0010', 'https://www.compassionatefriends.org', false, true, 5);

-- Comments
COMMENT ON TABLE public.resources IS 'Educational resources, hotlines, and support information for grief';
COMMENT ON TABLE public.resource_helpful IS 'User ratings for resource helpfulness';
