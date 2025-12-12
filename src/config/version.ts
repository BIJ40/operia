export const APP_VERSION = '0.7.12';
export const APP_CODENAME = 'Audit Sécurité & Export DB';

/**
 * Changelog v0.7.12 (2025-12-12)
 * ==============================
 * 
 * AUDIT SÉCURITÉ COMPLET
 * ----------------------
 * 
 * 1. Audit clé API Apogée
 *    - ✅ Clé stockée dans Supabase Secrets (jamais exposée)
 *    - ✅ Tous appels via proxy-apogee Edge Function
 *    - ✅ VITE_APOGEE_API_KEY identifié comme remnant inutilisé
 * 
 * 2. Audit données sensibles navigateur
 *    - ✅ Masquage serveur email/tel/adresse/codePostal
 *    - ✅ get-client-contact avec rate limiting + audit
 *    - ✅ RLS Linter: aucune faille critique
 * 
 * 3. Export base de données amélioré
 *    - Export 6 parties (104 tables)
 *    - Limites mémoire optimisées (blocks: 50, HTML volumineux)
 *    - Support migration franchise complète
 * 
 * STATUT SÉCURITÉ GLOBAL :
 * - ✅ API Keys: Sécurisées côté serveur
 * - ✅ Données Apogée: Masquées avant envoi navigateur
 * - ✅ RLS: 41 Edge Functions sécurisées
 * - ⚠️ RLS internes: 5 warnings (profils/RH) - accès légitimes
 * 
 * PRÉCÉDENT (v0.7.11)
 * -------------------
 * - Masquage serveur dans proxy-apogee
 * - Edge Function get-client-contact sécurisée
 * - Table sensitive_data_access_logs
 * - DossierDetailDialog avec lazy-load coordonnées
 * 
 * PRÉCÉDENT (v0.7.10)
 * -------------------
 * - Intégration CA devis dans charge travaux à venir
 * - KPI "CA estimé" et graphiques par état/univers
 * - Engine chargeTravauxEngine enrichi avec devisHT
 */
