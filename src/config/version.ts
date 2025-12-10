export const APP_VERSION = '0.7.10';
export const APP_CODENAME = 'Prévisionnel CA Devis';

/**
 * Changelog v0.7.10 (2025-12-10)
 * ==============================
 * 
 * PRÉVISIONNEL - CA DEVIS
 * ------------------------
 * 
 * 1. Intégration CA devis dans charge travaux à venir
 *    - Calcul du CA devis (HT) pour les projets éligibles
 *    - États inclus: devis_to_order, wait_fourn, to_planify_tvx
 *    - Exclusion devis: draft, rejected, canceled
 *    - Ventilation proportionnelle par univers
 * 
 * 2. Nouveaux KPIs et graphiques
 *    - KPI "CA estimé" global sur tuile principale
 *    - CA devis par état (À planifier, À commander, Att. Fourn)
 *    - Graphique barres CA Devis par Univers
 *    - Graphique camembert CA Devis par État
 * 
 * 3. Engine chargeTravauxEngine enrichi
 *    - Types ChargeTravauxProjet/UniversStats avec devisHT
 *    - Fonction calculateDevisHTForProject
 *    - Debug étendu: devisMatchedToProjects, devisHTCalculated
 * 
 * PRÉCÉDENT (v0.7.9)
 * -------------------
 * - Gestion des modules pilotage_agence
 * - Protection routes par ModuleGuard
 * - Corrections stabilité rechargement pages
 */
