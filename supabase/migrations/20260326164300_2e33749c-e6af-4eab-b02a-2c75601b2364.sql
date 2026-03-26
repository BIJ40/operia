
INSERT INTO public.module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('pilotage.tresorerie', 'Trésorerie', 'pilotage.statistiques', 'screen', 85, true, 'PRO', 2)
ON CONFLICT (key) DO NOTHING;
