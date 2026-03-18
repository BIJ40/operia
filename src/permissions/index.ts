/**
 * PERMISSIONS ENGINE V1.0 - Barrel Export
 * 
 * Point d'entrée unique pour le système de permissions.
 * Tout le code applicatif doit importer depuis ce fichier.
 * 
 * @example
 * import { hasAccess, validateUserPermissions, explainAccess } from '@/permissions';
 */

// Types
export type {
  PermissionContext,
  HasAccessParams,
  PermissionIssue,
  PermissionIssueType,
  PermissionIssueCode,
  AccessTrace,
  EffectiveModule,
  UserViewScope,
  UserManageScope,
  UserManagementCapabilities,
} from './types';

// Constants
export {
  BYPASS_ROLES,
  BYPASS_MIN_LEVEL,
  AGENCY_REQUIRED_MODULES,
  AGENCY_ROLES,
  NETWORK_MODULES,
  NETWORK_MIN_ROLE,
  ROLE_HIERARCHY,
  MODULE_MIN_ROLES,
  MODULE_OPTION_MIN_ROLES,
  MODULE_LABELS,
} from './constants';

// Engine functions
export {
  hasAccess,
  hasMinRole,
  getRoleLevel,
  isBypassRole,
  getEffectiveModules,
  validateUserPermissions,
  explainAccess,
  getDefaultModulesForRole,
  getUserManagementCapabilities,
  isModuleEnabled,
  isModuleOptionEnabled,
} from './permissionsEngine';

// Module Registry (Canon unique)
export {
  getAllModules,
  getModule,
  getModuleOptions,
  isValidOptionPath,
  isValidModuleKey,
  getValidModuleKeys,
  getValidOptionKeys,
  validateModuleDefinitions,
  logValidationIssues,
  PROTECTED_MODULES,
  isProtectedModule,
  ROLE_INTERFACE_MODULES,
  isRoleInterfaceModule,
} from './moduleRegistry';

// Franchisor Interface Access (role-based, not module-based)
export {
  canAccessFranchisorInterface,
  canAccessFranchisorSection,
  getAccessibleSections,
  isNativeFranchisorRole,
} from './franchisorAccess';
export type { FranchisorSection } from './franchisorAccess';

// Dev Validator (COMMIT 2)
export { runDevValidation } from './devValidator';
