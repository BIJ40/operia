-- Phase 1: Corriger l'incohérence vue_ensemble -> indicateurs dans STARTER
-- L'option vue_ensemble n'existe pas dans le code (c'est indicateurs)

UPDATE plan_tier_modules 
SET options_override = jsonb_set(
  options_override - 'vue_ensemble',
  '{indicateurs}', 
  'true'::jsonb
)
WHERE tier_key = 'STARTER' 
AND module_key = 'pilotage_agence'
AND options_override ? 'vue_ensemble';

-- Aussi nettoyer toute référence à messaging dans les plans (si présent)
DELETE FROM plan_tier_modules 
WHERE module_key = 'messaging';