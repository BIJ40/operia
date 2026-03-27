CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
RETURNS TABLE(module_key text, enabled boolean, options jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_tier_key text;
  v_global_role text;
  v_role_level integer;
BEGIN
  SELECT p.agency_id, p.global_role INTO v_agency_id, v_global_role
  FROM profiles p
  WHERE p.id = p_user_id;

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

  IF v_agency_id IS NOT NULL THEN
    SELECT s.tier_key INTO v_tier_key
    FROM agency_subscription s
    WHERE s.agency_id = v_agency_id
      AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
  END IF;

  -- Only default to STARTER if user HAS an agency
  v_tier_key := CASE
    WHEN v_agency_id IS NOT NULL THEN COALESCE(UPPER(v_tier_key), 'STARTER')
    ELSE NULL
  END;

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
  -- PLAN-BASED MODULES: only when user has an agency (v_tier_key is not null)
  registry_modules AS (
    SELECT dt.key AS module_key,
           COALESCE(ptm.enabled, false) AS enabled,
           COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM deployed_tree dt
    LEFT JOIN plan_tier_modules ptm
      ON ptm.module_key = dt.key AND ptm.tier_key = v_tier_key
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND v_tier_key IS NOT NULL  -- No plan inheritance without agency
      AND (
        v_tier_key = 'PRO'
        OR dt.effective_plan = 'STARTER'
      )
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
      AND COALESCE(ptm.enabled, false) = true
      AND v_role_level >= 2  -- N1 (role_level=1) excluded from plan-based path
  ),
  user_override_expanded AS (
    SELECT 
      um.module_key,
      true AS enabled,
      COALESCE(um.options, '{}'::jsonb) AS options,
      true AS is_direct
    FROM user_modules um
    WHERE um.user_id = p_user_id
    
    UNION ALL
    
    SELECT 
      mr.key AS module_key,
      true AS enabled,
      '{}'::jsonb AS options,
      false AS is_direct
    FROM user_override_expanded uoe
    JOIN module_registry mr ON mr.parent_key = uoe.module_key
    WHERE mr.is_deployed = true
      AND (v_role_level >= 5 OR mr.min_role <= v_role_level)
      AND NOT EXISTS (
        SELECT 1 FROM user_modules um2
        WHERE um2.user_id = p_user_id AND um2.module_key = mr.key
      )
  ),
  user_overrides AS (
    SELECT DISTINCT ON (uoe.module_key)
      uoe.module_key,
      uoe.enabled,
      uoe.options
    FROM user_override_expanded uoe
    ORDER BY uoe.module_key, uoe.is_direct DESC
  ),
  ancestor_grants AS (
    SELECT DISTINCT sub.ancestor_key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM (
      SELECT
        array_to_string((string_to_array(um.module_key, '.'))[1:n], '.') AS ancestor_key
      FROM user_modules um
      CROSS JOIN generate_series(1, array_length(string_to_array(um.module_key, '.'), 1) - 1) AS n
      WHERE um.user_id = p_user_id
        AND array_length(string_to_array(um.module_key, '.'), 1) > 1
    ) sub
    JOIN module_registry mr ON mr.key = sub.ancestor_key AND mr.is_deployed = true
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = sub.ancestor_key)
      AND NOT EXISTS (SELECT 1 FROM user_overrides uo WHERE uo.module_key = sub.ancestor_key)
  ),
  merged AS (
    SELECT 
      rm.module_key,
      COALESCE(uo.enabled, rm.enabled) AS enabled,
      CASE 
        WHEN uo.module_key IS NOT NULL THEN rm.options || uo.options
        ELSE rm.options
      END AS options
    FROM registry_modules rm
    LEFT JOIN user_overrides uo ON uo.module_key = rm.module_key
    
    UNION ALL
    
    SELECT 
      uo.module_key,
      uo.enabled,
      uo.options
    FROM user_overrides uo
    WHERE NOT EXISTS (
      SELECT 1 FROM registry_modules rm WHERE rm.module_key = uo.module_key
    )
    
    UNION ALL
    
    SELECT ag.module_key, ag.enabled, ag.options FROM ancestor_grants ag
  )
  SELECT m.module_key::text, m.enabled, m.options
  FROM merged m
  WHERE m.enabled = true;
END;
$$;