-- ============================================================================
-- PURGE: support_level, support functions, support_role, service_competencies
-- Décision métier: suppression complète de la hiérarchie support SA0-SA3
-- ============================================================================

-- 1. Drop functions that depend on support_level
DROP FUNCTION IF EXISTS public.get_user_support_level(UUID);
DROP FUNCTION IF EXISTS public.has_min_support_level(UUID, INTEGER);

-- 2. Drop trigger + function that protects support_level column changes
DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_cols ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_sensitive_profile_columns() CASCADE;

-- 3. Drop index on support_level
DROP INDEX IF EXISTS idx_profiles_support_level;

-- 4. Drop columns from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS support_level;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS support_role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS service_competencies;

-- 5. Drop the support_role enum type
DROP TYPE IF EXISTS public.support_role;