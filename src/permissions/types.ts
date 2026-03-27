/**
 * PERMISSIONS ENGINE V1.0 - Types
 * Source de vérité unique pour le système de permissions
 */

import { GlobalRole } from '@/types/globalRoles';
import { ModuleKey, EnabledModules } from '@/types/modules';

// ============================================================================
// CONTEXTE DE PERMISSIONS
// ============================================================================

export interface PermissionContext {
  /** Rôle global de l'utilisateur (N0-N6) */
  globalRole: GlobalRole | null;
  /** Modules activés (source: RPC get_user_effective_modules → user_modules table) */
  enabledModules: EnabledModules | null;
  /** ID de l'agence de l'utilisateur */
  agencyId: string | null;
}

export interface HasAccessParams extends PermissionContext {
  /** Module cible à vérifier */
  moduleId: ModuleKey;
  /** Option spécifique du module (ex: 'agent', 'rh_admin') */
  optionId?: string;
}

// ============================================================================
// RÉSULTATS ET DIAGNOSTICS
// ============================================================================

export type PermissionIssueType = 'error' | 'warning';
export type PermissionIssueCode = 
  | 'AGENCY_REQUIRED'
  | 'NO_EXPLICIT_MODULES'
  | 'AGENCY_MODULE_NO_AGENCY'
  | 'NETWORK_ROLE_WITH_AGENCY_MODULES'
  | 'AGENCY_ROLE_NO_AGENCY'
  | 'ROLE_BELOW_MODULE_MIN';

export interface PermissionIssue {
  type: PermissionIssueType;
  code: PermissionIssueCode;
  message: string;
  fix?: string;
  moduleId?: ModuleKey;
}

export interface AccessTrace {
  step: string;
  result: boolean;
  reason: string;
}

export interface EffectiveModule {
  id: ModuleKey;
  enabled: boolean;
  source: 'explicit' | 'default' | 'bypass';
  options?: Record<string, boolean>;
}

// ============================================================================
// GESTION UTILISATEURS
// ============================================================================

export type UserViewScope = 'none' | 'self' | 'ownAgency' | 'assignedAgencies' | 'allAgencies';
export type UserManageScope = 'none' | 'ownAgency' | 'assignedAgencies' | 'allAgencies';

export interface UserManagementCapabilities {
  viewScope: UserViewScope;
  manageScope: UserManageScope;
  canCreateRoles: GlobalRole[];
  canEditRoles: GlobalRole[];
  canDeactivateRoles: GlobalRole[];
  canDeleteUsers: boolean;
}
