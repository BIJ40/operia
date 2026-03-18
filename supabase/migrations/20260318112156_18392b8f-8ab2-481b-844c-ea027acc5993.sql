-- Add organisation.zones to module_registry
INSERT INTO module_registry (key, label, is_deployed, min_role, node_type, parent_key, required_plan, sort_order)
VALUES ('organisation.zones', 'Zones de déplacement', true, 2, 'section', 'organisation', 'PRO', 55)
ON CONFLICT (key) DO UPDATE SET is_deployed = true, label = 'Zones de déplacement';

-- Add to plan_tier_modules for PRO and STARTER
INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES 
  ('PRO', 'organisation.zones', true),
  ('STARTER', 'organisation.zones', false)
ON CONFLICT (tier_key, module_key) DO NOTHING;