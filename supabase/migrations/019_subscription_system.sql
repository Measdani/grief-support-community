-- Subscription and Background Check System
-- Adds tier-based access control and background check tracking

-- Create subscription tier ENUM
CREATE TYPE subscription_tier AS ENUM (
  'free',
  'premium'
);

-- Create background check status ENUM
CREATE TYPE background_check_status AS ENUM (
  'not_started',
  'pending',
  'approved',
  'rejected',
  'expired'
);

-- Add subscription fields to profiles
ALTER TABLE public.profiles
ADD COLUMN subscription_tier subscription_tier DEFAULT 'free',
ADD COLUMN subscription_status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'past_due'
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN subscription_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN auto_renew BOOLEAN DEFAULT true;

-- Add background check fields to profiles
ALTER TABLE public.profiles
ADD COLUMN background_check_status background_check_status DEFAULT 'not_started',
ADD COLUMN background_check_provider TEXT,
ADD COLUMN background_check_provider_ref TEXT,
ADD COLUMN background_check_submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN background_check_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN background_check_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN background_check_notes TEXT;

-- Add messaging preference
ALTER TABLE public.profiles
ADD COLUMN messaging_preference TEXT DEFAULT 'friends_and_gatherings';

-- Create indexes for performance
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);
CREATE INDEX idx_profiles_background_check_status ON public.profiles(background_check_status);
CREATE INDEX idx_profiles_background_check_expires ON public.profiles(background_check_expires_at);

-- Add comments
COMMENT ON COLUMN public.profiles.subscription_tier IS 'User subscription level: free or premium';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Current subscription status: active, cancelled, or past_due';
COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.profiles.stripe_subscription_id IS 'Active Stripe subscription ID';
COMMENT ON COLUMN public.profiles.background_check_status IS 'Background check verification status for gathering hosts';
COMMENT ON COLUMN public.profiles.background_check_expires_at IS 'When background check approval expires (annual)';
COMMENT ON COLUMN public.profiles.messaging_preference IS 'Who can send messages: friends_only, friends_and_gatherings, allow_requests, disabled';
