-- Fix get_module_options_v2: user_modules → user_access
CREATE OR REPLACE FUNCTION public.get_module_options_v2(_user_id uuid, _module_key text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT COALESCE(options, '{}'::jsonb)
  FROM public.user_access
  WHERE user_id = _user_id AND module_key = _module_key AND granted = true
$$;

-- Fix has_module_option_v2: user_modules → user_access
CREATE OR REPLACE FUNCTION public.has_module_option_v2(p_user_id uuid, p_module_key text, p_option_key text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_access
    WHERE user_id = p_user_id
      AND module_key = p_module_key
      AND granted = true
      AND COALESCE((options->>p_option_key)::boolean, false) = true
  )
  OR has_min_global_role(p_user_id, 5)
$$;

-- Fix get_user_effective_modules: replace user_modules references with user_access
CREATE OR REPLACE FUNCTION public.get_user_effective_modules(p_user_id uuid)
 RETURNS TABLE(module_key text, enabled boolean, options jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
    WHEN 'base_user'        THEN 0
    WHEN 'franchisee_user'  THEN 1
    WHEN 'franchisee_admin' THEN 2
    WHEN 'franchisor_user'  THEN 3
    WHEN 'franchisor_admin' THEN 4
    WHEN 'platform_admin'   THEN 5
    WHEN 'superadmin'       THEN 6
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

  registry_modules AS (
    SELECT dt.key AS module_key,
           COALESCE(ptm.enabled, false) AS enabled,
           COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM deployed_tree dt
    LEFT JOIN plan_tier_modules ptm
      ON ptm.module_key = dt.key AND ptm.tier_key = v_tier_key
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND v_tier_key IS NOT NULL
      AND (v_tier_key = 'PRO' OR dt.effective_plan = 'STARTER')
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
      AND COALESCE(ptm.enabled, false) = true
  ),

  role_based_modules AS (
    SELECT dt.key AS module_key,
           true AS enabled,
           '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan = 'NONE'
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
  ),

  user_override_expanded AS (
    SELECT ua.module_key, true AS enabled,
           COALESCE(ua.options, '{}'::jsonb) AS options, true AS is_direct
    FROM user_access ua
    JOIN module_registry mr_check ON mr_check.key = ua.module_key
    WHERE ua.user_id = p_user_id AND ua.granted = true
    UNION ALL
    SELECT mr.key AS module_key, true AS enabled, '{}'::jsonb AS options, false AS is_direct
    FROM user_override_expanded uoe
    JOIN module_registry mr ON mr.parent_key = uoe.module_key
    WHERE mr.is_deployed = true
      AND (v_role_level >= 5 OR mr.min_role <= v_role_level)
      AND NOT EXISTS (
        SELECT 1 FROM user_access ua2
        WHERE ua2.user_id = p_user_id AND ua2.module_key = mr.key AND ua2.granted = true
      )
  ),

  user_overrides AS (
    SELECT DISTINCT ON (uoe.module_key)
      uoe.module_key, uoe.enabled, uoe.options
    FROM user_override_expanded uoe
    ORDER BY uoe.module_key, uoe.is_direct DESC
  ),

  user_overrides_checked AS (
    SELECT uo.module_key, uo.enabled, uo.options
    FROM user_overrides uo
    JOIN module_registry mr ON mr.key = uo.module_key
    WHERE
      v_role_level >= 5
      OR mr.required_plan = 'NONE'
      OR (mr.required_plan = 'STARTER' AND v_tier_key IS NOT NULL)
      OR (mr.required_plan = 'PRO' AND v_tier_key = 'PRO')
  ),

  ancestor_grants AS (
    SELECT DISTINCT sub.ancestor_key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM (
      SELECT array_to_string((string_to_array(ua.module_key, '.'))[1:n], '.') AS ancestor_key
      FROM user_access ua
      CROSS JOIN generate_series(1, array_length(string_to_array(ua.module_key, '.'), 1) - 1) AS n
      WHERE ua.user_id = p_user_id AND ua.granted = true
        AND array_length(string_to_array(ua.module_key, '.'), 1) > 1
    ) sub
    JOIN module_registry mr ON mr.key = sub.ancestor_key AND mr.is_deployed = true
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = sub.ancestor_key)
      AND NOT EXISTS (SELECT 1 FROM role_based_modules rbm WHERE rbm.module_key = sub.ancestor_key)
      AND NOT EXISTS (SELECT 1 FROM user_overrides_checked uo WHERE uo.module_key = sub.ancestor_key)
  ),

  merged AS (
    SELECT rm.module_key,
           COALESCE(uo.enabled, rm.enabled) AS enabled,
           CASE WHEN uo.module_key IS NOT NULL THEN rm.options || uo.options ELSE rm.options END AS options
    FROM registry_modules rm
    LEFT JOIN user_overrides_checked uo ON uo.module_key = rm.module_key

    UNION ALL

    SELECT rbm.module_key,
           COALESCE(uo.enabled, rbm.enabled) AS enabled,
           CASE WHEN uo.module_key IS NOT NULL THEN rbm.options || uo.options ELSE rbm.options END AS options
    FROM role_based_modules rbm
    LEFT JOIN user_overrides_checked uo ON uo.module_key = rbm.module_key

    UNION ALL

    SELECT uo.module_key, uo.enabled, uo.options
    FROM user_overrides_checked uo
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = uo.module_key)
      AND NOT EXISTS (SELECT 1 FROM role_based_modules rbm WHERE rbm.module_key = uo.module_key)

    UNION ALL

    SELECT ag.module_key, ag.enabled, ag.options FROM ancestor_grants ag
  )

  SELECT m.module_key::text, m.enabled, m.options
  FROM merged m
  WHERE m.enabled = true;

END;
$function$;