
INSERT INTO public.module_registry (key, label, parent_key, node_type, is_deployed, required_plan, min_role)
VALUES ('realisations', 'Réalisations', NULL, 'section', true, 'PRO', 2)
ON CONFLICT (key) DO NOTHING;
