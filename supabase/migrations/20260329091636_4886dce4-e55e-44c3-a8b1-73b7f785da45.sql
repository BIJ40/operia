-- BLOC 3: Migrate module_registry → module_catalog
INSERT INTO module_catalog (key, parent_key, label, node_type, min_role, is_deployed, sort_order, category)
SELECT
  mr.key, mr.parent_key, mr.label,
  CASE mr.node_type
    WHEN 'module'  THEN 'section'
    WHEN 'section' THEN 'section'
    WHEN 'screen'  THEN 'screen'
    WHEN 'feature' THEN 'feature'
    ELSE 'screen'
  END,
  mr.min_role, mr.is_deployed, mr.sort_order,
  split_part(mr.key, '.', 1)
FROM module_registry mr
ON CONFLICT (key) DO NOTHING;

-- BLOC 4: Marquer les modules socle
UPDATE module_catalog
SET is_core = true
WHERE key IN ('accueil', 'support.guides', 'support.aide_en_ligne', 'ticketing');

-- BLOC 5: Seed module_distribution_rules
INSERT INTO module_distribution_rules (
  module_key, via_plan, via_agency_option, via_user_assignment, assignable_by_scope
)
SELECT
  mr.key,
  (mr.required_plan IN ('STARTER', 'PRO')),
  false,
  (mr.key IN ('ticketing', 'support.guides')),
  CASE
    WHEN mr.key IN ('ticketing', 'support.guides') THEN 'both'
    ELSE 'none'
  END
FROM module_registry mr
ON CONFLICT (module_key) DO NOTHING;

-- BLOC 6 data: Insert feature flag
INSERT INTO app_feature_flags (key, enabled, description)
VALUES (
  'USE_PERMISSIONS_V2',
  false,
  'Active le système de permissions V2. false = V1 actif. Bascule en Phase 16.'
) ON CONFLICT (key) DO NOTHING;