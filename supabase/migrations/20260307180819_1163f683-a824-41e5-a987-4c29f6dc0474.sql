-- Rewrite get_user_effective_modules to implement cascade:
-- 1. Plan agence (plan_tier_modules) = base
-- 2. User overrides (user_modules) take precedence
-- Returns: module_key, enabled, options

CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_id uuid;
  v_tier_key text;
BEGIN
  -- 1. Get user's agency
  SELECT p.agency_id INTO v_agency_id
  FROM profiles p
  WHERE p.id = p_user_id;

  -- 2. Get agency's active plan tier
  IF v_agency_id IS NOT NULL THEN
    SELECT s.tier_key INTO v_tier_key
    FROM agency_subscription s
    WHERE s.agency_id = v_agency_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- 3. Build effective modules via cascade:
  --    Plan modules (base) ← User overrides (take precedence)
  RETURN QUERY
  WITH plan_modules AS (
    -- Modules from the agency's plan
    SELECT 
      ptm.module_key,
      COALESCE(ptm.enabled, false) AS enabled,
      COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM plan_tier_modules ptm
    WHERE ptm.tier_key = v_tier_key
      AND COALESCE(ptm.enabled, false) = true
  ),
  user_overrides AS (
    -- User-level module overrides (from user_modules table)
    SELECT 
      um.module_key,
      true AS enabled,
      COALESCE(um.options, '{}'::jsonb) AS options
    FROM user_modules um
    WHERE um.user_id = p_user_id
  ),
  merged AS (
    -- Start with plan modules
    SELECT 
      pm.module_key,
      -- If user has an override, use it; otherwise use plan
      COALESCE(uo.enabled, pm.enabled) AS enabled,
      -- Merge options: plan options as base, user options override
      CASE 
        WHEN uo.module_key IS NOT NULL THEN 
          -- User override exists: merge plan options with user options (user wins)
          pm.options || uo.options
        ELSE 
          pm.options
      END AS options
    FROM plan_modules pm
    LEFT JOIN user_overrides uo ON uo.module_key = pm.module_key
    
    UNION ALL
    
    -- User modules NOT in plan (explicit user grants)
    SELECT 
      uo.module_key,
      uo.enabled,
      uo.options
    FROM user_overrides uo
    WHERE NOT EXISTS (
      SELECT 1 FROM plan_modules pm WHERE pm.module_key = uo.module_key
    )
  )
  SELECT m.module_key::text, m.enabled, m.options
  FROM merged m
  WHERE m.enabled = true;
END;
$$;