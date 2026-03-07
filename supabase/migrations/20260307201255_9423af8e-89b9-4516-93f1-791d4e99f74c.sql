
-- ============================================================
-- PHASE 1b: Nettoyage des doublons legacy/new dans user_modules
-- ============================================================
-- Règle: si un user a BOTH la clé legacy ET la clé new, supprimer la legacy
-- Les clés legacy: help_academy → guides, support → aide, apogee_tickets → ticketing, pilotage_agence → agence/stats

-- 1. Supprimer 'help_academy' quand 'guides' existe pour le même user
DELETE FROM user_modules um
WHERE um.module_key = 'help_academy'
  AND EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = um.user_id AND um2.module_key = 'guides');

-- 2. Supprimer 'support' quand 'aide' existe pour le même user
DELETE FROM user_modules um  
WHERE um.module_key = 'support'
  AND EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = um.user_id AND um2.module_key = 'aide');

-- 3. Supprimer 'apogee_tickets' quand 'ticketing' existe pour le même user
DELETE FROM user_modules um
WHERE um.module_key = 'apogee_tickets'
  AND EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = um.user_id AND um2.module_key = 'ticketing');

-- 4. Pour les cas restants où SEULE la clé legacy existe, 
--    renommer la clé vers la clé new (si la new n'existe pas déjà)

-- help_academy → guides (si guides n'existe pas)
UPDATE user_modules SET module_key = 'guides' 
WHERE module_key = 'help_academy'
  AND NOT EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = user_modules.user_id AND um2.module_key = 'guides');

-- support → aide (si aide n'existe pas)
UPDATE user_modules SET module_key = 'aide'
WHERE module_key = 'support'
  AND NOT EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = user_modules.user_id AND um2.module_key = 'aide');

-- apogee_tickets → ticketing (si ticketing n'existe pas)
UPDATE user_modules SET module_key = 'ticketing'
WHERE module_key = 'apogee_tickets'
  AND NOT EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = user_modules.user_id AND um2.module_key = 'ticketing');

-- pilotage_agence → agence (si agence n'existe pas)
UPDATE user_modules SET module_key = 'agence'
WHERE module_key = 'pilotage_agence'
  AND NOT EXISTS (SELECT 1 FROM user_modules um2 WHERE um2.user_id = user_modules.user_id AND um2.module_key = 'agence');

-- Supprimer pilotage_agence restants (doublon avec agence)
DELETE FROM user_modules WHERE module_key = 'pilotage_agence';
