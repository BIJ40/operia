/**
 * Hooks de permissions V2.0
 * 
 * Ce fichier est maintenant un wrapper vers usePermissions() du PermissionsContext.
 * À terme, utiliser directement usePermissions() du contexte.
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { useMemo } from 'react';

// ============================================================================
// HOOK PRINCIPAL V2 - À UTILISER
// ============================================================================

/**
 * Hook principal pour les permissions V2
 * Préférez utiliser usePermissions() directement du PermissionsContext
 */
export function usePermissionsV2() {
  const perms = usePermissions();
  const { isSupport, isFranchiseur, hasSupportAgentRole, isSupportAdmin, canManageTickets, hasGlobalRole } = perms;
  
  const isPlatformAdmin = hasGlobalRole('platform_admin');

  const canManageSupport = useMemo(() => {
    return hasSupportAgentRole || isSupportAdmin;
  }, [hasSupportAgentRole, isSupportAdmin]);

  const canEditContent = useMemo(() => {
    return isPlatformAdmin || hasGlobalRole('franchisee_admin');
  }, [isPlatformAdmin, hasGlobalRole]);

  return {
    // V2 - Source de vérité
    hasGlobalRole: perms.hasGlobalRole,
    hasModule: perms.hasModule,
    hasModuleOption: perms.hasModuleOption,
    
    // Support module flags
    hasSupportAgentRole,
    isSupportAdmin,
    canManageTickets,
    canManageSupport,
    
    // Helpers
    canEditContent,
    isPlatformAdmin,
    isSupport,
    isFranchiseur,
  };
}

// ============================================================================
// RE-EXPORTS pour compatibilité d'import
// ============================================================================
export { useHasGlobalRole, useHasMinLevel, useGlobalRoleLevel } from './useHasGlobalRole';
