-- Fix STARTER tier: enable organisation.salaries and organisation.reunions
UPDATE plan_tier_modules SET enabled = true 
WHERE tier_key = 'STARTER' AND module_key = 'organisation.salaries';

UPDATE plan_tier_modules SET enabled = true 
WHERE tier_key = 'STARTER' AND module_key = 'organisation.reunions';