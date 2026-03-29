-- BLOC 2: Seed des 3 plans
INSERT INTO plan_catalog (key, label, description, color, sort_order, is_active, is_system)
VALUES
  ('core',         'CORE',         'Plan de base — modules opérationnels essentiels',      '#3b82f6', 1, true,  true),
  ('pilot',        'PILOT',        'Plan avancé — pilotage et optimisation',                '#7c3aed', 2, true,  true),
  ('intelligence', 'INTELLIGENCE', 'Plan premium — pilotage intelligent — dormant',         '#d97706', 3, false, false);

-- BLOC 4: Migrer plan_tier_modules → plan_module_grants
-- STARTER → CORE
INSERT INTO plan_module_grants (plan_id, module_key, access_level)
SELECT
  (SELECT id FROM plan_catalog WHERE key = 'core'),
  ptm.module_key,
  'full'
FROM plan_tier_modules ptm
WHERE ptm.tier_key = 'STARTER'
  AND ptm.enabled = true
  AND EXISTS (SELECT 1 FROM module_catalog mc WHERE mc.key = ptm.module_key)
ON CONFLICT DO NOTHING;

-- PRO → PILOT
INSERT INTO plan_module_grants (plan_id, module_key, access_level)
SELECT
  (SELECT id FROM plan_catalog WHERE key = 'pilot'),
  ptm.module_key,
  'full'
FROM plan_tier_modules ptm
WHERE ptm.tier_key = 'PRO'
  AND ptm.enabled = true
  AND EXISTS (SELECT 1 FROM module_catalog mc WHERE mc.key = ptm.module_key)
ON CONFLICT DO NOTHING;