-- ============================================================
-- PATCH V1 — get_user_effective_modules
-- Date : 29 mars 2026
-- Bugs corrigés : A (modules NONE), B (N0/N1 bloqués),
--                 C (ghost keys), D (billing bypass),
--                 E (suivi_client STARTER manquant)
--
-- ORDRE D'EXÉCUTION :
--   1. Exécuter ce fichier entier dans l'éditeur SQL Supabase
--   2. Vérifier les 2 requêtes de contrôle à la fin (doivent retourner 0)
--   3. Tester avec SELECT * FROM get_user_effective_modules('<user_id>')
-- ============================================================


-- ============================================================
-- ÉTAPE 1 : PATCH DATA
-- ============================================================

-- FIX E : ajouter commercial.suivi_client dans le plan STARTER
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'commercial.suivi_client', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = true;

-- Nettoyage : supprimer les lignes enabled=false (données mortes)
DELETE FROM plan_tier_modules WHERE enabled = false;

-- Remap des legacy keys dans user_modules
UPDATE user_modules SET module_key = 'support.aide_en_ligne'
  WHERE module_key = 'aide'
  AND NOT EXISTS (SELECT 1 FROM user_modules u2
    WHERE u2.user_id = user_modules.user_id AND u2.module_key = 'support.aide_en_ligne');

UPDATE user_modules SET module_key = 'support.guides'
  WHERE module_key = 'guides'
  AND NOT EXISTS (SELECT 1 FROM user_modules u2
    WHERE u2.user_id = user_modules.user_id AND u2.module_key = 'support.guides');

UPDATE user_modules SET module_key = 'organisation.salaries'
  WHERE module_key = 'rh'
  AND NOT EXISTS (SELECT 1 FROM user_modules u2
    WHERE u2.user_id = user_modules.user_id AND u2.module_key = 'organisation.salaries');

UPDATE user_modules SET module_key = 'pilotage.statistiques'
  WHERE module_key = 'agence'
  AND NOT EXISTS (SELECT 1 FROM user_modules u2
    WHERE u2.user_id = user_modules.user_id AND u2.module_key = 'pilotage.statistiques');

-- parc et agence : module non déployé → suppression
DELETE FROM user_modules WHERE module_key IN ('parc', 'agence', 'aide', 'guides', 'rh');


-- ============================================================
-- ÉTAPE 2 : RPC PATCHÉ
-- ============================================================

-- ============================================================
-- MIGRATION COMPLÈTE — RPC get_user_effective_modules patché
-- À exécuter dans l'éditeur SQL Supabase (branche dev)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_effective_modules(p_user_id uuid)
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

  -- PATH 1 : modules via plan (required_plan != NONE)
  -- FIX B : plus de filtre role_level >= 2
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

  -- PATH 2 : modules hors plan (required_plan = NONE) — FIX A
  role_based_modules AS (
    SELECT dt.key AS module_key,
           true AS enabled,
           '{}'::jsonb AS options
    FROM deployed_tree dt
    WHERE dt.effective_deployed = true
      AND dt.effective_plan = 'NONE'
      AND (v_role_level >= 5 OR dt.min_role <= v_role_level)
  ),

  -- Overrides individuels avec validation clé — FIX C
  user_override_expanded AS (
    SELECT um.module_key, true AS enabled,
           COALESCE(um.options, '{}'::jsonb) AS options, true AS is_direct
    FROM user_modules um
    JOIN module_registry mr_check ON mr_check.key = um.module_key  -- FIX C
    WHERE um.user_id = p_user_id
    UNION ALL
    SELECT mr.key AS module_key, true AS enabled, '{}'::jsonb AS options, false AS is_direct
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
      uoe.module_key, uoe.enabled, uoe.options
    FROM user_override_expanded uoe
    ORDER BY uoe.module_key, uoe.is_direct DESC
  ),

  -- Overrides avec contrainte plan — FIX D
  user_overrides_checked AS (
    SELECT uo.module_key, uo.enabled, uo.options
    FROM user_overrides uo
    JOIN module_registry mr ON mr.key = uo.module_key
    WHERE
      v_role_level >= 5                                          -- N5+ bypass total
      OR mr.required_plan = 'NONE'                              -- pas de contrainte plan
      OR (mr.required_plan = 'STARTER' AND v_tier_key IS NOT NULL) -- STARTER : toute agence
      OR (mr.required_plan = 'PRO' AND v_tier_key = 'PRO')     -- PRO : agence PRO seulement
  ),

  ancestor_grants AS (
    SELECT DISTINCT sub.ancestor_key AS module_key, true AS enabled, '{}'::jsonb AS options
    FROM (
      SELECT array_to_string((string_to_array(um.module_key, '.'))[1:n], '.') AS ancestor_key
      FROM user_modules um
      CROSS JOIN generate_series(1, array_length(string_to_array(um.module_key, '.'), 1) - 1) AS n
      WHERE um.user_id = p_user_id
        AND array_length(string_to_array(um.module_key, '.'), 1) > 1
    ) sub
    JOIN module_registry mr ON mr.key = sub.ancestor_key AND mr.is_deployed = true
    WHERE NOT EXISTS (SELECT 1 FROM registry_modules rm WHERE rm.module_key = sub.ancestor_key)
      AND NOT EXISTS (SELECT 1 FROM role_based_modules rbm WHERE rbm.module_key = sub.ancestor_key)
      AND NOT EXISTS (SELECT 1 FROM user_overrides_checked uo WHERE uo.module_key = sub.ancestor_key)
  ),

  merged AS (
    -- Plan + override
    SELECT rm.module_key,
           COALESCE(uo.enabled, rm.enabled) AS enabled,
           CASE WHEN uo.module_key IS NOT NULL THEN rm.options || uo.options ELSE rm.options END AS options
    FROM registry_modules rm
    LEFT JOIN user_overrides_checked uo ON uo.module_key = rm.module_key

    UNION ALL

    -- Rôle-based + override
    SELECT rbm.module_key,
           COALESCE(uo.enabled, rbm.enabled) AS enabled,
           CASE WHEN uo.module_key IS NOT NULL THEN rbm.options || uo.options ELSE rbm.options END AS options
    FROM role_based_modules rbm
    LEFT JOIN user_overrides_checked uo ON uo.module_key = rbm.module_key

    UNION ALL

    -- Overrides purs (non couverts par plan ni rôle)
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


-- ============================================================
-- ÉTAPE 3 : VÉRIFICATIONS POST-PATCH
-- ============================================================

-- Doit retourner 0 ligne (plus de ghost keys)
SELECT module_key, COUNT(*) as nb_users
FROM user_modules
WHERE module_key NOT IN (SELECT key FROM module_registry)
GROUP BY module_key;

-- Doit retourner 1 ligne avec enabled=true
SELECT * FROM plan_tier_modules
WHERE module_key = 'commercial.suivi_client' AND tier_key = 'STARTER';

-- Test rapide sur un utilisateur réel (remplacer l'UUID)
-- SELECT * FROM get_user_effective_modules('9b80c88a-546c-4329-b04a-6977c5e46fad');

