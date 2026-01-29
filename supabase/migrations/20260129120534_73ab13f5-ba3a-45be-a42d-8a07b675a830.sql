
-- Fix get_user_effective_modules to properly inherit from agency plan
-- The function should return agency plan modules by default, with user overrides applied

CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH agency_modules AS (
    -- Get modules from agency's plan
    SELECT 
      am.module_key,
      am.enabled,
      am.options
    FROM get_agency_enabled_modules(get_user_agency_id(p_user_id)) am
  ),
  user_overrides AS (
    -- Get user-specific overrides
    SELECT 
      um.module_key,
      true AS enabled,  -- presence in user_modules means enabled
      um.options
    FROM user_modules um
    WHERE um.user_id = p_user_id
  )
  -- Return: agency modules with user overrides applied
  -- If user has an override, use it; otherwise use agency module
  SELECT
    COALESCE(u.module_key, a.module_key) AS module_key,
    COALESCE(u.enabled, a.enabled, false) AS enabled,
    -- Merge options: user options override agency options
    COALESCE(
      CASE 
        WHEN u.options IS NOT NULL AND a.options IS NOT NULL 
        THEN a.options || u.options  -- merge with user taking precedence
        ELSE COALESCE(u.options, a.options, '{}'::jsonb)
      END,
      '{}'::jsonb
    ) AS options
  FROM agency_modules a
  FULL OUTER JOIN user_overrides u ON u.module_key = a.module_key
  WHERE COALESCE(u.enabled, a.enabled, false) = true;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.get_user_effective_modules(uuid) IS 
'Returns effective modules for a user by combining agency plan modules with user-level overrides.
Agency plan modules serve as the baseline, and user_modules entries can override or add additional modules.';
