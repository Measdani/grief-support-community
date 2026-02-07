-- Message Requests Table
-- Enables permission-based messaging for premium users

CREATE TABLE public.message_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  initial_message TEXT NOT NULL,

  responded_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(requester_id, recipient_id),
  CONSTRAINT no_self_requests CHECK (requester_id != recipient_id)
);

-- Indexes
CREATE INDEX idx_message_requests_requester ON public.message_requests(requester_id);
CREATE INDEX idx_message_requests_recipient ON public.message_requests(recipient_id);
CREATE INDEX idx_message_requests_status ON public.message_requests(status);
CREATE INDEX idx_message_requests_created ON public.message_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.message_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their message requests"
  ON public.message_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Premium users can create message requests"
  ON public.message_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND subscription_tier = 'premium'
    )
  );

CREATE POLICY "Recipients can update message requests"
  ON public.message_requests FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Update trigger for updated_at
CREATE TRIGGER update_message_requests_updated_at
  BEFORE UPDATE ON public.message_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.message_requests IS 'Message requests for users who are not friends or in same gathering';
COMMENT ON COLUMN public.message_requests.initial_message IS 'Initial message when requesting to message someone';
COMMENT ON COLUMN public.message_requests.status IS 'Request status: pending, accepted, or declined';
