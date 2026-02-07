-- ============================================
-- Private Messaging System
-- Direct messages between users
-- ============================================

-- Conversations (between 2 users)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants (always 2 for DMs)
  participant_one UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_two UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Last message tracking
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_preview TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique conversation between two users
  UNIQUE(participant_one, participant_two),

  -- Ensure participant_one < participant_two (canonical ordering)
  CHECK (participant_one < participant_two)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  content TEXT NOT NULL,

  -- Read receipts
  read_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete (for sender)
  deleted_by_sender BOOLEAN DEFAULT false,
  deleted_by_recipient BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversation participants view helper (for tracking unread, muted, blocked)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- User preferences for this conversation
  is_muted BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Unread tracking
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- Blocked users
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Conversations
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = participant_one OR auth.uid() = participant_two);

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (
    (auth.uid() = participant_one OR auth.uid() = participant_two) AND
    -- Ensure user is verified
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND verification_status != 'unverified'
    ) AND
    -- Ensure not blocked
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE (blocker_id = participant_one AND blocked_id = participant_two)
         OR (blocker_id = participant_two AND blocked_id = participant_one)
    )
  );

-- RLS Policies: Messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    ) AND
    -- Check not blocked
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users bu
      JOIN public.conversations c ON c.id = conversation_id
      WHERE (bu.blocker_id = c.participant_one AND bu.blocked_id = c.participant_two)
         OR (bu.blocker_id = c.participant_two AND bu.blocked_id = c.participant_one)
    )
  );

CREATE POLICY "Users can update own messages (soft delete)"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.participant_one = auth.uid() OR c.participant_two = auth.uid())
    )
  );

-- RLS Policies: Conversation Participants
CREATE POLICY "Users can view own participant records"
  ON public.conversation_participants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create participant records"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participant records"
  ON public.conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies: Blocked Users
CREATE POLICY "Users can view own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- Indexes
CREATE INDEX idx_conversations_participant_one ON public.conversations(participant_one);
CREATE INDEX idx_conversations_participant_two ON public.conversations(participant_two);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_unread ON public.conversation_participants(user_id, unread_count) WHERE unread_count > 0;
CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);

-- Triggers
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_participants_updated_at
  BEFORE UPDATE ON public.conversation_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  other_user_id UUID;
BEGIN
  -- Update conversation last message
  UPDATE public.conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100)
  WHERE id = NEW.conversation_id;

  -- Get the other participant
  SELECT CASE
    WHEN participant_one = NEW.sender_id THEN participant_two
    ELSE participant_one
  END INTO other_user_id
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  -- Increment unread count for recipient
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id = other_user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to create/get conversation (handles canonical ordering)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(user_one UUID, user_two UUID)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
  p_one UUID;
  p_two UUID;
BEGIN
  -- Ensure canonical ordering
  IF user_one < user_two THEN
    p_one := user_one;
    p_two := user_two;
  ELSE
    p_one := user_two;
    p_two := user_one;
  END IF;

  -- Try to find existing conversation
  SELECT id INTO conv_id
  FROM public.conversations
  WHERE participant_one = p_one AND participant_two = p_two;

  -- Create if doesn't exist
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (participant_one, participant_two)
    VALUES (p_one, p_two)
    RETURNING id INTO conv_id;

    -- Create participant records
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, p_one), (conv_id, p_two);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.conversations IS 'Private message conversations between two users';
COMMENT ON TABLE public.messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.conversation_participants IS 'User-specific conversation settings and unread tracking';
COMMENT ON TABLE public.blocked_users IS 'User blocking for safety';
COMMENT ON FUNCTION public.get_or_create_conversation IS 'Helper to find or create a conversation with canonical user ordering';
