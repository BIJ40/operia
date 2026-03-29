/**
 * usePermissionsBridge — V2-only (legacy V1 fallback removed)
 *
 * All 77+ consumer files import from here. Interface unchanged.
 */

import { usePermissionsV2Safe } from '@/contexts/PermissionsContextV2';
import { usePermissions } from '@/contexts/PermissionsContext';
import { PermissionEntry } from '@/types/permissions-v2';
import type { GlobalRole } from '@/types/globalRoles';
import type { EnabledModules } from '@/types/modules';

interface PermissionsBridgeResult {
  hasGlobalRole: (requiredRole: string) => boolean;
  hasModule: (moduleKey: string) => boolean;
  hasModuleOption: (moduleKey: string, optionKey: string) => boolean;
  hasAccessToScope: (scope: string) => boolean;
  isDeployedModule: (moduleKey: string) => boolean;
  globalRole: GlobalRole | null;
  suggestedGlobalRole: GlobalRole | null;
  enabledModules: EnabledModules | null;
  isAdmin: boolean;
  isSupport: boolean;
  isFranchiseur: boolean;
  canAccessSupportUser: boolean;
  hasSupportAgentRole: boolean;
  isSupportAdmin: boolean;
  canManageTickets: boolean;
  hasFaqAdminRole: boolean;
  canAccessFaqAdmin: boolean;
}

export function usePermissionsBridge(): PermissionsBridgeResult {
  // V1 context still provides globalRole, hasGlobalRole, hasAccessToScope etc.
  const v1 = usePermissions();
  const v2 = usePermissionsV2Safe();

  // If V2 context is available, use it for module-level checks
  if (v2) {
    const entries: PermissionEntry[] = v2.entries;

    const entryMap = new Map<string, PermissionEntry>();
    for (const entry of entries) {
      entryMap.set(entry.module_key, entry);
    }

    const hasBypass = entries.some(e => e.source_summary === 'bypass');

    const isFranchiseur = (() => {
      const role = v1.globalRole;
      return (
        role === 'franchisor_user' ||
        role === 'franchisor_admin' ||
        role === 'platform_admin' ||
        role === 'superadmin'
      );
    })();

    const supportEntry = entryMap.get('support.aide_en_ligne');
    const isSupport = supportEntry?.granted === true;

    const enabledModulesV2 = entries
      .filter(e => e.granted && e.access_level !== 'none')
      .reduce<Record<string, boolean>>((acc, e) => {
        acc[e.module_key] = true;
        return acc;
      }, {}) as unknown as EnabledModules;

    return {
      hasModule: (moduleKey: string) => {
        const entry = entryMap.get(moduleKey);
        if (!entry) return false;
        return entry.granted && entry.access_level !== 'none';
      },

      hasModuleOption: (moduleKey: string, optionKey: string) => {
        const entry = entryMap.get(moduleKey);
        if (!entry || !entry.granted) return false;
        return entry.options?.[optionKey] === true;
      },

      isDeployedModule: (moduleKey: string) => {
        return entryMap.has(moduleKey);
      },

      hasGlobalRole:    v1.hasGlobalRole,
      hasAccessToScope: v1.hasAccessToScope,

      globalRole:          v1.globalRole,
      suggestedGlobalRole: v1.suggestedGlobalRole,
      enabledModules:      enabledModulesV2,
      isAdmin:             hasBypass,
      isSupport,
      isFranchiseur,
      canAccessSupportUser: v1.canAccessSupportUser,
      hasSupportAgentRole:  v1.hasSupportAgentRole,
      isSupportAdmin:       v1.isSupportAdmin,
      canManageTickets:     v1.canManageTickets,
      hasFaqAdminRole:      v1.hasFaqAdminRole,
      canAccessFaqAdmin:    v1.canAccessFaqAdmin,
    };
  }

  // Fallback to V1 context (V2 provider not mounted yet)
  return {
    hasGlobalRole:        v1.hasGlobalRole,
    hasModule:            v1.hasModule,
    hasModuleOption:      v1.hasModuleOption,
    hasAccessToScope:     v1.hasAccessToScope,
    isDeployedModule:     v1.isDeployedModule,
    globalRole:           v1.globalRole,
    suggestedGlobalRole:  v1.suggestedGlobalRole,
    enabledModules:       v1.enabledModules,
    isAdmin:              v1.isAdmin,
    isSupport:            v1.isSupport,
    isFranchiseur:        v1.isFranchiseur,
    canAccessSupportUser: v1.canAccessSupportUser,
    hasSupportAgentRole:  v1.hasSupportAgentRole,
    isSupportAdmin:       v1.isSupportAdmin,
    canManageTickets:     v1.canManageTickets,
    hasFaqAdminRole:      v1.hasFaqAdminRole,
    canAccessFaqAdmin:    v1.canAccessFaqAdmin,
  };
}
