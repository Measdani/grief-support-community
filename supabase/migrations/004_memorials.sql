-- Memorial/Tribute System
-- Honor and remember deceased loved ones

-- Create memorials table
CREATE TABLE IF NOT EXISTS public.memorials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Loved one's information
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  nickname TEXT,

  -- Dates
  date_of_birth DATE,
  date_of_passing DATE NOT NULL,

  -- Memorial content
  obituary TEXT,
  life_story TEXT,
  favorite_memory TEXT,

  -- Photos
  profile_photo_url TEXT,
  cover_photo_url TEXT,

  -- Personal details
  relationship_to_creator TEXT, -- 'parent', 'child', 'spouse', 'sibling', 'friend', 'other'
  occupation TEXT,
  hobbies TEXT[],
  favorite_quote TEXT,

  -- Privacy settings
  is_public BOOLEAN DEFAULT true,
  allow_tributes BOOLEAN DEFAULT true,
  allow_photos BOOLEAN DEFAULT true,

  -- Stats
  view_count INTEGER DEFAULT 0,
  tribute_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memorial photos table
CREATE TABLE IF NOT EXISTS public.memorial_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_date DATE, -- When the photo was taken

  -- Moderation
  is_approved BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memorial tributes (condolences/memories shared by others)
CREATE TABLE IF NOT EXISTS public.memorial_tributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  tribute_type TEXT DEFAULT 'memory', -- 'memory', 'condolence', 'story'
  content TEXT NOT NULL,

  -- Moderation
  is_approved BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memorial candles (virtual candles lit in remembrance)
CREATE TABLE IF NOT EXISTS public.memorial_candles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memorial_id UUID NOT NULL REFERENCES public.memorials(id) ON DELETE CASCADE,
  lit_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.memorials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_tributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memorial_candles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Memorials
CREATE POLICY "Anyone can view public memorials"
  ON public.memorials FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Email verified users can create memorials"
  ON public.memorials FOR INSERT
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    )
  );

CREATE POLICY "Creators can update own memorials"
  ON public.memorials FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators can delete own memorials"
  ON public.memorials FOR DELETE
  USING (auth.uid() = created_by);

-- RLS Policies for Memorial Photos
CREATE POLICY "Anyone can view approved photos on public memorials"
  ON public.memorial_photos FOR SELECT
  USING (
    is_approved = true AND
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND (is_public = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Verified users can upload photos"
  ON public.memorial_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    ) AND
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND allow_photos = true
    )
  );

-- RLS Policies for Memorial Tributes
CREATE POLICY "Anyone can view approved tributes on public memorials"
  ON public.memorial_tributes FOR SELECT
  USING (
    is_approved = true AND
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND (is_public = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Verified users can leave tributes"
  ON public.memorial_tributes FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    ) AND
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND allow_tributes = true
    )
  );

CREATE POLICY "Authors can update own tributes"
  ON public.memorial_tributes FOR UPDATE
  USING (auth.uid() = author_id);

-- RLS Policies for Memorial Candles
CREATE POLICY "Anyone can view candles on public memorials"
  ON public.memorial_candles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memorials
      WHERE id = memorial_id
      AND (is_public = true OR created_by = auth.uid())
    )
  );

CREATE POLICY "Verified users can light candles"
  ON public.memorial_candles FOR INSERT
  WITH CHECK (
    auth.uid() = lit_by AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    )
  );

-- Indexes for performance
CREATE INDEX idx_memorials_creator ON public.memorials(created_by);
CREATE INDEX idx_memorials_public ON public.memorials(is_public);
CREATE INDEX idx_memorials_passing_date ON public.memorials(date_of_passing DESC);
CREATE INDEX idx_memorial_photos_memorial ON public.memorial_photos(memorial_id);
CREATE INDEX idx_memorial_tributes_memorial ON public.memorial_tributes(memorial_id);
CREATE INDEX idx_memorial_tributes_author ON public.memorial_tributes(author_id);
CREATE INDEX idx_memorial_candles_memorial ON public.memorial_candles(memorial_id);
CREATE INDEX idx_memorial_candles_lit_by ON public.memorial_candles(lit_by);
CREATE INDEX idx_memorial_candles_created ON public.memorial_candles(created_at);

-- Triggers for updated_at
CREATE TRIGGER update_memorials_updated_at
  BEFORE UPDATE ON public.memorials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memorial_tributes_updated_at
  BEFORE UPDATE ON public.memorial_tributes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update tribute count
CREATE OR REPLACE FUNCTION public.update_memorial_tribute_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.memorials
    SET tribute_count = tribute_count + 1
    WHERE id = NEW.memorial_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.memorials
    SET tribute_count = GREATEST(0, tribute_count - 1)
    WHERE id = OLD.memorial_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_memorial_tribute_created
  AFTER INSERT ON public.memorial_tributes
  FOR EACH ROW EXECUTE FUNCTION public.update_memorial_tribute_count();

CREATE TRIGGER on_memorial_tribute_deleted
  AFTER DELETE ON public.memorial_tributes
  FOR EACH ROW EXECUTE FUNCTION public.update_memorial_tribute_count();
