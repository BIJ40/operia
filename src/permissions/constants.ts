/**
 * PERMISSIONS ENGINE V1.0 - Constants
 * Règles métier figées et documentées
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';
import { ModuleKey } from '@/types/modules';

// ============================================================================
// RÈGLE 1: BYPASS ABSOLUS
// ============================================================================

/** Rôles qui bypassent TOUS les contrôles de modules */
export const BYPASS_ROLES: GlobalRole[] = ['superadmin', 'platform_admin'];

/** Niveau minimum pour le bypass (N5) */
export const BYPASS_MIN_LEVEL = GLOBAL_ROLES.platform_admin;

// ============================================================================
// RÈGLE 2: MODULES NÉCESSITANT UNE AGENCE
// ============================================================================

/** Modules qui nécessitent que l'utilisateur ait une agence assignée */
export const AGENCY_REQUIRED_MODULES: ModuleKey[] = ['pilotage_agence', 'rh', 'parc'];

// ============================================================================
// RÈGLE 3: RÔLES AGENCE
// ============================================================================

/** Rôles qui DOIVENT avoir une agence (N1, N2) */
export const AGENCY_ROLES: GlobalRole[] = ['franchisee_user', 'franchisee_admin'];

// ============================================================================
// RÈGLE 4: MODULES RÉSEAU
// ============================================================================

/** Modules réservés aux rôles réseau (N3+) */
export const NETWORK_MODULES: ModuleKey[] = ['reseau_franchiseur'];

/** Rôle minimum pour les modules réseau */
export const NETWORK_MIN_ROLE: GlobalRole = 'franchisor_user';

// ============================================================================
// RÈGLE 5: HIÉRARCHIE DES RÔLES
// ============================================================================

/** Mapping rôle -> niveau numérique */
export const ROLE_HIERARCHY: Record<GlobalRole, number> = {
  base_user: 0,       // N0
  franchisee_user: 1, // N1
  franchisee_admin: 2, // N2
  franchisor_user: 3,  // N3
  franchisor_admin: 4, // N4
  platform_admin: 5,   // N5
  superadmin: 6        // N6
};

// ============================================================================
// RÈGLE 6: RÔLE MINIMUM PAR MODULE
// ============================================================================

/** Rôle minimum requis pour activer chaque module */
export const MODULE_MIN_ROLES: Record<ModuleKey, GlobalRole> = {
  help_academy: 'base_user',
  pilotage_agence: 'franchisee_user',
  reseau_franchiseur: 'franchisor_user',
  support: 'base_user',
  admin_plateforme: 'platform_admin',
  apogee_tickets: 'base_user', // Module individuel - N0+ peut y accéder si activé
  rh: 'base_user',  // Module accessible N0+ mais options différenciées
  parc: 'franchisee_user',
  unified_search: 'franchisee_user',
};

// ============================================================================
// RÈGLE 8: RÔLE MINIMUM PAR OPTION DE MODULE
// ============================================================================

/** 
 * Rôle minimum requis pour chaque option de module
 * Format: "moduleKey.optionKey" -> GlobalRole
 * 
 * Exemple RH:
 * - coffre: N0/N1 (salarié consulte ses documents)
 * - rh_viewer: N2+ (voir équipe sans paie)
 * - rh_admin: N2+ (gestion complète RH/paie)
 */
export const MODULE_OPTION_MIN_ROLES: Record<string, GlobalRole> = {
  // RH - Module à 2 facettes
  'rh.coffre': 'base_user',           // N0 - Salarié consulte son coffre
  'rh.rh_viewer': 'franchisee_admin', // N2 - Dirigeant voit l'équipe
  'rh.rh_admin': 'franchisee_admin',  // N2 - Dirigeant gère RH complet
  
  // Support - Agent vs utilisateur
  'support.agent': 'base_user',       // N0 - Peut être agent support externe
  
  // Parc - Options futures
  'parc.fleet': 'franchisee_user',    // N1 - Consulte le parc
  'parc.epi': 'franchisee_user',      // N1 - Consulte les EPI
  
  // Help Academy - Options par section
  'help_academy.apogee': 'base_user',
  'help_academy.apporteurs': 'base_user',
  'help_academy.helpconfort': 'base_user',
  
  // Pilotage Agence
  'pilotage_agence.kpis': 'franchisee_user',
  'pilotage_agence.diffusion': 'franchisee_user',
  
  // Admin
  'admin_plateforme.users': 'platform_admin',
  'admin_plateforme.faq': 'platform_admin',
};

// ============================================================================
// RÈGLE 7: LABELS POUR L'UI
// ============================================================================

export const MODULE_LABELS: Record<ModuleKey, string> = {
  help_academy: 'Help! Academy',
  pilotage_agence: 'Pilotage Agence',
  reseau_franchiseur: 'Réseau Franchiseur',
  support: 'Support',
  admin_plateforme: 'Administration',
  apogee_tickets: 'Gestion de Projet',
  rh: 'RH',
  parc: 'Parc',
  unified_search: 'Recherche unifiée',
};
