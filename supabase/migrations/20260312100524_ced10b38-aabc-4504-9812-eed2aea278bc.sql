-- Phase 10B: Supprimer les clés legacy dupliquées de module_registry et plan_tier_modules
-- Ces clés sont des doublons fonctionnels des clés hiérarchiques G3

-- 1. Supprimer de plan_tier_modules d'abord (pas de FK mais bonne pratique)
DELETE FROM plan_tier_modules WHERE module_key IN (
  'agence', 'stats', 'rh', 'parc', 'salaries', 'realisations',
  'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'divers_documents',
  'guides', 'aide', 'outils', 'documents', 'pilotage.dashboard'
);

-- 2. Supprimer les enfants legacy de module_registry (ordre: enfants d'abord)
DELETE FROM module_registry WHERE key LIKE 'stats.%';
DELETE FROM module_registry WHERE key LIKE 'outils.%';
DELETE FROM module_registry WHERE key LIKE 'guides.%';
DELETE FROM module_registry WHERE key LIKE 'aide.%';
DELETE FROM module_registry WHERE key LIKE 'salaries.%';
DELETE FROM module_registry WHERE key LIKE 'documents.%';

-- 3. Supprimer les racines legacy de module_registry
DELETE FROM module_registry WHERE key IN (
  'agence', 'stats', 'rh', 'parc', 'salaries', 'realisations',
  'divers_apporteurs', 'divers_plannings', 'divers_reunions', 'divers_documents',
  'guides', 'aide', 'outils', 'documents', 'pilotage.dashboard'
);