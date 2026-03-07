
-- ============================================================
-- PHASE 1: Nettoyage permissions legacy
-- ============================================================

-- 1. Vider profiles.enabled_modules (cache legacy mort)
UPDATE profiles SET enabled_modules = NULL;

-- 2. Supprimer les overrides redondants de Jérôme (superadmin N6 = bypass total)
DELETE FROM user_modules 
WHERE user_id = '9b80c88a-546c-4329-b04a-6977c5e46fad';

-- 3. Supprimer les overrides redondants de Florian (franchisee_admin N2, plan PRO couvre déjà)
-- On garde UNIQUEMENT les modules qui apportent un accès SUPPLÉMENTAIRE par rapport au plan
-- Le plan PRO donne déjà: agence, stats, rh, parc, divers_apporteurs, divers_plannings, divers_reunions, guides, aide
-- Florian a des overrides identiques au plan → tous redondants
DELETE FROM user_modules 
WHERE user_id = 'acf6013b-e774-4aa0-88c7-bfe44dd82607'
  AND module_key IN ('agence', 'stats', 'rh', 'parc', 'divers_apporteurs', 'divers_documents', 'divers_plannings', 'divers_reunions', 'guides');

-- 4. Supprimer les overrides redondants de Clémence (même situation)
DELETE FROM user_modules 
WHERE user_id = 'fd5c4f1f-84e2-49ef-9164-98e0df36a664'
  AND module_key IN ('agence', 'stats', 'rh', 'parc', 'divers_apporteurs', 'divers_documents', 'divers_plannings', 'divers_reunions', 'guides');

-- 5. Supprimer la table agency_module_overrides (vide, jamais utilisée)
DROP TABLE IF EXISTS agency_module_overrides;
