/**
 * PermissionsContext — Global role, enabled modules, and permission guards.
 *
 * Consumers that only need permission checks should use `usePermissions()`
 * to avoid re-renders from profile or auth session changes.
 */

import { createContext, useContext } from 'react';
import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, ModuleKey } from '@/types/modules';

export interface PermissionContext {
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules;
  agencyId: string | null;
}

export interface PermissionsContextType {
  globalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;

  // Guards
  hasGlobalRole: (requiredRole: GlobalRole) => boolean;
  hasModule: (moduleKey: ModuleKey) => boolean;
  hasModuleOption: (moduleKey: ModuleKey, optionKey: string) => boolean;

  // Derived flags
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;

  // Support module flags
  canAccessSupportUser: boolean;
  hasSupportAgentRole: boolean;
  isSupportAdmin: boolean;
  canManageTickets: boolean;

  // FAQ admin flags
  hasFaqAdminRole: boolean;
  canAccessFaqAdmin: boolean;

  // Scope-based access (maps scope → module check)
  hasAccessToScope: (scope: string) => boolean;

  // Deployment check (module_registry.is_deployed)
  isDeployedModule: (moduleKey: ModuleKey) => boolean;

  // Compat
  suggestedGlobalRole: GlobalRole;
}

export const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

/**
 * Hook — only re-renders when permissions/modules change.
 */
export function usePermissions(): PermissionsContextType {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within AuthProvider');
  return ctx;
}
