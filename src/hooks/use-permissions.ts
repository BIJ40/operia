/**
 * Hooks de permissions V2.0
 * 
 * Ce fichier est maintenant un simple wrapper vers useAuth().
 * À terme, utiliser directement useAuth() avec hasGlobalRole() et hasModule().
 */

import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

// ============================================================================
// HOOK PRINCIPAL V2 - À UTILISER
// ============================================================================

/**
 * Hook principal pour les permissions V2
 * Préférez utiliser useAuth() directement avec hasGlobalRole/hasModule
 */
export function usePermissions() {
  const auth = useAuth();
  const { isAdmin, isSupport, isFranchiseur, hasSupportAgentRole, isSupportAdmin, canManageTickets } = auth;

  const canManageSupport = useMemo(() => {
    return hasSupportAgentRole || isSupportAdmin;
  }, [hasSupportAgentRole, isSupportAdmin]);

  const canEditContent = useMemo(() => {
    return isAdmin || auth.hasGlobalRole('franchisee_admin');
  }, [isAdmin, auth]);

  return {
    // V2 - Source de vérité
    hasGlobalRole: auth.hasGlobalRole,
    hasModule: auth.hasModule,
    hasModuleOption: auth.hasModuleOption,
    
    // Support module flags
    hasSupportAgentRole,
    isSupportAdmin,
    canManageTickets,
    canManageSupport,
    
    // Helpers
    canEditContent,
    isAdmin,
    isSupport,
    isFranchiseur,
  };
}

// ============================================================================
// RE-EXPORTS pour compatibilité d'import
// ============================================================================
export { useHasGlobalRole, useHasMinLevel, useGlobalRoleLevel } from './useHasGlobalRole';
