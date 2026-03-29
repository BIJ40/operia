CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id uuid)
RETURNS TABLE (
  module_key       text,
  granted          boolean,
  access_level     text,
  options          jsonb,
  node_type        text,
  source_summary   text,
  preconditions_ok boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id   uuid;
  v_global_role text;
  v_role_level  integer;
  v_plan_id     uuid;
BEGIN

  SELECT p.agency_id, p.global_role
  INTO   v_agency_id, v_global_role
  FROM   profiles p
  WHERE  p.id = p_user_id;

  v_role_level := CASE v_global_role
    WHEN 'superadmin'       THEN 6
    WHEN 'platform_admin'   THEN 5
    WHEN 'franchisor_admin' THEN 4
    WHEN 'franchisor_user'  THEN 3
    WHEN 'franchisee_admin' THEN 2
    WHEN 'franchisee_user'  THEN 1
    ELSE 0
  END;

  IF v_agency_id IS NOT NULL THEN
    SELECT ap.plan_id
    INTO   v_plan_id
    FROM   agency_plan ap
    WHERE  ap.agency_id = v_agency_id
      AND  ap.status = 'active'
    ORDER  BY ap.created_at DESC
    LIMIT  1;

    IF v_plan_id IS NULL THEN
      SELECT pc.id
      INTO   v_plan_id
      FROM   plan_catalog pc
      WHERE  pc.key = 'core'
        AND  pc.is_active = true;
    END IF;
  END IF;

  RETURN QUERY
  WITH

  bypass_mods AS (
    SELECT
      mc.key, true, 'full'::text, '{}'::jsonb, mc.node_type, 'bypass'::text, true
    FROM module_catalog mc
    WHERE mc.is_deployed = true AND v_role_level >= 5
  ),

  core_mods AS (
    SELECT
      mc.key, true, 'full'::text, '{}'::jsonb, mc.node_type, 'is_core'::text, true
    FROM module_catalog mc
    WHERE mc.is_core = true AND mc.is_deployed = true AND mc.min_role <= v_role_level
  ),

  plan_mods AS (
    SELECT
      mc.key, true, pmg.access_level, COALESCE(pmg.options_default, '{}'), mc.node_type, 'plan'::text, true
    FROM module_catalog mc
    JOIN module_distribution_rules mdr ON mdr.module_key = mc.key AND mdr.via_plan = true
    JOIN plan_module_grants pmg ON pmg.module_key = mc.key AND pmg.plan_id = v_plan_id
    WHERE mc.is_deployed = true AND mc.min_role <= v_role_level
      AND pmg.access_level <> 'none' AND v_role_level >= 2 AND v_plan_id IS NOT NULL
  ),

  option_mods AS (
    SELECT
      mc.key, true, ame.access_level, '{}'::jsonb, mc.node_type, 'option_agence'::text, true
    FROM module_catalog mc
    JOIN module_distribution_rules mdr ON mdr.module_key = mc.key AND mdr.via_agency_option = true
    JOIN agency_module_entitlements ame ON ame.module_key = mc.key AND ame.agency_id = v_agency_id
    WHERE mc.is_deployed = true AND mc.min_role <= v_role_level
      AND ame.is_active = true AND v_agency_id IS NOT NULL
      AND (ame.expires_at IS NULL OR ame.expires_at > now())
      AND (ame.trial_ends_at IS NULL OR ame.trial_ends_at > now())
  ),

  user_mods AS (
    SELECT
      mc.key, ua.granted, ua.access_level, COALESCE(ua.options, '{}'), mc.node_type, ua.source, true
    FROM module_catalog mc
    JOIN user_access ua ON ua.module_key = mc.key AND ua.user_id = p_user_id AND ua.granted = true
    WHERE mc.is_deployed = true AND mc.min_role <= v_role_level
      AND (
        v_role_level <> 1
        OR EXISTS (SELECT 1 FROM plan_module_grants pmg2 WHERE pmg2.module_key = mc.key AND pmg2.plan_id = v_plan_id)
        OR EXISTS (SELECT 1 FROM agency_module_entitlements ame2 WHERE ame2.module_key = mc.key AND ame2.agency_id = v_agency_id AND ame2.is_active = true)
      )
  ),

  deny_keys AS (
    SELECT ua.module_key AS denied_key
    FROM user_access ua
    WHERE ua.user_id = p_user_id AND ua.granted = false AND v_role_level < 5
  ),

  all_mods AS (
    SELECT * FROM bypass_mods WHERE v_role_level >= 5
    UNION ALL
    SELECT * FROM core_mods WHERE v_role_level < 5
    UNION ALL
    SELECT * FROM plan_mods WHERE v_role_level < 5
    UNION ALL
    SELECT * FROM option_mods WHERE v_role_level < 5
    UNION ALL
    SELECT * FROM user_mods WHERE v_role_level < 5
  ),

  resolved AS (
    SELECT DISTINCT ON (mod_key)
      mod_key, mod_granted, mod_access_level, mod_options, mod_node_type, mod_source, mod_preconditions_ok
    FROM (
      SELECT
        a.key AS mod_key, a.granted AS mod_granted, a.access_level AS mod_access_level,
        a.options AS mod_options, a.node_type AS mod_node_type, a.source_summary AS mod_source,
        a.preconditions_ok AS mod_preconditions_ok
      FROM all_mods a(key, granted, access_level, options, node_type, source_summary, preconditions_ok)
    ) sub
    WHERE mod_key NOT IN (SELECT denied_key FROM deny_keys)
      AND mod_node_type <> 'section'
    ORDER BY mod_key,
      CASE mod_source
        WHEN 'bypass' THEN 0
        WHEN 'is_core' THEN 1
        WHEN 'plan' THEN 2
        WHEN 'option_agence' THEN 3
        ELSE 4
      END
  ),

  section_mods AS (
    SELECT DISTINCT
      mc.key, true, 'full'::text, '{}'::jsonb, 'section'::text, 'auto_section'::text, true
    FROM module_catalog mc
    WHERE mc.node_type = 'section' AND mc.is_deployed = true
      AND EXISTS (SELECT 1 FROM resolved r WHERE r.mod_key LIKE mc.key || '.%')
  )

  SELECT r.mod_key, r.mod_granted, r.mod_access_level, r.mod_options, r.mod_node_type, r.mod_source, r.mod_preconditions_ok
  FROM resolved r
  UNION ALL
  SELECT s.key, s.granted, s.access_level, s.options, s.node_type, s.source_summary, s.preconditions_ok
  FROM section_mods s(key, granted, access_level, options, node_type, source_summary, preconditions_ok)
  WHERE NOT EXISTS (SELECT 1 FROM resolved r2 WHERE r2.mod_key = s.key);

END;
$$;