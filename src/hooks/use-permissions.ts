/**
 * Hooks de permissions V2.0
 * 
 * Ce fichier fournit des wrappers de compatibilité pour la migration vers V2.
 * À terme, utiliser directement useAuth() avec hasGlobalRole() et hasModule().
 */

import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useCallback } from 'react';
import { GLOBAL_ROLES } from '@/types/globalRoles';

// ============================================================================
// HOOKS DE COMPATIBILITÉ - Migration vers V2
// ============================================================================

/**
 * @deprecated Utiliser useHasGlobalRole() à la place
 * Ce hook est conservé uniquement pour compatibilité pendant la migration
 */
export function useIsBlockLocked() {
  const { isAdmin } = useAuth();

  return useCallback((_scopeSlug: string, _blocks: any[] = []): boolean => {
    // V2: Plus de verrouillage par block, tout passe par RoleGuard
    // Les admins ne sont jamais bloqués
    if (isAdmin) return false;
    
    // Par défaut, ne pas bloquer (V2 utilise RoleGuard sur les routes)
    return false;
  }, [isAdmin]);
}

/**
 * @deprecated Utiliser useAuth() directement avec hasGlobalRole() et hasModule()
 */
export function usePermissions() {
  const auth = useAuth();
  const { globalRole, isAdmin, isSupport, isFranchiseur } = auth;
  
  const globalRoleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;

  // Wrapper simplifié basé sur V2
  const checkAccess = useCallback((
    _scopeSlug: string, 
    action: 'view' | 'edit' | 'create' | 'delete' | 'admin' = 'view'
  ): boolean => {
    if (isAdmin) return true;
    
    switch (action) {
      case 'view': return true; // V2: contrôlé par RoleGuard
      case 'edit': return globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
      case 'create': return globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
      case 'delete': return globalRoleLevel >= GLOBAL_ROLES.franchisor_user;
      case 'admin': return globalRoleLevel >= GLOBAL_ROLES.platform_admin;
      default: return true;
    }
  }, [isAdmin, globalRoleLevel]);

  const getPermissionLevel = useCallback((_scopeSlug: string): number => {
    if (isAdmin) return 4;
    if (isFranchiseur) return 3;
    if (globalRoleLevel >= GLOBAL_ROLES.franchisee_admin) return 2;
    return 1;
  }, [isAdmin, isFranchiseur, globalRoleLevel]);

  const hasMinLevel = useCallback((_scopeSlug: string, minLevel: number): boolean => {
    return getPermissionLevel(_scopeSlug) >= minLevel;
  }, [getPermissionLevel]);

  const getScopesByArea = useCallback((_area: string): any[] => {
    return []; // V2: plus de scopes, utiliser modules
  }, []);

  const canManageSupport = useMemo(() => {
    return isAdmin || isSupport || isFranchiseur;
  }, [isAdmin, isSupport, isFranchiseur]);

  const canEditContent = useMemo(() => {
    return isAdmin || globalRoleLevel >= GLOBAL_ROLES.franchisee_admin;
  }, [isAdmin, globalRoleLevel]);

  return {
    checkAccess,
    getPermissionLevel,
    hasMinLevel,
    getScopesByArea,
    getEffectivePermission: auth.getEffectivePermission,
    hasCapability: auth.hasCapability,
    canManageSupport,
    canEditContent,
    isAdmin,
    isSupport,
    isFranchiseur,
    scopes: [],
    PERMISSION_LEVELS: { NONE: 0, VIEW: 1, EDIT: 2, MANAGE: 3, ADMIN: 4 },
    // Wrappers de compatibilité
    canViewScope: auth.canViewScope,
    canEditScope: auth.canEditScope,
    canCreateScope: auth.canCreateScope,
    canDeleteScope: auth.canDeleteScope,
    canAdminScope: auth.canAdminScope,
  };
}

/**
 * @deprecated Utiliser useAuth().canViewScope() ou mieux: useHasGlobalRole()
 */
export function useCanAccess(_scopeSlug: string, _action: string = 'view'): boolean {
  const { isAdmin } = useAuth();
  // V2: L'accès est contrôlé par RoleGuard, donc retourner true par défaut
  return isAdmin || true;
}

/**
 * @deprecated Plus utilisé en V2
 */
export function useScopePermission(_scopeSlug: string) {
  const { getEffectivePermission } = useAuth();
  return useMemo(() => getEffectivePermission(_scopeSlug), [getEffectivePermission, _scopeSlug]);
}

/**
 * @deprecated Utiliser useHasGlobalRole() à la place
 */
export function useRequiredLevel(_scopeSlug: string, requiredLevel: number): boolean {
  const { hasMinLevel } = usePermissions();
  return useMemo(() => hasMinLevel(_scopeSlug, requiredLevel), [hasMinLevel, _scopeSlug, requiredLevel]);
}

// ============================================================================
// Pour compatibilité avec les anciens imports
// ============================================================================
export function useFilteredBlocks<T>(blocks: T[]): T[] {
  return blocks;
}
