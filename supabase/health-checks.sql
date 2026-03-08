-- =============================================================================
-- OPERIA — Health Checks SQL
-- 
-- Requêtes de diagnostic pour détecter les anomalies silencieuses.
-- À exécuter périodiquement via le SQL Editor de Supabase ou via un cron.
-- =============================================================================

-- ============================================================================
-- 1. ORPHELINS — Données incohérentes
-- ============================================================================

-- 1a. Collaborators sans profil utilisateur (quand is_registered_user = true)
SELECT c.id, c.first_name, c.last_name, c.user_id, c.agency_id
FROM collaborators c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.is_registered_user = true
  AND c.user_id IS NOT NULL
  AND p.id IS NULL;

-- 1b. Profiles sans collaborator (utilisateurs avec agence mais pas de fiche collaborateur)
SELECT p.id, p.email, p.first_name, p.last_name, p.agency_id
FROM profiles p
LEFT JOIN collaborators c ON c.user_id = p.id
WHERE p.agency_id IS NOT NULL
  AND p.global_role IN ('franchisee_user', 'franchisee_admin')
  AND c.id IS NULL;

-- 1c. Collaborators avec agency_id invalide
SELECT c.id, c.first_name, c.last_name, c.agency_id
FROM collaborators c
LEFT JOIN apogee_agencies a ON a.id = c.agency_id
WHERE a.id IS NULL;

-- 1d. Profiles avec agency_id invalide
SELECT p.id, p.email, p.agency_id
FROM profiles p
LEFT JOIN apogee_agencies a ON a.id = p.agency_id
WHERE p.agency_id IS NOT NULL
  AND a.id IS NULL;

-- ============================================================================
-- 2. MODULES — Références invalides
-- ============================================================================

-- 2a. Tickets avec module inexistant
SELECT t.id, t.ticket_number, t.module
FROM apogee_tickets t
LEFT JOIN apogee_modules m ON m.id = t.module
WHERE t.module IS NOT NULL
  AND m.id IS NULL;

-- 2b. Tickets avec kanban_status inexistant
SELECT t.id, t.ticket_number, t.kanban_status
FROM apogee_tickets t
LEFT JOIN apogee_ticket_statuses s ON s.id = t.kanban_status
WHERE s.id IS NULL;

-- ============================================================================
-- 3. SYNC TRIGGERS — Cohérence profiles ↔ collaborators
-- ============================================================================

-- 3a. Email désynchronisé entre profile et collaborator
SELECT 
  p.id AS profile_id,
  p.email AS profile_email,
  c.id AS collaborator_id,
  c.email AS collaborator_email
FROM profiles p
JOIN collaborators c ON c.user_id = p.id
WHERE p.email IS DISTINCT FROM c.email
  AND c.email IS NOT NULL
  AND p.email IS NOT NULL;

-- 3b. Nom désynchronisé
SELECT 
  p.id AS profile_id,
  p.first_name AS p_first, p.last_name AS p_last,
  c.id AS collaborator_id,
  c.first_name AS c_first, c.last_name AS c_last
FROM profiles p
JOIN collaborators c ON c.user_id = p.id
WHERE (p.first_name IS DISTINCT FROM c.first_name
   OR p.last_name IS DISTINCT FROM c.last_name);

-- ============================================================================
-- 4. RATE LIMITS — Anomalies volume
-- ============================================================================

-- 4a. Clés avec volume anormalement élevé (>50 en 1 heure)
SELECT key, COUNT(*) AS hit_count
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY key
HAVING COUNT(*) > 50
ORDER BY hit_count DESC;

-- 4b. Volume global par heure (dernières 24h)
SELECT 
  date_trunc('hour', created_at) AS hour_bucket,
  COUNT(*) AS total_hits
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour_bucket
ORDER BY hour_bucket DESC;

-- ============================================================================
-- 5. SESSIONS — Sécurité
-- ============================================================================

-- 5a. Sessions apporteur expirées mais non révoquées
SELECT id, manager_id, expires_at
FROM apporteur_sessions
WHERE expires_at < NOW()
  AND revoked_at IS NULL
LIMIT 20;

-- ============================================================================
-- 6. STOCKAGE — Documents orphelins
-- ============================================================================

-- 6a. Doc instances sans template valide
SELECT di.id, di.name, di.template_id
FROM doc_instances di
LEFT JOIN doc_templates dt ON dt.id = di.template_id
WHERE dt.id IS NULL;

-- ============================================================================
-- 7. RÉSUMÉ SANTÉ GLOBAL
-- ============================================================================
SELECT 
  'orphan_collaborators_no_profile' AS check_name,
  COUNT(*) AS issue_count
FROM collaborators c
LEFT JOIN profiles p ON p.id = c.user_id
WHERE c.is_registered_user = true AND c.user_id IS NOT NULL AND p.id IS NULL

UNION ALL

SELECT 'orphan_profiles_no_collaborator', COUNT(*)
FROM profiles p
LEFT JOIN collaborators c ON c.user_id = p.id
WHERE p.agency_id IS NOT NULL AND p.global_role IN ('franchisee_user', 'franchisee_admin') AND c.id IS NULL

UNION ALL

SELECT 'invalid_ticket_modules', COUNT(*)
FROM apogee_tickets t
LEFT JOIN apogee_modules m ON m.id = t.module
WHERE t.module IS NOT NULL AND m.id IS NULL

UNION ALL

SELECT 'rate_limit_spikes_1h', COUNT(DISTINCT key)
FROM rate_limits
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY key HAVING COUNT(*) > 50

UNION ALL

SELECT 'expired_apporteur_sessions', COUNT(*)
FROM apporteur_sessions
WHERE expires_at < NOW() AND revoked_at IS NULL;
