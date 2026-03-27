-- Merge commercial.veille into commercial.suivi_client (fix: no deployed column)

-- 1. plan_tier_modules: migrate veille → suivi_client where not already present
UPDATE plan_tier_modules 
SET module_key = 'commercial.suivi_client' 
WHERE module_key = 'commercial.veille' 
  AND NOT EXISTS (
    SELECT 1 FROM plan_tier_modules p2 
    WHERE p2.tier_key = plan_tier_modules.tier_key 
      AND p2.module_key = 'commercial.suivi_client'
  );

DELETE FROM plan_tier_modules WHERE module_key = 'commercial.veille';

-- 2. user_modules: migrate veille → suivi_client where not already present
UPDATE user_modules 
SET module_key = 'commercial.suivi_client' 
WHERE module_key = 'commercial.veille'
  AND NOT EXISTS (
    SELECT 1 FROM user_modules u2 
    WHERE u2.user_id = user_modules.user_id 
      AND u2.module_key = 'commercial.suivi_client'
  );

DELETE FROM user_modules WHERE module_key = 'commercial.veille';

-- 3. Update commercial.suivi_client label in module_registry
UPDATE module_registry 
SET label = 'Veille'
WHERE key = 'commercial.suivi_client';

-- 4. Update commercial.veille label to indicate legacy
UPDATE module_registry 
SET label = 'Veille (legacy)'
WHERE key = 'commercial.veille';