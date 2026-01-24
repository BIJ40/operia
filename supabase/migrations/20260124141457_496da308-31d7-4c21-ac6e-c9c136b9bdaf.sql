-- Add onboarding columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS onboarding_dismissed_until timestamptz NULL,
ADD COLUMN IF NOT EXISTS onboarding_version int NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS onboarding_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_home_route text NULL;

-- Index for onboarding state queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed 
  ON public.profiles(onboarding_completed_at);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_dismissed 
  ON public.profiles(onboarding_dismissed_until);

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when user completed the welcome wizard';
COMMENT ON COLUMN public.profiles.onboarding_dismissed_until IS 'Timestamp until which the wizard is snoozed (7 days from dismiss)';
COMMENT ON COLUMN public.profiles.onboarding_version IS 'Version of onboarding completed, allows re-triggering for new features';
COMMENT ON COLUMN public.profiles.onboarding_payload IS 'JSON payload storing user preferences from onboarding (priorities, checklist, etc.)';
COMMENT ON COLUMN public.profiles.preferred_home_route IS 'User preferred landing page after login';