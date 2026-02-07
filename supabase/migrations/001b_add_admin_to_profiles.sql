-- Add admin flag to profiles table
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT false;

-- Create index for faster admin lookups
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin);

-- Add comment
COMMENT ON COLUMN public.profiles.is_admin IS 'Whether user has admin access to the platform';
