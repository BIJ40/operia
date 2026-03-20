-- Register BD Story module
INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('commercial.bd_story', 'BD Story', 'commercial', 'feature', 55, false, 'PRO', 2)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- Activate in plan_tier_modules for PRO
INSERT INTO plan_tier_modules (tier_key, module_key, enabled, options_override)
VALUES ('PRO', 'commercial.bd_story', true, '{}')
ON CONFLICT (tier_key, module_key) DO NOTHING;