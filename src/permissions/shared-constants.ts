/**
 * Shared permissions constants for both frontend and Edge Functions.
 * 
 * This file contains ONLY pure data (no imports from src/ modules).
 * It is the canonical source for role hierarchy, module rules, etc.
 * 
 * The Edge Functions version (supabase/functions/_shared/permissionsEngine.ts)
 * MUST stay synchronized with these values.
 * 
 * @see src/permissions/constants.ts — frontend consumer
 * @see supabase/functions/_shared/permissionsEngine.ts — Edge consumer
 */

// ============================================================================
// ROLE HIERARCHY (N0 → N6)
// ============================================================================

export const SHARED_ROLE_HIERARCHY = {
  base_user: 0,
  franchisee_user: 1,
  franchisee_admin: 2,
  franchisor_user: 3,
  franchisor_admin: 4,
  platform_admin: 5,
  superadmin: 6,
} as const;

export type SharedGlobalRole = keyof typeof SHARED_ROLE_HIERARCHY;

/**
 * Vérifie si un rôle atteint le niveau minimum requis.
 * Fonction pure sans dépendance externe — utilisable partout.
 */
export function hasMinRole(role: SharedGlobalRole | null, minRole: SharedGlobalRole): boolean {
  if (!role) return false;
  return (SHARED_ROLE_HIERARCHY[role] ?? 0) >= (SHARED_ROLE_HIERARCHY[minRole] ?? 0);
}

/**
 * Retourne le niveau numérique d'un rôle.
 */
export function getRoleLevel(role: SharedGlobalRole | null): number {
  if (!role) return 0;
  return SHARED_ROLE_HIERARCHY[role] ?? 0;
}

/**
 * Vérifie si un rôle est un bypass (N5+)
 */
export function isBypassRole(role: SharedGlobalRole | null): boolean {
  if (!role) return false;
  return SHARED_BYPASS_ROLES.includes(role);
}

// ============================================================================
// MODULE KEYS V3
// ============================================================================

export const SHARED_MODULE_KEYS = [
  // Non-migrated legacy (still canonical)
  'ticketing',
  'prospection',
  'planning_augmente',
  'reseau_franchiseur',
  'admin_plateforme',
  'unified_search',
  // Hierarchical (Phase 7+10)
  'pilotage.agence',
  'pilotage.statistiques',
  'organisation.salaries',
  'organisation.parc',
  'relations.apporteurs',
  'organisation.plannings',
  'organisation.reunions',
  'mediatheque.documents',
  'support.aide_en_ligne',
  'support.guides',
  'pilotage.resultat',
  'pilotage.rentabilite',
  'commercial.realisations',
] as const;

export type SharedModuleKey = typeof SHARED_MODULE_KEYS[number];

// ============================================================================
// LEGACY MODULE KEY MAPPING
// ============================================================================

export const SHARED_MODULE_COMPAT_MAP: Record<string, SharedModuleKey> = {
  // Legacy keys → canonical hierarchical keys
  help_academy: 'support.guides',
  pilotage_agence: 'pilotage.agence',
  support: 'support.aide_en_ligne',
  apogee_tickets: 'ticketing',
  messaging: 'support.aide_en_ligne',
};

// ============================================================================
// RULES
// ============================================================================

export const SHARED_BYPASS_ROLES: SharedGlobalRole[] = ['superadmin', 'platform_admin'];

export const SHARED_AGENCY_REQUIRED_MODULES: SharedModuleKey[] = [
  'pilotage.agence', 'organisation.salaries', 'organisation.parc',
  'prospection',
];

export const SHARED_AGENCY_ROLES: SharedGlobalRole[] = ['franchisee_user', 'franchisee_admin'];

// reseau_franchiseur retiré de NETWORK_MODULES — interface de rôle (N3+), pas un module standard
// Voir src/permissions/franchisorAccess.ts
export const SHARED_NETWORK_MODULES: SharedModuleKey[] = [];

export const SHARED_NETWORK_MIN_ROLE: SharedGlobalRole = 'franchisor_user';

/**
 * Module minimum roles — MUST stay aligned with MODULE_DEFINITIONS in src/types/modules.ts
 * Last sync: 2026-03-08 (aligned rh/parc to franchisee_admin per MODULE_DEFINITIONS)
 */
