-- Phase 5 Bloc B: Insert 3 missing hierarchical keys into module_registry
-- ADDITIVE ONLY — no deletions, COMPAT_MAP remains active

INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES
  ('pilotage.agence',       'Agence',    'pilotage',    'section', 50, true, 'STARTER', 2),
  ('pilotage.dashboard',    'Dashboard', 'pilotage',    'section', 10, true, 'STARTER', 2),
  ('mediatheque.documents', 'Documents', 'mediatheque', 'section', 10, true, 'STARTER', 0)
ON CONFLICT (key) DO NOTHING;

-- Phase 5 Bloc C: Duplicate 10 legacy keys as new hierarchical keys in plan_tier_modules
-- ADDITIVE ONLY — legacy rows preserved intact

INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
SELECT tier_key,
       CASE module_key
         WHEN 'agence' THEN 'pilotage.agence'
         WHEN 'stats' THEN 'pilotage.dashboard'
         WHEN 'rh' THEN 'organisation.salaries'
         WHEN 'parc' THEN 'organisation.parc'
         WHEN 'divers_apporteurs' THEN 'organisation.apporteurs'
         WHEN 'divers_plannings' THEN 'organisation.plannings'
         WHEN 'divers_reunions' THEN 'organisation.reunions'
         WHEN 'divers_documents' THEN 'mediatheque.documents'
         WHEN 'aide' THEN 'support.aide_en_ligne'
         WHEN 'guides' THEN 'support.guides'
       END,
       enabled,
       options_override
FROM plan_tier_modules
WHERE module_key IN ('agence','stats','rh','parc','divers_apporteurs','divers_plannings','divers_reunions','divers_documents','aide','guides')
ON CONFLICT (tier_key, module_key) DO NOTHING;