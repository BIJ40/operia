-- =============================================================================
-- STEP 1: Add profiles.support_level column for Support Agent escalation levels
-- =============================================================================

-- Add support_level column to profiles (NULL = non-agent, 1=SA1, 2=SA2, 3=SA3)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS support_level INTEGER DEFAULT NULL
CHECK (support_level IS NULL OR (support_level >= 1 AND support_level <= 3));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_support_level ON public.profiles(support_level) WHERE support_level IS NOT NULL;

-- =============================================================================
-- STEP 2: Migrate data from enabled_modules JSONB to new column
-- =============================================================================

-- Update profiles.support_level from enabled_modules.support.options.level
UPDATE public.profiles
SET support_level = (enabled_modules->'support'->'options'->>'level')::INTEGER
WHERE enabled_modules->'support'->'options'->>'level' IS NOT NULL
  AND (enabled_modules->'support'->'options'->>'level')::INTEGER BETWEEN 1 AND 3;

-- =============================================================================
-- STEP 3: Create helper function for checking support level (security definer)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_support_level(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(support_level, 0)
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Helper to check if user has minimum support level
CREATE OR REPLACE FUNCTION public.has_min_support_level(_user_id UUID, _min_level INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT support_level >= _min_level FROM public.profiles WHERE id = _user_id),
    FALSE
  )
$$;

COMMENT ON COLUMN public.profiles.support_level IS 'Support Agent level: NULL=not agent, 1=SA1 (Basic), 2=SA2 (Technical), 3=SA3 (Expert)';