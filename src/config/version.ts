export const APP_VERSION = '0.7.11';
export const APP_CODENAME = 'Sécurité Données Navigateur';

/**
 * Changelog v0.7.11 (2025-12-11)
 * ==============================
 * 
 * SÉCURITÉ - PROTECTION DONNÉES NAVIGATEUR
 * -----------------------------------------
 * 
 * 1. Masquage serveur dans proxy-apogee
 *    - Fonction maskSensitiveData() côté Edge Function
 *    - Masquage email, tel, adresse, codePostal (XX***)
 *    - Données sensibles JAMAIS envoyées au navigateur
 *    - Statistiques préservées (ville, CP partiel, nom, type)
 * 
 * 2. Nouvelle Edge Function get-client-contact
 *    - Accès contrôlé aux coordonnées clients
 *    - Validation JWT obligatoire
 *    - Rate limiting 10 req/min par utilisateur
 *    - Audit logging automatique
 * 
 * 3. Table sensitive_data_access_logs
 *    - Traçabilité complète des accès données sensibles
 *    - Conformité RGPD renforcée
 *    - RLS policies pour sécurité accès logs
 * 
 * 4. DossierDetailDialog sécurisé
 *    - Affichage "***" par défaut pour données sensibles
 *    - Bouton "Voir coordonnées" avec lazy-load sécurisé
 *    - Données sensibles chargées à la demande uniquement
 * 
 * IMPACT SÉCURITÉ :
 * - ✅ Données sensibles invisibles dans Network tab
 * - ✅ Données sensibles non stockées en mémoire navigateur
 * - ✅ Accès audité et tracé
 * - ✅ Zero impact sur calculs statistiques
 * 
 * PRÉCÉDENT (v0.7.10)
 * -------------------
 * - Intégration CA devis dans charge travaux à venir
 * - KPI "CA estimé" et graphiques par état/univers
 * - Engine chargeTravauxEngine enrichi avec devisHT
 */
