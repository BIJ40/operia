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
  'organisation.apporteurs',
  'organisation.plannings',
  'organisation.reunions',
  'mediatheque.documents',
  'support.aide_en_ligne',
  'support.guides',
  'pilotage.resultat',
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
  'organisation.apporteurs': 'franchisee_admin',
  'organisation.plannings': 'franchisee_admin',
  'organisation.reunions': 'franchisee_admin',
  'mediatheque.documents': 'franchisee_admin',
  'support.aide_en_ligne': 'base_user',
  'support.guides': 'franchisee_admin',
  'pilotage.resultat': 'franchisee_admin',
  'commercial.realisations': 'franchisee_user',
};
