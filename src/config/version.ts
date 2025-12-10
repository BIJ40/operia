export const APP_VERSION = '0.7.9';
export const APP_CODENAME = 'Modules & Stabilité';

/**
 * Changelog v0.7.9 (2025-12-10)
 * =============================
 * 
 * GESTION DES MODULES
 * --------------------
 * 
 * 1. Nouveaux modules Pilotage Agence
 *    - stats_hub: Stats Hub avancé (désactivé par défaut)
 *    - veille_apporteurs: Veille Apporteurs (désactivé par défaut)
 *    - Guards ModuleGuard sur toutes les routes concernées
 * 
 * 2. Protection des routes par module
 *    - /hc-agency/stats-hub → pilotage_agence.stats_hub
 *    - /hc-agency/indicateurs → pilotage_agence.indicateurs
 *    - /hc-agency/veille-apporteurs → pilotage_agence.veille_apporteurs
 *    - /hc-agency/actions → pilotage_agence.actions_a_mener
 *    - /hc-agency/statistiques/diffusion → pilotage_agence.diffusion
 * 
 * CORRECTIONS STABILITÉ
 * ----------------------
 * 
 * 3. Rechargement intempestif des pages corrigé
 *    - AgencyContext: cache vidé uniquement si agence change réellement
 *    - useStatiaSAVMetrics: queryKey sans overridesVersion
 *    - Persistance état lors changement d'onglet navigateur
 * 
 * PRÉCÉDENT (v0.7.8)
 * -------------------
 * - Live Support améliorations
 * - Tickets → FAQ avec reformulation IA
 * - Notifications temps réel corrigées
 */
