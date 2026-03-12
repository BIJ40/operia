-- Aligner les accès Pilotage pour le forfait BASIQUE (tier STARTER)
-- Les 4 sous-modules sont marqués required_plan = STARTER dans module_registry
-- => ils doivent être explicitement activés dans plan_tier_modules (fail-closed)

INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled)
VALUES
  ('STARTER', 'pilotage.performance', true),
  ('STARTER', 'pilotage.actions_a_mener', true),
  ('STARTER', 'pilotage.devis_acceptes', true),
  ('STARTER', 'pilotage.incoherences', true)
ON CONFLICT (tier_key, module_key)
DO UPDATE SET enabled = EXCLUDED.enabled;