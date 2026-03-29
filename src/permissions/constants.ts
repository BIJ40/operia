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
export const AGENCY_REQUIRED_MODULES: ModuleKey[] = [
  // Hierarchical keys only (legacy removed Phase 10)
  'pilotage.agence', 'organisation.salaries', 'organisation.parc',
  // Prospection — unchanged
  'prospection',
];

// ============================================================================
// RÈGLE 3: RÔLES AGENCE
// ============================================================================

/** Rôles qui DOIVENT avoir une agence (N1, N2) */
export const AGENCY_ROLES: GlobalRole[] = ['franchisee_user', 'franchisee_admin'];

// ============================================================================
// RÈGLE 4: MODULES RÉSEAU
// ============================================================================

// reseau_franchiseur retiré — interface de rôle (N3+), pas un module standard
// Voir src/permissions/franchisorAccess.ts
/** Modules réservés aux rôles réseau (N3+) — vidé car franchiseur = interface de rôle */
export const NETWORK_MODULES: ModuleKey[] = [];

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
  // Organisation — Salariés (ex-RH)
  'organisation.salaries.rh_viewer': 'franchisee_admin',
  'organisation.salaries.rh_admin': 'franchisee_admin',
  
  // Support — Aide en ligne (ex-aide)
  'support.aide_en_ligne.agent': 'base_user',
  'support.aide_en_ligne.user': 'base_user',
  
  // Organisation — Parc (ex-parc)
  'organisation.parc.vehicules': 'franchisee_user',
  'organisation.parc.epi': 'franchisee_user',
  'organisation.parc.equipements': 'franchisee_user',
  
  // Pilotage — Agence (ex-agence)
  'pilotage.agence.indicateurs': 'franchisee_admin',
  'pilotage.agence.actions_a_mener': 'franchisee_admin',
  'pilotage.agence.diffusion': 'franchisee_admin',
  
  // Pilotage — Statistiques (ex-stats, ex-dashboard)
  'pilotage.statistiques.general': 'franchisee_admin',
  'pilotage.statistiques.exports': 'franchisee_admin',

  // Médiathèque — Documents (ex-divers_documents)
  'mediatheque.documents.consulter': 'franchisee_admin',
  'mediatheque.documents.gerer': 'franchisee_admin',
  'mediatheque.documents.corbeille_vider': 'franchisee_admin',
  
  // Organisation — Apporteurs (ex-divers_apporteurs)
  'relations.apporteurs.consulter': 'franchisee_admin',
  'relations.apporteurs.gerer': 'franchisee_admin',
  
  // Support — Guides (ex-guides)
  'support.guides.apogee': 'base_user',
  'support.guides.apporteurs': 'base_user',
  'support.guides.helpconfort': 'base_user',
  'support.guides.faq': 'base_user',

  // Ticketing — unchanged
  'ticketing.kanban': 'base_user',
  'ticketing.create': 'base_user',
  'ticketing.manage': 'base_user',
  'ticketing.import': 'platform_admin',
  
  // Prospection — veille merged into suivi_client
  'prospection.dashboard': 'franchisee_user',
  'prospection.comparateur': 'franchisee_user',
  'prospection.prospects': 'franchisee_user',
  
  // Planification Augmentée — unchanged
  'planning_augmente.suggest': 'franchisee_admin',
  'planning_augmente.optimize': 'franchisee_admin',
  'planning_augmente.admin': 'platform_admin',
  
  // Admin — unchanged
  'admin_plateforme.users': 'platform_admin',
  'admin_plateforme.agencies': 'platform_admin',
  'admin_plateforme.permissions': 'platform_admin',
  'admin_plateforme.faq_admin': 'platform_admin',
  
  // Réseau — unchanged
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
