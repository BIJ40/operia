
-- Fix 1: Enable prospection in PRO with all sub-tab options
UPDATE plan_tier_modules 
SET enabled = true, options_override = '{"dashboard":true,"comparateur":true,"veille":true,"prospects":true}'::jsonb
WHERE tier_key = 'PRO' AND module_key = 'prospection';

-- Fix 2: Enable divers_documents in PRO with management options  
UPDATE plan_tier_modules
SET enabled = true, options_override = '{"gerer":true,"corbeille_vider":true}'::jsonb
WHERE tier_key = 'PRO' AND module_key = 'divers_documents';

-- Fix 3: Set ALL modules to PRO temporarily (except ticketing which stays NONE as override-only)
UPDATE module_registry
SET required_plan = 'PRO'
WHERE required_plan = 'STARTER' AND key != 'ticketing';
