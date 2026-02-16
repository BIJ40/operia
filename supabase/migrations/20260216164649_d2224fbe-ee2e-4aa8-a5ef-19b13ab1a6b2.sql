
-- Fix: user_modules is the SOLE source of truth for user permissions
-- Agency plan modules are only used at user CREATION time to seed initial modules
-- At runtime, only user_modules determines what a user can access

CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- user_modules is the single source of truth
  -- No more merging with agency plan modules at runtime
  SELECT 
    um.module_key::text,
    true AS enabled,
    COALESCE(um.options, '{}'::jsonb) AS options
  FROM user_modules um
  WHERE um.user_id = p_user_id;
$$;
