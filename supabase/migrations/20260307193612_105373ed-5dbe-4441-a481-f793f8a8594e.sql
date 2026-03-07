
-- Add min_role column to module_registry
-- Values: 0=base_user, 1=franchisee_user, 2=franchisee_admin, 3=franchisor_user, 4=franchisor_admin, 5=platform_admin, 6=superadmin
ALTER TABLE public.module_registry ADD COLUMN min_role INTEGER NOT NULL DEFAULT 0;

-- Seed min_role values based on current hardcoded MODULE_DEFINITIONS
-- Root sections
UPDATE public.module_registry SET min_role = 2 WHERE key = 'stats';        -- franchisee_admin
UPDATE public.module_registry SET min_role = 2 WHERE key = 'salaries';     -- franchisee_admin
UPDATE public.module_registry SET min_role = 2 WHERE key = 'outils';       -- franchisee_admin
UPDATE public.module_registry SET min_role = 2 WHERE key = 'documents';    -- franchisee_admin
UPDATE public.module_registry SET min_role = 0 WHERE key = 'guides';       -- base_user
UPDATE public.module_registry SET min_role = 0 WHERE key = 'ticketing';    -- base_user
UPDATE public.module_registry SET min_role = 0 WHERE key = 'aide';         -- base_user

-- Stats children: inherit from parent (2)
UPDATE public.module_registry SET min_role = 2 WHERE parent_key = 'stats';

-- Salaries children
UPDATE public.module_registry SET min_role = 2 WHERE parent_key = 'salaries';

-- Outils children
UPDATE public.module_registry SET min_role = 2 WHERE key LIKE 'outils.%';

-- Documents children
UPDATE public.module_registry SET min_role = 2 WHERE parent_key = 'documents';

-- Guides children: base_user
UPDATE public.module_registry SET min_role = 0 WHERE parent_key = 'guides';

-- Ticketing children: base_user, except import which needs platform_admin
UPDATE public.module_registry SET min_role = 0 WHERE parent_key = 'ticketing';
UPDATE public.module_registry SET min_role = 5 WHERE key = 'ticketing.import';

-- Aide children: base_user
UPDATE public.module_registry SET min_role = 0 WHERE parent_key = 'aide';

-- Update the RPC to filter by min_role server-side
CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
 RETURNS TABLE(module_key text, enabled boolean, options jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_tier_key text;
  v_global_role text;
  v_role_level integer;
BEGIN
  -- Get user's agency, role
  SELECT p.agency_id, p.global_role INTO v_agency_id, v_global_role
  FROM profiles p
  WHERE p.id = p_user_id;

  -- Compute role level
  v_role_level := CASE v_global_role
    WHEN 'base_user' THEN 0
    WHEN 'franchisee_user' THEN 1
    WHEN 'franchisee_admin' THEN 2
    WHEN 'franchisor_user' THEN 3
    WHEN 'franchisor_admin' THEN 4
    WHEN 'platform_admin' THEN 5
    WHEN 'superadmin' THEN 6
    ELSE 0
  END;

  -- N5+ bypass: skip min_role filtering
  -- (handled by NOT filtering below when v_role_level >= 5)

  IF v_agency_id IS NOT NULL THEN
    SELECT s.tier_key INTO v_tier_key
    FROM agency_subscription s
    WHERE s.agency_id = v_agency_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  v_tier_key := COALESCE(UPPER(v_tier_key), 'STARTER');

  RETURN QUERY
  WITH RECURSIVE deployed_tree AS (
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan, mr.min_role,
           mr.is_deployed AS effective_deployed,
           mr.required_plan AS effective_plan
    FROM module_registry mr
    WHERE mr.parent_key IS NULL
    
    UNION ALL
    
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan, mr.min_role,
           (dt.effective_deployed AND mr.is_deployed) AS effective_deployed,
           mr.required_plan AS effective_plan
    FROM module_registry mr
    JOIN deployed_tree dt ON mr.parent_key = dt.key
  ),
  registry_modules AS (
    SELECT dt.key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (
        v_tier_key = 'PRO'
        OR dt.effective_plan = 'STARTER'
      )
      -- min_role filter: N5+ bypass, others must meet min_role
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
  ),
  legacy_plan_modules AS (
    SELECT 
      ptm.module_key,
      COALESCE(ptm.enabled, false) AS enabled,
      COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM plan_tier_modules ptm
    WHERE ptm.tier_key = v_tier_key
      AND COALESCE(ptm.enabled, false) = true
  ),
  user_overrides AS (
    SELECT 
      um.module_key,
      true AS enabled,
      COALESCE(um.options, '{}'::jsonb) AS options
    FROM user_modules um
    WHERE um.user_id = p_user_id
  ),
  combined_base AS (
    SELECT rm.module_key, rm.enabled, rm.options FROM registry_modules rm
    UNION ALL
    SELECT lpm.module_key, lpm.enabled, lpm.options 
    FROM legacy_plan_modules lpm
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = lpm.module_key)
  ),
  merged AS (
    SELECT 
      cb.module_key,
      COALESCE(uo.enabled, cb.enabled) AS enabled,
      CASE 
        WHEN uo.module_key IS NOT NULL THEN cb.options || uo.options
        ELSE cb.options
      END AS options
    FROM combined_base cb
    LEFT JOIN user_overrides uo ON uo.module_key = cb.module_key
    
    UNION ALL
    
    SELECT 
      uo.module_key,
      uo.enabled,
      uo.options
    FROM user_overrides uo
    WHERE NOT EXISTS (
      SELECT 1 FROM combined_base cb WHERE cb.module_key = uo.module_key
    )
  )
  SELECT m.module_key::text, m.enabled, m.options
  FROM merged m
  WHERE m.enabled = true;
END;
$function$;
