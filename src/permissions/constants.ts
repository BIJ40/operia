/**
 * PERMISSIONS ENGINE V2.0 - Constants
 * Règles métier figées et documentées
 * 
 * V2.0: Basé sur global_role (N0-N6). Plus de références legacy.
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
export const AGENCY_REQUIRED_MODULES: ModuleKey[] = ['pilotage_agence', 'rh', 'parc', 'prospection'];

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
// NOTE: carte_rdv et apporteur_portal sont maintenant des sous-options de pilotage_agence
export const MODULE_MIN_ROLES: Partial<Record<ModuleKey, GlobalRole>> = {
  help_academy: 'base_user',
  pilotage_agence: 'franchisee_user',
  reseau_franchiseur: 'franchisor_user',
  support: 'base_user',
  admin_plateforme: 'platform_admin',
  apogee_tickets: 'base_user',
  rh: 'base_user',
  parc: 'franchisee_user',
  unified_search: 'franchisee_user',
  // New modules
  agence: 'franchisee_admin',
  stats: 'franchisee_admin',
  divers_apporteurs: 'franchisee_admin',
  divers_plannings: 'franchisee_admin',
  divers_reunions: 'franchisee_admin',
  divers_documents: 'franchisee_admin',
  guides: 'base_user',
  ticketing: 'base_user',
  aide: 'base_user',
  prospection: 'franchisee_admin',
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
  // RH - Module N2+ uniquement (portail salarié N1 supprimé v0.8.3)
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
  'pilotage_agence.indicateurs': 'franchisee_user',
  'pilotage_agence.stats_hub': 'franchisee_user',
  'pilotage_agence.actions_a_mener': 'franchisee_user',
  'pilotage_agence.diffusion': 'franchisee_user',
  'pilotage_agence.exports': 'franchisee_user',
  'pilotage_agence.veille_apporteurs': 'franchisee_user',
  // Ex-modules racines intégrés comme sous-options de pilotage
  'pilotage_agence.carte_rdv': 'franchisee_user',
  'pilotage_agence.mes_apporteurs': 'franchisee_admin',
  'pilotage_agence.gestion_apporteurs': 'franchisee_admin',
  
  // Admin
  'admin_plateforme.users': 'platform_admin',
  'admin_plateforme.faq': 'platform_admin',
};

// ============================================================================
// RÈGLE 7: LABELS POUR L'UI
// ============================================================================

// NOTE: carte_rdv et apporteur_portal sont maintenant des sous-options de pilotage_agence
export const MODULE_LABELS: Partial<Record<ModuleKey, string>> = {
  help_academy: 'Help! Academy',
  pilotage_agence: 'Pilotage Agence',
  reseau_franchiseur: 'Réseau Franchiseur',
  support: 'Support',
  admin_plateforme: 'Administration',
  apogee_tickets: 'Gestion de Projet',
  rh: 'RH',
  parc: 'Parc',
  unified_search: 'Recherche unifiée',
  // New modules
  agence: 'Mon agence',
  stats: 'Stats',
  divers_apporteurs: 'Apporteurs',
  divers_plannings: 'Plannings',
  divers_reunions: 'Réunions',
  divers_documents: 'Documents',
  guides: 'Guides',
  ticketing: 'Ticketing',
  aide: 'Aide',
  prospection: 'Prospection',
};
