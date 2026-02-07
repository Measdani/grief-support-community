-- Stripe Subscriptions Tracking Table
-- Stores all subscription lifecycle events for audit and debugging

CREATE TABLE public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,

  -- Subscription details
  status TEXT NOT NULL, -- 'active', 'canceled', 'incomplete', 'past_due', 'trialing'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Amounts
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'usd',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_subscriptions_user_id ON public.stripe_subscriptions(user_id);
CREATE INDEX idx_stripe_subscriptions_stripe_id ON public.stripe_subscriptions(stripe_subscription_id);
CREATE INDEX idx_stripe_subscriptions_customer_id ON public.stripe_subscriptions(stripe_customer_id);

-- Enable Row Level Security
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own subscriptions"
  ON public.stripe_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.stripe_subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Update trigger for updated_at
CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.stripe_subscriptions IS 'Audit trail for subscription lifecycle events';
COMMENT ON COLUMN public.stripe_subscriptions.status IS 'Current subscription status from Stripe';
COMMENT ON COLUMN public.stripe_subscriptions.amount IS 'Subscription amount in cents (USD)';