export const SHARED_MODULE_MIN_ROLES: Partial<Record<SharedModuleKey, SharedGlobalRole>> = {
  // Non-migrated legacy
  ticketing: 'base_user',
  prospection: 'franchisee_user',
  planning_augmente: 'franchisee_admin',
  reseau_franchiseur: 'franchisor_user',
  admin_plateforme: 'platform_admin',
  // Hierarchical (Phase 7+10)
  'pilotage.agence': 'franchisee_admin',
  'pilotage.statistiques': 'franchisee_admin',
  'organisation.salaries': 'franchisee_admin',
  'organisation.parc': 'franchisee_admin',
  'relations.apporteurs': 'franchisee_admin',
  'organisation.plannings': 'franchisee_admin',
  'organisation.reunions': 'franchisee_admin',
  'mediatheque.documents': 'franchisee_admin',
  'support.aide_en_ligne': 'base_user',
  'support.guides': 'franchisee_admin',
  'pilotage.resultat': 'franchisee_admin',
  'pilotage.rentabilite': 'franchisee_admin',
  'commercial.realisations': 'franchisee_user',
};

// ============================================================================
// MODULE OPTION MIN ROLES
// ============================================================================

export const SHARED_MODULE_OPTION_MIN_ROLES: Record<string, SharedGlobalRole> = {
  'organisation.salaries.rh_viewer': 'franchisee_admin',
  'organisation.salaries.rh_admin': 'franchisee_admin',
  'support.aide_en_ligne.agent': 'base_user',
  'support.aide_en_ligne.user': 'base_user',
  'organisation.parc.vehicules': 'franchisee_user',
  'organisation.parc.epi': 'franchisee_user',
  'organisation.parc.equipements': 'franchisee_user',
  'pilotage.agence.indicateurs': 'franchisee_admin',
  'pilotage.agence.actions_a_mener': 'franchisee_admin',
  'pilotage.agence.diffusion': 'franchisee_admin',
  'pilotage.statistiques.general': 'franchisee_admin',
  'pilotage.statistiques.exports': 'franchisee_admin',
  'mediatheque.documents.consulter': 'franchisee_admin',
  'mediatheque.documents.gerer': 'franchisee_admin',
  'mediatheque.documents.corbeille_vider': 'franchisee_admin',
  'relations.apporteurs.consulter': 'franchisee_admin',
  'relations.apporteurs.gerer': 'franchisee_admin',
  'support.guides.apogee': 'base_user',
  'support.guides.apporteurs': 'base_user',
  'support.guides.helpconfort': 'base_user',
  'support.guides.faq': 'base_user',
  'ticketing.kanban': 'base_user',
  'ticketing.create': 'base_user',
  'ticketing.manage': 'base_user',
  'ticketing.import': 'platform_admin',
  'prospection.dashboard': 'franchisee_user',
  'prospection.comparateur': 'franchisee_user',
  'prospection.prospects': 'franchisee_user',
  'planning_augmente.suggest': 'franchisee_admin',
  'planning_augmente.optimize': 'franchisee_admin',
  'planning_augmente.admin': 'platform_admin',
  'admin_plateforme.users': 'platform_admin',
  'admin_plateforme.agencies': 'platform_admin',
  'admin_plateforme.permissions': 'platform_admin',
  'admin_plateforme.faq_admin': 'platform_admin',
  'reseau_franchiseur.dashboard': 'franchisor_user',
  'reseau_franchiseur.stats': 'franchisor_user',
  'reseau_franchiseur.agences': 'franchisor_user',
  'reseau_franchiseur.redevances': 'franchisor_admin',
  'reseau_franchiseur.comparatifs': 'franchisor_user',
};

// ============================================================================
// PLAN LABELS (V2 — CORE / PILOT / INTELLIGENCE)
// ============================================================================

export const PLAN_LABELS: Record<string, string> = {
  CORE: 'Core',
  PILOT: 'Pilot',
  INTELLIGENCE: 'Intelligence',
};

export function getPlanLabel(key: string): string {
  return PLAN_LABELS[key] || key;
}

export const PLAN_HIERARCHY: Record<string, number> = {
  CORE: 0,
  PILOT: 1,
  INTELLIGENCE: 2,
};
