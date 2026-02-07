-- Stripe Events Log Table
-- Stores all incoming Stripe webhook events for debugging and idempotency

CREATE TABLE public.stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_events_event_id ON public.stripe_events(stripe_event_id);
CREATE INDEX idx_stripe_events_type ON public.stripe_events(event_type);
CREATE INDEX idx_stripe_events_processed ON public.stripe_events(processed) WHERE processed = false;
CREATE INDEX idx_stripe_events_created ON public.stripe_events(created_at DESC);

-- No RLS - internal service use only

-- Comments
COMMENT ON TABLE public.stripe_events IS 'Audit log of all Stripe webhook events received';
COMMENT ON COLUMN public.stripe_events.stripe_event_id IS 'Unique Stripe event ID for idempotency';
COMMENT ON COLUMN public.stripe_events.processed IS 'Whether this event has been successfully processed';
COMMENT ON COLUMN public.stripe_events.error_message IS 'Error message if processing failed';
