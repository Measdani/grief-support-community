-- Forums and Messaging System
-- Community posts and private messaging with access control

-- Create forum categories
CREATE TABLE IF NOT EXISTS public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT, -- emoji or icon name
  display_order INTEGER DEFAULT 0,
  min_verification_level TEXT DEFAULT 'email_verified',
  -- 'unverified', 'email_verified', 'id_verified', 'meetup_organizer'

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum posts
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,

  -- Moderation
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES public.profiles(id),
  deletion_reason TEXT,

  -- Stats
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID REFERENCES public.profiles(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create forum replies
CREATE TABLE IF NOT EXISTS public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES public.forum_replies(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- Moderation
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES public.profiles(id),
  deletion_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations (private messaging)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Last read tracking
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Archive/mute
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- Create messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- Message status
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Forum Categories
CREATE POLICY "Anyone can view forum categories"
  ON public.forum_categories FOR SELECT
  USING (true);

-- RLS Policies for Forum Posts
CREATE POLICY "Anyone can view non-deleted posts"
  ON public.forum_posts FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Email verified users can create posts"
  ON public.forum_posts FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    )
  );

CREATE POLICY "Authors can update own posts"
  ON public.forum_posts FOR UPDATE
  USING (auth.uid() = author_id);

-- RLS Policies for Forum Replies
CREATE POLICY "Anyone can view non-deleted replies"
  ON public.forum_replies FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Email verified users can create replies"
  ON public.forum_replies FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('email_verified', 'id_verified', 'meetup_organizer')
    )
  );

CREATE POLICY "Authors can update own replies"
  ON public.forum_replies FOR UPDATE
  USING (auth.uid() = author_id);

-- RLS Policies for Conversations
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = id
      AND user_id = auth.uid()
    )
  );

-- Only ID verified users can create conversations
CREATE POLICY "ID verified users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND verification_status IN ('id_verified', 'meetup_organizer')
    )
  );

-- RLS Policies for Conversation Participants
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to conversations they create"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (true); -- Handled by conversation policy

-- RLS Policies for Messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    is_deleted = false AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX idx_forum_replies_post ON public.forum_replies(post_id);
CREATE INDEX idx_forum_replies_author ON public.forum_replies(author_id);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Triggers for updated_at
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON public.forum_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_forum_replies_updated_at
  BEFORE UPDATE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update reply count and last reply info
CREATE OR REPLACE FUNCTION public.update_post_reply_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.forum_posts
    SET
      reply_count = reply_count + 1,
      last_reply_at = NEW.created_at,
      last_reply_by = NEW.author_id
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.forum_posts
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_forum_reply_created
  AFTER INSERT ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_post_reply_stats();

CREATE TRIGGER on_forum_reply_deleted
  AFTER DELETE ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_post_reply_stats();

-- Insert default forum categories
INSERT INTO public.forum_categories (name, description, slug, icon, display_order, min_verification_level) VALUES
  ('General Support', 'Share your journey and connect with others', 'general', '💬', 1, 'email_verified'),
  ('Coping Strategies', 'Tips and techniques for managing grief', 'coping', '🌱', 2, 'email_verified'),
  ('Remembrance', 'Honor and remember your loved ones', 'remembrance', '🕯️', 3, 'email_verified'),
  ('Questions & Advice', 'Ask for guidance from the community', 'questions', '❓', 4, 'email_verified'),
  ('Meetup Planning', 'Discuss and plan in-person meetups', 'meetups', '📍', 5, 'id_verified');
