-- Delete FREE plan completely
DELETE FROM public.plan_tier_modules WHERE tier_key = 'FREE';
DELETE FROM public.plan_tiers WHERE key = 'FREE';

-- Update STARTER plan modules
DELETE FROM public.plan_tier_modules WHERE tier_key = 'STARTER';

INSERT INTO public.plan_tier_modules (tier_key, module_key, enabled, options_override) VALUES
  ('STARTER', 'help_academy', true, '{"apogee": true}'),
  ('STARTER', 'support', true, '{"user": true}'),
  ('STARTER', 'pilotage_agence', true, '{"vue_ensemble": true}');