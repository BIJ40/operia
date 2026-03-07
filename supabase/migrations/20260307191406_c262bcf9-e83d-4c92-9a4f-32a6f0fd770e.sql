
-- 1. Remove 'aide.agent' from registry (it's a user role, not a module)
DELETE FROM module_registry WHERE key = 'aide.agent';

-- 2. Add NONE to the required_plan CHECK constraint
ALTER TABLE module_registry DROP CONSTRAINT IF EXISTS module_registry_required_plan_check;
ALTER TABLE module_registry ADD CONSTRAINT module_registry_required_plan_check 
  CHECK (required_plan IN ('STARTER', 'PRO', 'NONE'));

-- 3. Set ticketing and its children to NONE (individual attribution only)
UPDATE module_registry SET required_plan = 'NONE' WHERE key LIKE 'ticketing%';

-- 4. Update RPC to handle NONE (NONE modules are never included via plan, only via user_modules)
CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
 RETURNS TABLE(module_key text, enabled boolean, options jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid;
  v_tier_key text;
BEGIN
  SELECT p.agency_id INTO v_agency_id
  FROM profiles p
  WHERE p.id = p_user_id;

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
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan,
           mr.is_deployed AS effective_deployed,
           mr.required_plan AS effective_plan
    FROM module_registry mr
    WHERE mr.parent_key IS NULL
    
    UNION ALL
    
    SELECT mr.key, mr.parent_key, mr.is_deployed, mr.required_plan,
           (dt.effective_deployed AND mr.is_deployed) AS effective_deployed,
           mr.required_plan AS effective_plan
    FROM module_registry mr
    JOIN deployed_tree dt ON mr.parent_key = dt.key
  ),
  registry_modules AS (
    -- NONE modules are NEVER included via plan (only via user_modules)
    SELECT dt.key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (
        v_tier_key = 'PRO'
        OR dt.effective_plan = 'STARTER'
      )
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
