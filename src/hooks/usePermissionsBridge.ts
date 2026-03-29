/**
 * usePermissionsBridge — Hook de transition V1 → V2
 *
 * Retourne exactement la même interface que usePermissions() V1.
 * Selon USE_PERMISSIONS_V2, délègue soit au contexte V1 soit au contexte V2.
 *
 * Les 67 fichiers consommateurs remplacent :
 *   const { hasModule, isAdmin, ... } = usePermissions();
 * par :
 *   const { hasModule, isAdmin, ... } = usePermissionsBridge();
 *
 * Aucune autre modification nécessaire dans ces fichiers.
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { usePermissionsV2Safe } from '@/contexts/PermissionsContextV2';
import { useAppFeatureFlag } from '@/hooks/useAppFeatureFlag';
import { PermissionEntry } from '@/types/permissions-v2';
import type { GlobalRole } from '@/types/globalRoles';

interface PermissionsBridgeResult {
  hasGlobalRole: (requiredRole: string) => boolean;
  hasModule: (moduleKey: string) => boolean;
  hasModuleOption: (moduleKey: string, optionKey: string) => boolean;
  hasAccessToScope: (scope: string) => boolean;
  isDeployedModule: (moduleKey: string) => boolean;
  globalRole: GlobalRole | null;
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
  // Appels inconditionnels — règles des hooks respectées
  const useV2Flag = useAppFeatureFlag('USE_PERMISSIONS_V2');
  const v1 = usePermissions();
  const v2 = usePermissionsV2Safe(); // null si PermissionsProviderV2 absent

  // V2 actif uniquement si flag=true ET contexte V2 disponible
  const useV2 = useV2Flag && v2 !== null;

  if (!useV2 || !v2) {
    return {
      hasGlobalRole:        v1.hasGlobalRole,
      hasModule:            v1.hasModule,
      hasModuleOption:      v1.hasModuleOption,
      hasAccessToScope:     v1.hasAccessToScope,
      isDeployedModule:     v1.isDeployedModule,
      globalRole:           v1.globalRole,
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

  // V2 actif — construire l'interface V1 depuis les données V2
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

    // not_granted = déployé mais non accordé → isDeployedModule = true
    isDeployedModule: (moduleKey: string) => {
      return entryMap.has(moduleKey);
    },

    // Déléguer à V1 — hors scope V2
    hasGlobalRole:    v1.hasGlobalRole,
    hasAccessToScope: v1.hasAccessToScope,

    globalRole:           v1.globalRole,
    isAdmin:              hasBypass,
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
