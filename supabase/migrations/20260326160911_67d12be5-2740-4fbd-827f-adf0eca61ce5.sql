INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('pilotage.statistiques.financier', 'Financier', 'pilotage.statistiques', 'screen', 65, true, 'PRO', 2)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  parent_key = EXCLUDED.parent_key,
  sort_order = EXCLUDED.sort_order,
  is_deployed = EXCLUDED.is_deployed,
  required_plan = EXCLUDED.required_plan;

INSERT INTO plan_tier_modules (tier_key, module_key, enabled)
VALUES ('STARTER', 'pilotage.statistiques.financier', false),
       ('PRO', 'pilotage.statistiques.financier', true)
ON CONFLICT (tier_key, module_key) DO UPDATE SET enabled = EXCLUDED.enabled;