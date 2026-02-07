-- ============================================
-- Forums / Discussion Boards
-- Community discussion organized by topics
-- ============================================

-- Forum Categories (top-level organization)
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- emoji or icon name
  color TEXT, -- for UI styling

  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  -- Stats (denormalized)
  topic_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Forum Topics (threads)
CREATE TABLE IF NOT EXISTS public.forum_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category_id UUID NOT NULL REFERENCES public.forum_categories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Topic settings
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_announcement BOOLEAN DEFAULT false,

  -- Stats
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,

  -- Last activity tracking
  last_post_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_post_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(category_id, slug)
);

-- Forum Posts (replies within topics)
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- For nested replies (optional)
  parent_post_id UUID REFERENCES public.forum_posts(id) ON DELETE SET NULL,

  -- Moderation
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  is_hidden BOOLEAN DEFAULT false,
  hidden_reason TEXT,
  hidden_by UUID REFERENCES public.profiles(id),

  -- Reactions
  like_count INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Likes
CREATE TABLE IF NOT EXISTS public.forum_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Topic Subscriptions (for notifications)
CREATE TABLE IF NOT EXISTS public.forum_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.forum_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, user_id)
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Categories
CREATE POLICY "Anyone can view active categories"
  ON public.forum_categories FOR SELECT
  USING (is_active = true);

-- RLS Policies: Topics
CREATE POLICY "Anyone can view topics"
  ON public.forum_topics FOR SELECT
  USING (true);

CREATE POLICY "Verified users can create topics"
  ON public.forum_topics FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status != 'unverified'
    )
  );

CREATE POLICY "Authors can update own topics"
  ON public.forum_topics FOR UPDATE
  USING (author_id = auth.uid());

-- RLS Policies: Posts
CREATE POLICY "Anyone can view non-hidden posts"
  ON public.forum_posts FOR SELECT
  USING (is_hidden = false);

CREATE POLICY "Verified users can create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status != 'unverified'
    )
  );

CREATE POLICY "Authors can update own posts"
  ON public.forum_posts FOR UPDATE
  USING (author_id = auth.uid());

-- RLS Policies: Likes
CREATE POLICY "Anyone can view likes"
  ON public.forum_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.forum_post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.forum_post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies: Subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.forum_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can subscribe"
  ON public.forum_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsubscribe"
  ON public.forum_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_forum_topics_category ON public.forum_topics(category_id);
CREATE INDEX idx_forum_topics_author ON public.forum_topics(author_id);
CREATE INDEX idx_forum_topics_last_post ON public.forum_topics(last_post_at DESC);
CREATE INDEX idx_forum_topics_pinned ON public.forum_topics(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_forum_posts_topic ON public.forum_posts(topic_id);
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at);
CREATE INDEX idx_forum_post_likes_post ON public.forum_post_likes(post_id);
CREATE INDEX idx_forum_subscriptions_user ON public.forum_subscriptions(user_id);

-- Triggers
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON public.forum_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_topics_updated_at
  BEFORE UPDATE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update topic stats on new post
CREATE OR REPLACE FUNCTION public.update_topic_on_post()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_topics
    SET
      reply_count = reply_count + 1,
      last_post_at = NEW.created_at,
      last_post_by = NEW.author_id
    WHERE id = NEW.topic_id;

    -- Update category post count
    UPDATE public.forum_categories
    SET post_count = post_count + 1
    WHERE id = (SELECT category_id FROM public.forum_topics WHERE id = NEW.topic_id);
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_topics
    SET reply_count = reply_count - 1
    WHERE id = OLD.topic_id;

    UPDATE public.forum_categories
    SET post_count = post_count - 1
    WHERE id = (SELECT category_id FROM public.forum_topics WHERE id = OLD.topic_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_forum_post_change
  AFTER INSERT OR DELETE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_topic_on_post();

-- Function to update category topic count
CREATE OR REPLACE FUNCTION public.update_category_on_topic()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_categories
    SET topic_count = topic_count + 1
    WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_categories
    SET topic_count = topic_count - 1
    WHERE id = OLD.category_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_forum_topic_change
  AFTER INSERT OR DELETE ON public.forum_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_category_on_topic();

-- Function to update post like count
CREATE OR REPLACE FUNCTION public.update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_like_change
  AFTER INSERT OR DELETE ON public.forum_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_like_count();

-- Seed default categories
INSERT INTO public.forum_categories (name, slug, description, icon, color, display_order) VALUES
('General Support', 'general-support', 'A safe space to share your feelings and find comfort', '💬', 'blue', 1),
('Loss of Spouse/Partner', 'loss-spouse-partner', 'For those grieving the loss of a life partner', '💔', 'red', 2),
('Loss of Parent', 'loss-parent', 'Support for those who have lost a mother or father', '🌳', 'green', 3),
('Loss of Child', 'loss-child', 'A compassionate space for bereaved parents', '🦋', 'purple', 4),
('Loss of Sibling', 'loss-sibling', 'For those mourning a brother or sister', '🤝', 'teal', 5),
('Loss of Friend', 'loss-friend', 'Grieving the loss of a close friend', '⭐', 'yellow', 6),
('Pet Loss', 'pet-loss', 'Honoring the bond with our animal companions', '🐾', 'orange', 7),
('Coping Strategies', 'coping-strategies', 'Share what helps you through difficult times', '🌱', 'emerald', 8),
('Milestones & Anniversaries', 'milestones-anniversaries', 'Navigating birthdays, holidays, and anniversaries', '📅', 'indigo', 9),
('Introductions', 'introductions', 'Introduce yourself to the community', '👋', 'slate', 10);

-- Comments
COMMENT ON TABLE public.forum_categories IS 'Top-level forum organization';
COMMENT ON TABLE public.forum_topics IS 'Discussion threads within categories';
COMMENT ON TABLE public.forum_posts IS 'Individual posts/replies within topics';
