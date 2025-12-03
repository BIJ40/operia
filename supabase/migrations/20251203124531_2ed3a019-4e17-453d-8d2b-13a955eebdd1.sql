-- Migration: Activer automatiquement le module RH avec option coffre pour les salariés agence existants
-- Cible: users N0/N1 avec agency_id défini (techniciens, assistantes, commerciaux)

-- Activer rh.coffre pour tous les salariés agence (global_role in N0, N1) ayant une agence
UPDATE public.profiles
SET enabled_modules = jsonb_set(
  jsonb_set(
    COALESCE(enabled_modules, '{}'::jsonb),
    '{rh}',
    '{"enabled": true, "options": {"coffre": true}}'::jsonb,
    true
  ),
  '{rh,options,coffre}',
  'true'::jsonb,
  true
)
WHERE agency_id IS NOT NULL
  AND global_role IN ('base_user', 'franchisee_user')
  AND (
    enabled_modules IS NULL 
    OR enabled_modules->'rh' IS NULL 
    OR NOT (enabled_modules->'rh'->'options'->>'coffre')::boolean
  );

-- Activer également pour les N2 (dirigeants) avec toutes les options RH
UPDATE public.profiles
SET enabled_modules = jsonb_set(
  COALESCE(enabled_modules, '{}'::jsonb),
  '{rh}',
  '{"enabled": true, "options": {"coffre": true, "rh_viewer": true, "rh_admin": true}}'::jsonb,
  true
)
WHERE agency_id IS NOT NULL
  AND global_role = 'franchisee_admin'
  AND (
    enabled_modules IS NULL 
    OR enabled_modules->'rh' IS NULL
  );