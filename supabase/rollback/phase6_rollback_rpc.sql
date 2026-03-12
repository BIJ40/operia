-- ============================================================================
-- PHASE 6 ROLLBACK — RPC Stabilization
-- 
-- Execute this file to revert ALL Phase 6 changes:
--   1. Restore module_registry metadata to pre-Phase-6 values
--   2. Restore get_user_effective_modules to pre-Phase-6 version
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ============================================================================
-- BLOC 1: Restore module_registry metadata (6 rows)
-- ============================================================================

UPDATE module_registry SET required_plan = 'STARTER' WHERE key = 'pilotage.dashboard';
UPDATE module_registry SET min_role = 1 WHERE key = 'organisation.salaries';
UPDATE module_registry SET min_role = 1 WHERE key = 'organisation.parc';
UPDATE module_registry SET min_role = 1 WHERE key = 'organisation.apporteurs';
UPDATE module_registry SET min_role = 1 WHERE key = 'organisation.reunions';
UPDATE module_registry SET min_role = 0 WHERE key = 'mediatheque.documents';

-- ============================================================================
-- BLOC 2: Restore get_user_effective_modules (verbatim pre-Phase-6 version)
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
  registry_modules AS (
    SELECT dt.key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan != 'NONE'
      AND (
        v_tier_key = 'PRO'
        OR dt.effective_plan = 'STARTER'
      )
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
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
