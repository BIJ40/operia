export const APP_VERSION = '0.7.14';
export const APP_CODENAME = 'Sync Profils ↔ Collaborateurs';

/**
 * Changelog v0.7.13 (2025-12-14)
 * ==============================
 * 
 * SYNCHRONISATION BIDIRECTIONNELLE PROFILS ↔ COLLABORATEURS
 * ----------------------------------------------------------
 * 
 * 1. Trigger sync_profile_on_collaborator_update amélioré
 *    - ✅ apogee_user_id : sync collaborateurs → profiles (NEW)
 *    - ✅ role → role_agence : sync collaborateurs → profiles (NEW)
 *    - ✅ agency_id → agence (slug) : sync collaborateurs → profiles (NEW)
 *    - ✅ first_name, last_name, email, phone : déjà bidirectionnel
 * 
 * 2. Backfill données existantes
 *    - Migration apogee_user_id vers profiles
 *    - Migration role_agence depuis collaborators.role
 *    - Migration agence depuis collaborators.agency_id
 * 
 * 3. Visibilité Admin complète
 *    - Toutes modifications collaborateur remontent en admin
 *    - Cohérence profiles ↔ collaborators garantie
 * 
 * PRÉCÉDENT (v0.7.12)
 * -------------------
 * - Audit sécurité complet (97/100)
 * - Masquage serveur email/tel/adresse/codePostal
 * - Export base de données 6 parties (104 tables)
 * 
 * PRÉCÉDENT (v0.7.11)
 * -------------------
 * - Masquage serveur dans proxy-apogee
 * - Edge Function get-client-contact sécurisée
 * - Table sensitive_data_access_logs
 */
