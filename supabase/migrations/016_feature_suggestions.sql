-- ============================================
-- Feature Suggestions System
-- Allow users to suggest new features
-- ============================================

-- Status types for suggestions
CREATE TYPE suggestion_status AS ENUM (
  'submitted',      -- Just submitted by user
  'under_review',   -- Being reviewed by admin
  'planned',        -- Approved and planned for implementation
  'in_progress',    -- Currently being worked on
  'completed',      -- Feature has been implemented
  'declined'        -- Not planned for implementation
);

-- Priority levels
CREATE TYPE suggestion_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Create feature_suggestions table
CREATE TABLE IF NOT EXISTS public.feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User information
  submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Suggestion details
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- 'memorials', 'forums', 'meetups', 'messaging', 'general', etc.

  -- Status and priority
  status suggestion_status DEFAULT 'submitted',
  priority suggestion_priority DEFAULT 'medium',

  -- Admin notes
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,

  -- Community engagement
  upvote_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create upvotes table (prevent duplicate votes)
CREATE TABLE IF NOT EXISTS public.suggestion_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES public.feature_suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate votes
  UNIQUE(suggestion_id, user_id)
);

-- Enable RLS
ALTER TABLE public.feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_upvotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Feature Suggestions

-- Anyone can view all suggestions
CREATE POLICY "Anyone can view suggestions"
  ON public.feature_suggestions FOR SELECT
  TO public
  USING (true);

-- Authenticated users can submit suggestions
CREATE POLICY "Authenticated users can submit suggestions"
  ON public.feature_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Users can update their own suggestions (only if status is 'submitted')
CREATE POLICY "Users can update own pending suggestions"
  ON public.feature_suggestions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = submitted_by AND
    status = 'submitted'
  )
  WITH CHECK (
    auth.uid() = submitted_by AND
    status = 'submitted'
  );

-- Users can delete their own suggestions (only if status is 'submitted')
CREATE POLICY "Users can delete own pending suggestions"
  ON public.feature_suggestions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = submitted_by AND
    status = 'submitted'
  );

-- RLS Policies: Upvotes

-- Anyone can view upvotes
CREATE POLICY "Anyone can view upvotes"
  ON public.suggestion_upvotes FOR SELECT
  TO public
  USING (true);

-- Authenticated users can upvote
CREATE POLICY "Authenticated users can upvote"
  ON public.suggestion_upvotes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own upvotes
CREATE POLICY "Users can remove own upvotes"
  ON public.suggestion_upvotes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_suggestions_submitter ON public.feature_suggestions(submitted_by);
CREATE INDEX idx_suggestions_status ON public.feature_suggestions(status);
CREATE INDEX idx_suggestions_created ON public.feature_suggestions(created_at DESC);
CREATE INDEX idx_suggestions_upvotes ON public.feature_suggestions(upvote_count DESC);
CREATE INDEX idx_upvotes_suggestion ON public.suggestion_upvotes(suggestion_id);
CREATE INDEX idx_upvotes_user ON public.suggestion_upvotes(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.feature_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update upvote count
CREATE OR REPLACE FUNCTION public.update_suggestion_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.feature_suggestions
    SET upvote_count = upvote_count + 1
    WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.feature_suggestions
    SET upvote_count = GREATEST(0, upvote_count - 1)
    WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_suggestion_upvote_created
  AFTER INSERT ON public.suggestion_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_upvote_count();

CREATE TRIGGER on_suggestion_upvote_deleted
  AFTER DELETE ON public.suggestion_upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_suggestion_upvote_count();

-- Comments
COMMENT ON TABLE public.feature_suggestions IS 'User-submitted feature requests and improvement suggestions';
COMMENT ON TABLE public.suggestion_upvotes IS 'User upvotes for feature suggestions';
