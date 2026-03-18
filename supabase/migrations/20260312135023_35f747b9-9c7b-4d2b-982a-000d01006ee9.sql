-- ÉTAPE 1: Supprimer ticketing de plan_tier_modules
-- Le ticketing devient un module opt-in uniquement par overwrite utilisateur (user_modules)
DELETE FROM plan_tier_modules WHERE module_key = 'ticketing';