
-- Fix: Insert module registry with integer min_role (N2 = franchisee_admin)
-- The 4 tables, enums, indexes, triggers, RLS, RPC and view were already created successfully.
-- Only the registry insert failed.

INSERT INTO public.module_registry (key, label, parent_key, node_type, sort_order, is_deployed, required_plan, min_role)
VALUES ('pilotage.resultat', 'Résultat', 'pilotage', 'section', 55, true, 'STARTER', 2)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled)
VALUES 
  ('STARTER', 'pilotage.resultat', true),
  ('PRO', 'pilotage.resultat', true)
ON CONFLICT (tier_key, module_key) DO NOTHING;
