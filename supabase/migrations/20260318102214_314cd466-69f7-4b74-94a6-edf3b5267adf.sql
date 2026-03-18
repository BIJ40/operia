
-- 1. Insert 4 new commercial sub-modules into module_registry
INSERT INTO module_registry (key, label, parent_key, node_type, is_deployed, sort_order)
VALUES
  ('commercial.suivi_client', 'Suivi client', 'commercial', 'feature', true, 10),
  ('commercial.comparateur', 'Comparateur', 'commercial', 'feature', true, 20),
  ('commercial.veille', 'Veille', 'commercial', 'feature', true, 30),
  ('commercial.prospects', 'Prospects', 'commercial', 'feature', true, 40)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  node_type = EXCLUDED.node_type,
  is_deployed = EXCLUDED.is_deployed;

-- 2. Migrate plan_tier_modules: for each tier that has 'prospection' enabled,
--    create corresponding commercial.* entries
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
SELECT 
  ptm.tier_key,
  new_key.key,
  ptm.enabled,
  NULL
FROM plan_tier_modules ptm
CROSS JOIN (
  VALUES 
    ('commercial.suivi_client', 'dashboard'),
    ('commercial.comparateur', 'comparateur'),
    ('commercial.veille', 'veille'),
    ('commercial.prospects', 'prospects')
) AS new_key(key, option_key)
WHERE ptm.module_key = 'prospection'
  AND ptm.enabled = true
  AND (
    ptm.options_override IS NULL 
    OR (ptm.options_override->new_key.option_key)::text = 'true'
  )
ON CONFLICT (tier_key, module_key) DO NOTHING;
