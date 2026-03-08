/**
 * PERMISSIONS ENGINE V3.0 - Constants
 * Règles métier figées et documentées
 * 
 * Source de vérité: MODULE_DEFINITIONS dans src/types/modules.ts
 * Les rôles minimum par module sont maintenant dans MODULE_DEFINITIONS.minRole
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
export const AGENCY_REQUIRED_MODULES: ModuleKey[] = ['agence', 'rh', 'parc', 'prospection'];

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
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6
};

// ============================================================================
// RÈGLE 6: RÔLE MINIMUM PAR MODULE (dérivé de MODULE_DEFINITIONS)
// ============================================================================

import { MODULE_DEFINITIONS } from '@/types/modules';

/**
 * Rôle minimum requis pour activer chaque module.
 * Dérivé automatiquement de MODULE_DEFINITIONS — source de vérité unique.
 */
export const MODULE_MIN_ROLES: Partial<Record<ModuleKey, GlobalRole>> = Object.fromEntries(
  MODULE_DEFINITIONS.map(m => [m.key, m.minRole])
) as Partial<Record<ModuleKey, GlobalRole>>;

// ============================================================================
// RÈGLE 8: RÔLE MINIMUM PAR OPTION DE MODULE
// ============================================================================

/** 
 * Rôle minimum requis pour chaque option de module
 * Format: "moduleKey.optionKey" -> GlobalRole
 */
export const MODULE_OPTION_MIN_ROLES: Record<string, GlobalRole> = {
  // RH
  'rh.rh_viewer': 'franchisee_admin',
  'rh.rh_admin': 'franchisee_admin',
  
  // Aide (ex-support)
  'aide.agent': 'base_user',
  'aide.user': 'base_user',
  
  // Parc
  'parc.vehicules': 'franchisee_user',
  'parc.epi': 'franchisee_user',
  'parc.equipements': 'franchisee_user',
  
  // Agence
  'agence.indicateurs': 'franchisee_admin',
  'agence.actions_a_mener': 'franchisee_admin',
  'agence.diffusion': 'franchisee_admin',
  
  // Stats
  'stats.stats_hub': 'franchisee_admin',
  'stats.exports': 'franchisee_admin',

  // Documents
  'divers_documents.consulter': 'franchisee_admin',
  'divers_documents.gerer': 'franchisee_admin',
  'divers_documents.corbeille_vider': 'franchisee_admin',
  
  // Apporteurs
  'divers_apporteurs.consulter': 'franchisee_admin',
  'divers_apporteurs.gerer': 'franchisee_admin',
  
  // Guides
  'guides.apogee': 'base_user',
  'guides.apporteurs': 'base_user',
  'guides.helpconfort': 'base_user',
  'guides.faq': 'base_user',

  // Ticketing
  'ticketing.kanban': 'base_user',
  'ticketing.create': 'base_user',
  'ticketing.manage': 'base_user',
  'ticketing.import': 'platform_admin',
  
  // Prospection
  'prospection.dashboard': 'franchisee_admin',
  'prospection.comparateur': 'franchisee_admin',
  'prospection.veille': 'franchisee_admin',
  'prospection.prospects': 'franchisee_admin',
  
  // Planification Augmentée
  'planning_augmente.suggest': 'franchisee_admin',
  'planning_augmente.optimize': 'franchisee_admin',
  'planning_augmente.admin': 'platform_admin',
  
  // Admin
  'admin_plateforme.users': 'platform_admin',
  'admin_plateforme.agencies': 'platform_admin',
  'admin_plateforme.permissions': 'platform_admin',
  'admin_plateforme.faq_admin': 'platform_admin',
  
  // Réseau
  'reseau_franchiseur.dashboard': 'franchisor_user',
  'reseau_franchiseur.stats': 'franchisor_user',
  'reseau_franchiseur.agences': 'franchisor_user',
  'reseau_franchiseur.redevances': 'franchisor_admin',
  'reseau_franchiseur.comparatifs': 'franchisor_user',

};

// ============================================================================
// RÈGLE 7: LABELS POUR L'UI (dérivé de MODULE_DEFINITIONS)
// ============================================================================

/**
 * Labels des modules pour l'UI.
 * Dérivé automatiquement de MODULE_DEFINITIONS — source de vérité unique.
 */
export const MODULE_LABELS: Partial<Record<ModuleKey, string>> = Object.fromEntries(
  MODULE_DEFINITIONS.map(m => [m.key, m.label])
) as Partial<Record<ModuleKey, string>>;
