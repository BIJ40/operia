/**
 * MFA Configuration & Utilities
 * 
 * Defines which roles require MFA and provides helper functions
 * for MFA state management.
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

// ============================================================================
// MFA POLICY
// ============================================================================

/**
 * Roles that REQUIRE MFA enrollment.
 * Ordered from most to least privileged for rollout planning.
 */
export const MFA_REQUIRED_ROLES: GlobalRole[] = [
  'superadmin',        // N6
  'platform_admin',    // N5
  'franchisor_admin',  // N4
];

/**
 * Minimum role level that triggers MFA requirement.
 * Currently N4 (franchisor_admin) and above.
 */
export const MFA_MIN_ROLE_LEVEL = GLOBAL_ROLES.franchisor_admin; // 4

/**
 * MFA enforcement mode.
 * - 'off': MFA is completely disabled
 * - 'advisory': Users see a banner suggesting MFA but are not blocked
 * - 'enforced': Users with required roles MUST complete MFA to access sensitive areas
 */
export type MfaEnforcementMode = 'off' | 'advisory' | 'enforced';

/**
 * Current MFA enforcement mode.
 * 
 * Start with 'advisory' to allow gradual rollout.
 * Switch to 'enforced' when all admin accounts have enrolled.
 */
export const MFA_ENFORCEMENT_MODE: MfaEnforcementMode = 'advisory';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Check if a given role requires MFA based on policy.
 */
export function isRoleRequiringMfa(role: GlobalRole | null): boolean {
  if (!role) return false;
  const level = GLOBAL_ROLES[role] ?? 0;
  return level >= MFA_MIN_ROLE_LEVEL;
}

/**
 * Sensitive routes/actions that should require AAL2 when MFA is enforced.
 */
export const MFA_PROTECTED_ACTIONS = [
  'admin_users',          // User management
  'admin_backup',         // Data export
  'admin_platform',       // Platform settings
  'rh_sensitive_data',    // Sensitive HR data (SSN, etc.)
  'impersonation',        // User impersonation
] as const;

export type MfaProtectedAction = typeof MFA_PROTECTED_ACTIONS[number];
