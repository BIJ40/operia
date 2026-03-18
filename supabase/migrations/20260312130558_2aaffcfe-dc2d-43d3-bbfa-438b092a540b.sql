
-- ============================================================================
-- BLOC 1: UPDATE — Corriger 2 entrées erronées dans plan_tier_modules
-- ============================================================================

-- commercial.realisations: required_plan=PRO dans registry, STARTER ne doit pas y accéder
UPDATE plan_tier_modules
SET enabled = false
WHERE module_key = 'commercial.realisations' AND tier_key = 'STARTER';

-- organisation.reunions: required_plan=PRO dans registry, STARTER ne doit pas y accéder
UPDATE plan_tier_modules
SET enabled = false
WHERE module_key = 'organisation.reunions' AND tier_key = 'STARTER';

-- ============================================================================
-- BLOC 2: INSERT — 8 clés catégorie A dans plan_tier_modules
-- ============================================================================

-- pilotage.statistiques.general: STARTER=true, PRO=true (required_plan=STARTER)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.general', true),
       ('PRO', 'pilotage.statistiques.general', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- pilotage.statistiques.apporteurs: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.apporteurs', false),
       ('PRO', 'pilotage.statistiques.apporteurs', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- pilotage.statistiques.techniciens: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.techniciens', false),
       ('PRO', 'pilotage.statistiques.techniciens', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- pilotage.statistiques.univers: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.univers', false),
       ('PRO', 'pilotage.statistiques.univers', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- pilotage.statistiques.sav: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.sav', false),
       ('PRO', 'pilotage.statistiques.sav', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- pilotage.statistiques.previsionnel: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.previsionnel', false),
       ('PRO', 'pilotage.statistiques.previsionnel', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- mediatheque.gerer: STARTER=true, PRO=true (required_plan=STARTER)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'mediatheque.gerer', true),
       ('PRO', 'mediatheque.gerer', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- mediatheque.corbeille: STARTER=false, PRO=true (required_plan=PRO)
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'mediatheque.corbeille', false),
       ('PRO', 'mediatheque.corbeille', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ============================================================================
-- BLOC 3: RPC FAIL-CLOSED — Remplacer COALESCE(ptm.enabled, true) par false
-- ============================================================================

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
  -- FAIL-CLOSED: Keys without explicit plan_tier_modules entry are DENIED
  registry_modules AS (
    SELECT dt.key AS module_key,
           COALESCE(ptm.enabled, false) AS enabled,
           COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM deployed_tree dt
    LEFT JOIN plan_tier_modules ptm
      ON ptm.module_key = dt.key AND ptm.tier_key = v_tier_key
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (
        v_tier_key = 'PRO'
        OR dt.effective_plan = 'STARTER'
      )
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
      AND COALESCE(ptm.enabled, false) = true
  ),
  legacy_plan_modules AS (
    SELECT 
      ptm.module_key,
      COALESCE(ptm.enabled, false) AS enabled,
      COALESCE(ptm.options_override, '{}'::jsonb) AS options
    FROM plan_tier_modules ptm
    LEFT JOIN module_registry mr ON mr.key = ptm.module_key
    WHERE ptm.tier_key = v_tier_key
      AND COALESCE(ptm.enabled, false) = true
      -- FIX: Apply min_role filter (default 2 for unknown legacy keys)
      AND (v_role_level >= 5 OR COALESCE(mr.min_role, 2) <= v_role_level)
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
