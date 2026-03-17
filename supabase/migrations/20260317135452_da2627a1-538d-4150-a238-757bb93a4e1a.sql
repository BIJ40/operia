-- Register pilotage.rentabilite in module_registry
INSERT INTO module_registry (key, label, parent_key, node_type, required_plan, min_role, is_deployed, sort_order)
VALUES ('pilotage.rentabilite', 'Rentabilité Dossier', 'pilotage', 'section', 'PRO', 2, false, 57)
ON CONFLICT (key) DO NOTHING;

-- Register in plan_tier_modules (PRO only)
INSERT INTO plan_tier_modules (module_key, tier_key, enabled)
VALUES 
  ('pilotage.rentabilite', 'PRO', true),
  ('pilotage.rentabilite', 'STARTER', false)
ON CONFLICT (module_key, tier_key) DO NOTHING;