/**
 * PERMISSIONS V2.0 - Barrel Export
 * 
 * Post-cleanup: V1 engine removed. Only types, shared constants,
 * and franchisor access rules remain.
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

// Shared constants & utility functions
export {
  SHARED_ROLE_HIERARCHY as ROLE_HIERARCHY,
  SHARED_BYPASS_ROLES as BYPASS_ROLES,
  SHARED_AGENCY_REQUIRED_MODULES as AGENCY_REQUIRED_MODULES,
  SHARED_AGENCY_ROLES as AGENCY_ROLES,
  SHARED_NETWORK_MODULES as NETWORK_MODULES,
  SHARED_NETWORK_MIN_ROLE as NETWORK_MIN_ROLE,
  SHARED_MODULE_MIN_ROLES as MODULE_MIN_ROLES,
  SHARED_MODULE_OPTION_MIN_ROLES as MODULE_OPTION_MIN_ROLES,
  SHARED_MODULE_KEYS,
  PLAN_LABELS as MODULE_LABELS,
  hasMinRole,
  getRoleLevel,
  isBypassRole,
  getPlanLabel,
  PLAN_HIERARCHY,
  PLAN_LABELS,
} from './shared-constants';

// Franchisor Interface Access (role-based, not module-based)
export {
  canAccessFranchisorInterface,
  canAccessFranchisorSection,
  getAccessibleSections,
  isNativeFranchisorRole,
} from './franchisorAccess';
export type { FranchisorSection } from './franchisorAccess';
