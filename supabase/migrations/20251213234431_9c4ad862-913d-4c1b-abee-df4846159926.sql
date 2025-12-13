-- Update STARTER plan: remove edition from help_academy, remove agent from support
UPDATE public.plan_tier_modules 
SET options_override = '{"apogee": true}'::jsonb
WHERE tier_key = 'STARTER' AND module_key = 'help_academy';

UPDATE public.plan_tier_modules 
SET options_override = '{"user": true}'::jsonb
WHERE tier_key = 'STARTER' AND module_key = 'support';

-- Update PRO plan: ensure edition and agent are NOT in plan options
UPDATE public.plan_tier_modules 
SET options_override = NULL
WHERE tier_key = 'PRO' AND module_key = 'help_academy';

UPDATE public.plan_tier_modules 
SET options_override = '{"user": true, "admin": false}'::jsonb
WHERE tier_key = 'PRO' AND module_key = 'support';