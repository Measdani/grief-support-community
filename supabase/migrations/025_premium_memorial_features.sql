-- ============================================
-- Premium Memorial Features: Themes, Custom URLs, QR Codes, Video
-- ============================================

-- Create themes table (database-managed, not hardcoded)
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  preview_url TEXT, -- URL to preview image

  -- Theme Settings (stored as JSON for flexibility)
  settings_json JSONB DEFAULT '{}',

  -- Access Control
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- Ordering
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to memorials table for premium features
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.themes(id) ON DELETE SET NULL;
ALTER TABLE public.memorials ADD COLUMN IF NOT EXISTS video_url TEXT; -- YouTube/Vimeo links

-- Enable RLS
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for themes
CREATE POLICY "Anyone can view active free themes"
  ON public.themes FOR SELECT
  USING (is_active = true AND is_premium = false);

CREATE POLICY "Premium users can view all active themes"
  ON public.themes FOR SELECT
  USING (
    is_active = true AND (
      is_premium = false OR
      auth.uid() IN (
        SELECT id FROM public.profiles WHERE subscription_tier = 'premium'
      )
    )
  );

CREATE POLICY "Admin can manage themes"
  ON public.themes FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

-- RLS Updates for memorials (custom URLs and video)
CREATE POLICY "Users can edit their own memorial slug (premium feature)"
  ON public.memorials FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (
    auth.uid() = created_by AND
    -- Only premium users can edit slug
    (
      SELECT subscription_tier FROM public.profiles WHERE id = auth.uid()
    ) = 'premium'
  );

CREATE POLICY "Users can update their own memorials"
  ON public.memorials FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memorials_slug ON public.memorials(slug);
CREATE INDEX IF NOT EXISTS idx_memorials_theme ON public.memorials(theme_id);
CREATE INDEX IF NOT EXISTS idx_themes_premium ON public.themes(is_premium) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_themes_sort ON public.themes(sort_order, is_premium);

-- Trigger for updated_at on themes
CREATE TRIGGER update_themes_updated_at
  BEFORE UPDATE ON public.themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique slug (called from application code)
CREATE OR REPLACE FUNCTION public.generate_memorial_slug(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  counter INTEGER := 0;
  final_slug TEXT;
BEGIN
  -- Create base slug from name (lowercase, replace spaces with hyphens, remove special chars)
  slug := LOWER(REGEXP_REPLACE(REGEXP_REPLACE(base_name, '[^a-zA-Z0-9\s-]', ''), '\s+', '-', 'g'));

  -- Remove leading/trailing hyphens
  slug := TRIM(BOTH '-' FROM slug);

  -- Check if slug already exists
  final_slug := slug;
  WHILE EXISTS (SELECT 1 FROM public.memorials WHERE memorials.slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to validate slug (check against reserved words and format)
CREATE OR REPLACE FUNCTION public.validate_memorial_slug(slug_text TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  reserved_words TEXT[] := ARRAY['login', 'admin', 'resources', 'meetups', 'api', 'auth', 'dashboard', 'pricing', 'settings', 'messages', 'connections', 'host-gatherings', 'forums', 'candles'];
  word TEXT;
BEGIN
  -- Check if slug is in reserved words
  FOREACH word IN ARRAY reserved_words LOOP
    IF LOWER(slug_text) = LOWER(word) THEN
      RETURN false;
    END IF;
  END LOOP;

  -- Check format: alphanumeric and hyphens only, not empty
  IF slug_text ~ '^[a-z0-9-]+$' AND LENGTH(slug_text) > 0 AND LENGTH(slug_text) <= 100 THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Seed themes table with placeholder designs
INSERT INTO public.themes (name, description, is_premium, sort_order) VALUES
-- FREE THEMES
('Classic', 'Simple, timeless design with soft colors', false, 1),
('Serene', 'Calming blues and greens with gentle typography', false, 2),
('Minimal', 'Clean, spacious layout with focus on content', false, 3),
('Warm Light', 'Warm earth tones and soft lighting effects', false, 4),
('Garden', 'Nature-inspired with subtle botanical elements', false, 5),
-- PREMIUM THEMES
('Quiet Elegance', 'Sophisticated design with refined typography', true, 6),
('Celestial', 'Peaceful night sky theme with subtle stars', true, 7),
('Timeless', 'Classic memorial aesthetic with heritage feel', true, 8),
('Legacy', 'Formal, dignified layout for lasting tributes', true, 9),
('Dawn', 'Gentle sunrise colors and hopeful imagery', true, 10)
ON CONFLICT (name) DO NOTHING;

-- Comments
COMMENT ON TABLE public.themes IS 'Memorial page themes/backgrounds - database-managed for easy updates';
COMMENT ON FUNCTION public.generate_memorial_slug(TEXT) IS 'Generates unique, URL-safe slug from memorial name. Appends -2, -3 etc for duplicates.';
COMMENT ON FUNCTION public.validate_memorial_slug(TEXT) IS 'Validates memorial slug: blocks reserved words, checks format (alphanumeric + hyphens).';
