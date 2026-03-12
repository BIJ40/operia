/**
 * Franchisor Interface Access Rules — Centralized, role-based.
 * 
 * L'interface Franchiseur n'est PAS un module standard.
 * C'est une interface applicative pilotée uniquement par le rôle global.
 * 
 * Règles :
 *   N3 (franchisor_user)  → accès partiel (pas redevances)
 *   N4 (franchisor_admin) → accès complet
 *   N5+ (platform_admin, superadmin) → accès complet
 *   N2 et moins → aucun accès
 */

import { GlobalRole, GLOBAL_ROLES, hasMinimumRole } from '@/types/globalRoles';

// ============================================================================
// SECTIONS DE L'INTERFACE FRANCHISEUR
// ============================================================================

export const FRANCHISOR_SECTIONS = [
  'dashboard',
  'stats',
  'agences',
  'comparatifs',
  'redevances',
  'animateurs',
  'utilisateurs',
] as const;

export type FranchisorSection = typeof FRANCHISOR_SECTIONS[number];

/** Rôle minimum par section */
const SECTION_MIN_ROLES: Record<FranchisorSection, GlobalRole> = {
  dashboard: 'franchisor_user',    // N3+
  stats: 'franchisor_user',        // N3+
  agences: 'franchisor_user',      // N3+
  comparatifs: 'franchisor_user',  // N3+
  animateurs: 'franchisor_user',   // N3+
  utilisateurs: 'franchisor_user', // N3+
  redevances: 'franchisor_admin',  // N4+ uniquement
};

// ============================================================================
// GUARDS CENTRALISÉS
// ============================================================================

/**
 * Vérifie si un rôle peut accéder à l'interface Franchiseur.
 * Règle : N3+ (franchisor_user et supérieurs).
 */
export function canAccessFranchisorInterface(role: GlobalRole | null): boolean {
  return hasMinimumRole(role, 'franchisor_user');
}

/**
 * Vérifie si un rôle peut accéder à une section spécifique.
 * Ex: redevances = N4+ uniquement.
 */
export function canAccessFranchisorSection(
  role: GlobalRole | null,
  section: FranchisorSection
): boolean {
  if (!canAccessFranchisorInterface(role)) return false;
  const minRole = SECTION_MIN_ROLES[section];
  return hasMinimumRole(role, minRole);
}

/**
 * Retourne toutes les sections accessibles pour un rôle donné.
 */
export function getAccessibleSections(role: GlobalRole | null): FranchisorSection[] {
  if (!canAccessFranchisorInterface(role)) return [];
  return FRANCHISOR_SECTIONS.filter(section => canAccessFranchisorSection(role, section));
}

/**
 * Vérifie si le rôle est un rôle franchiseur "natif" (N3 ou N4).
 * Les N5+ ont accès mais ne sont pas des rôles franchiseur natifs.
 */
export function isNativeFranchisorRole(role: GlobalRole | null): boolean {
  if (!role) return false;
  return role === 'franchisor_user' || role === 'franchisor_admin';
}
