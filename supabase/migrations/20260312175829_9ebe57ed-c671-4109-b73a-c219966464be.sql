INSERT INTO module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('accueil', 'Accueil', NULL, 'module', 1, true, 'STARTER', 0)
ON CONFLICT (key) DO NOTHING;