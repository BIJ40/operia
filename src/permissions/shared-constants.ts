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
  // Legacy (kept for backward compat)
  'agence',
  'stats',
  'rh',
  'parc',
  'divers_apporteurs',
  'divers_plannings',
  'divers_reunions',
  'divers_documents',
  'guides',
  'ticketing',
  'aide',
  'prospection',
  'planning_augmente',
  'reseau_franchiseur',
  'admin_plateforme',
  'unified_search',
  // Hierarchical (additive — Phase 7)
  'pilotage.agence',
  'pilotage.dashboard',
  'organisation.salaries',
  'organisation.parc',
  'organisation.apporteurs',
  'organisation.plannings',
  'organisation.reunions',
  'mediatheque.documents',
  'support.aide_en_ligne',
  'support.guides',
  'commercial.realisations',
] as const;

export type SharedModuleKey = typeof SHARED_MODULE_KEYS[number];

// ============================================================================
// LEGACY MODULE KEY MAPPING
// ============================================================================

export const SHARED_MODULE_COMPAT_MAP: Record<string, SharedModuleKey> = {
  help_academy: 'guides',
  pilotage_agence: 'agence',
  support: 'aide',
  apogee_tickets: 'ticketing',
  messaging: 'aide',
};

// ============================================================================
// RULES
// ============================================================================

export const SHARED_BYPASS_ROLES: SharedGlobalRole[] = ['superadmin', 'platform_admin'];

export const SHARED_AGENCY_REQUIRED_MODULES: SharedModuleKey[] = [
  'agence', 'rh', 'parc', 'prospection',
  'pilotage.agence', 'organisation.salaries', 'organisation.parc',
];

export const SHARED_AGENCY_ROLES: SharedGlobalRole[] = ['franchisee_user', 'franchisee_admin'];

export const SHARED_NETWORK_MODULES: SharedModuleKey[] = ['reseau_franchiseur'];

export const SHARED_NETWORK_MIN_ROLE: SharedGlobalRole = 'franchisor_user';

/**
 * Module minimum roles — MUST stay aligned with MODULE_DEFINITIONS in src/types/modules.ts
 * Last sync: 2026-03-08 (aligned rh/parc to franchisee_admin per MODULE_DEFINITIONS)
 */
export const SHARED_MODULE_MIN_ROLES: Partial<Record<SharedModuleKey, SharedGlobalRole>> = {
  agence: 'franchisee_admin',
  stats: 'franchisee_admin',
  rh: 'franchisee_admin',
  parc: 'franchisee_admin',
  divers_apporteurs: 'franchisee_admin',
  divers_plannings: 'franchisee_admin',
  divers_reunions: 'franchisee_admin',
  divers_documents: 'franchisee_admin',
  guides: 'franchisee_admin',
  ticketing: 'base_user',
  aide: 'base_user',
  prospection: 'franchisee_user',
  planning_augmente: 'franchisee_admin',
  reseau_franchiseur: 'franchisor_user',
  admin_plateforme: 'platform_admin',
};
