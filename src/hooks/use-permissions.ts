import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useCallback } from 'react';
import { ScopeSlug, EffectivePermission, PERMISSION_LEVELS } from '@/types/permissions';

interface Block {
  id: string;
  parentId?: string | null;
}

// Hook pour obtenir les blocks filtrés (conservé pour compatibilité)
export function useFilteredBlocks<T extends Block>(blocks: T[]): T[] {
  return blocks;
}

/**
 * Legacy wrapper pour compatibilité - NEUTRALISÉ
 * Les IDs de blocks legacy (block-* ou UUID) retournent toujours false (pas locked)
 * Seuls les vrais scopes V2 ('apogee', 'apporteurs', etc.) sont vérifiés
 */
export function useIsBlockLocked() {
  const { isAdmin, getEffectivePermission } = useAuth();

  return useCallback((scopeSlug: string, _blocks: Block[] = []): boolean => {
    // Admin = jamais locked
    if (isAdmin) {
      console.log('[useIsBlockLocked] Admin detected, returning false');
      return false;
    }

    // Détection des IDs de blocks legacy (format block-* ou UUID)
    const isBlockPrefix = scopeSlug.startsWith('block-');
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scopeSlug);
    const isLegacyBlockId = isBlockPrefix || isUUID;

    console.log('[useIsBlockLocked] Check:', { scopeSlug, isBlockPrefix, isUUID, isLegacyBlockId, isAdmin });

    // Les blocks legacy ne sont plus verrouillés par ce système
    // La V2 (RoleGuard / hasGlobalRole) contrôle l'accès aux pages
    if (isLegacyBlockId) {
      console.log('[useIsBlockLocked] Legacy block ID detected, returning false (unlocked)');
      return false;
    }

    // Pour les vrais scopes V2, utiliser le système normal
    const perm = getEffectivePermission(scopeSlug);
    console.log('[useIsBlockLocked] V2 scope check:', { scopeSlug, canView: perm.canView, level: perm.level });
    return !perm.canView;
  }, [isAdmin, getEffectivePermission]);
}

// Hook principal pour les permissions de scope
export function usePermissions() {
  const { 
    canViewScope, 
    canEditScope, 
    canCreateScope, 
    canDeleteScope,
    canAdminScope,
    getEffectivePermission,
    hasCapability,
    isAdmin,
    isSupport,
    isFranchiseur,
    scopes
  } = useAuth();

  // Vérifier l'accès à un scope avec une action spécifique
  const checkAccess = useCallback((scopeSlug: ScopeSlug | string, action: 'view' | 'edit' | 'create' | 'delete' | 'admin' = 'view'): boolean => {
    switch (action) {
      case 'view': return canViewScope(scopeSlug);
      case 'edit': return canEditScope(scopeSlug);
      case 'create': return canCreateScope(scopeSlug);
      case 'delete': return canDeleteScope(scopeSlug);
      case 'admin': return canAdminScope(scopeSlug);
      default: return canViewScope(scopeSlug);
    }
  }, [canViewScope, canEditScope, canCreateScope, canDeleteScope, canAdminScope]);

  // Obtenir le niveau de permission effectif
  const getPermissionLevel = useCallback((scopeSlug: ScopeSlug | string): number => {
    return getEffectivePermission(scopeSlug).level;
  }, [getEffectivePermission]);

  // Vérifier si l'utilisateur a un niveau minimum
  const hasMinLevel = useCallback((scopeSlug: ScopeSlug | string, minLevel: number): boolean => {
    return getPermissionLevel(scopeSlug) >= minLevel;
  }, [getPermissionLevel]);

  // Obtenir tous les scopes accessibles par area
  const getScopesByArea = useCallback((area: string): typeof scopes => {
    return scopes.filter(s => s.area === area && canViewScope(s.slug));
  }, [scopes, canViewScope]);

  // Vérifier si l'utilisateur peut gérer le support
  const canManageSupport = useMemo(() => {
    return isAdmin || isSupport || isFranchiseur || hasCapability('support');
  }, [isAdmin, isSupport, isFranchiseur, hasCapability]);

  // Vérifier si l'utilisateur peut éditer le contenu
  const canEditContent = useMemo(() => {
    return isAdmin || hasCapability('content_editor');
  }, [isAdmin, hasCapability]);

  return {
    checkAccess,
    getPermissionLevel,
    hasMinLevel,
    getScopesByArea,
    getEffectivePermission,
    hasCapability,
    canManageSupport,
    canEditContent,
    isAdmin,
    isSupport,
    isFranchiseur,
    scopes,
    PERMISSION_LEVELS,
    // Helpers directs
    canViewScope,
    canEditScope,
    canCreateScope,
    canDeleteScope,
    canAdminScope
  };
}

// Hook simplifié pour vérifier rapidement un accès
export function useCanAccess(scopeSlug: ScopeSlug | string, action: 'view' | 'edit' | 'create' | 'delete' | 'admin' = 'view'): boolean {
  const { checkAccess } = usePermissions();
  return useMemo(() => checkAccess(scopeSlug, action), [checkAccess, scopeSlug, action]);
}

// Hook pour obtenir la permission effective d'un scope
export function useScopePermission(scopeSlug: ScopeSlug | string): EffectivePermission {
  const { getEffectivePermission } = usePermissions();
  return useMemo(() => getEffectivePermission(scopeSlug), [getEffectivePermission, scopeSlug]);
}

// Hook pour vérifier le niveau minimum requis
export function useRequiredLevel(scopeSlug: ScopeSlug | string, requiredLevel: number): boolean {
  const { hasMinLevel } = usePermissions();
  return useMemo(() => hasMinLevel(scopeSlug, requiredLevel), [hasMinLevel, scopeSlug, requiredLevel]);
}
