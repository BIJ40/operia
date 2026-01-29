export const APP_VERSION = '0.8.6';
export const APP_CODENAME = 'Audit Sécurité RLS';

/**
 * Changelog v0.8.6 (2026-01-29)
 * ==============================
 * 
 * AUDIT SÉCURITÉ RLS
 * ------------------
 * - Analyse 5 alertes sécurité : 100% faux positifs ou appropriées
 * - profiles : policy anon USING(false) correcte
 * - collaborator_sensitive_data : chiffrement AES-256-GCM + RLS
 * - salary_history : accès N2+ agence approprié
 * - collaborators : N1 limité à sa propre fiche
 * - employment_contracts : accès N2+ correct
 * 
 * VERSIONING
 * ----------
 * - Vérification version au focus onglet navigateur
 * - Force refresh automatique si nouvelle version
 * 
 * PRÉCÉDENT (v0.8.5 - 2026-01-28)
 * --------------------------------
 * - Chatbot sidebar latéral
 * - Dashboard démo N0
 */
