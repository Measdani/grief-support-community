-- User Profiles and Verification System
-- This creates the tables needed for ID verification and user safety

-- Create verification status enum
CREATE TYPE verification_status AS ENUM (
  'unverified',
  'email_verified',
  'id_verified',
  'meetup_organizer'
);

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  display_name TEXT,
  bio TEXT,
  profile_image_url TEXT,

  -- Verification fields
  verification_status verification_status DEFAULT 'unverified',
  email_verified_at TIMESTAMP WITH TIME ZONE,
  id_verified_at TIMESTAMP WITH TIME ZONE,
  meetup_organizer_verified_at TIMESTAMP WITH TIME ZONE,

  -- ID Verification details
  id_verification_requested_at TIMESTAMP WITH TIME ZONE,
  id_verification_notes TEXT, -- Admin notes
  id_verification_method TEXT, -- 'manual', 'stripe', 'persona', etc.

  -- Safety flags
  is_banned BOOLEAN DEFAULT false,
  banned_at TIMESTAMP WITH TIME ZONE,
  ban_reason TEXT,

  -- Privacy settings
  profile_visibility TEXT DEFAULT 'verified_members', -- 'public', 'verified_members', 'private'
  allow_messages BOOLEAN DEFAULT true,
  show_in_directory BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification requests table (for tracking verification submissions)
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'id_verification', 'meetup_organizer'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'

  -- Submitted information
  submitted_info JSONB, -- Flexible field for any verification data
  submitted_documents TEXT[], -- Array of document URLs

  -- Admin review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity log for security tracking
CREATE TABLE public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'signup', 'login', 'verification_request', 'profile_update', etc.
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile (but not verification status)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own verification status
    verification_status = (SELECT verification_status FROM public.profiles WHERE id = auth.uid())
  );

-- Verified members can view other verified members
CREATE POLICY "Verified users can view other verified profiles"
  ON public.profiles FOR SELECT
  USING (
    verification_status IN ('id_verified', 'meetup_organizer') OR
    profile_visibility = 'public'
  );

-- Verification Requests RLS Policies
-- Users can view their own verification requests
CREATE POLICY "Users can view own verification requests"
  ON public.verification_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create verification requests
CREATE POLICY "Users can create verification requests"
  ON public.verification_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Activity Log RLS Policies
-- Users can view their own activity
CREATE POLICY "Users can view own activity"
  ON public.user_activity_log FOR SELECT
  USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, verification_status)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'email_verified'::verification_status
      ELSE 'unverified'::verification_status
    END
  );

  -- Log signup
  INSERT INTO public.user_activity_log (user_id, action, details)
  VALUES (NEW.id, 'signup', jsonb_build_object('email', NEW.email));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update email verification status
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET
      verification_status = 'email_verified'::verification_status,
      email_verified_at = NEW.email_confirmed_at
    WHERE id = NEW.id AND verification_status = 'unverified'::verification_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update profile when email is verified
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verified();

-- Create indexes for better performance
CREATE INDEX idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX idx_activity_log_user_id ON public.user_activity_log(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
