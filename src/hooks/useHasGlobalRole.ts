/**
 * Hook V2.0 - Vérifie si l'utilisateur a le rôle global minimum requis
 * 
 * P0: Ce hook utilise UNIQUEMENT le système V2 (globalRole).
 * Les références legacy (isAdmin) sont supprimées pour éviter les bypasses.
 */

import { usePermissions } from '@/contexts/PermissionsContext';
import { GlobalRole, GLOBAL_ROLES, hasMinimumRole } from '@/types/globalRoles';

/**
 * Vérifie si l'utilisateur connecté a au moins le rôle requis
 * @param minRole - Rôle minimum requis (N0-N6)
 * @returns true si l'utilisateur a le niveau requis ou supérieur
 */
export function useHasGlobalRole(minRole?: GlobalRole): boolean {
  const { globalRole, suggestedGlobalRole } = usePermissions();
  
  // Si pas de rôle requis, juste vérifier l'authentification
  if (!minRole) return true;
  
  // V2: Utiliser le rôle réel ou suggéré, plus de bypass legacy
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  
  return hasMinimumRole(effectiveRole, minRole);
}

/**
 * Vérifie si l'utilisateur peut accéder au niveau spécifié
 * @param minLevel - Niveau numérique minimum (0-6)
 * @returns true si l'utilisateur a le niveau requis
 */
export function useHasMinLevel(minLevel: number): boolean {
  const { globalRole, suggestedGlobalRole } = usePermissions();
  
  // V2: Plus de bypass legacy
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  const userLevel = effectiveRole ? GLOBAL_ROLES[effectiveRole] : 0;
  
  return userLevel >= minLevel;
}

/**
 * Retourne le niveau effectif de l'utilisateur
 */
export function useGlobalRoleLevel(): number {
  const { globalRole, suggestedGlobalRole } = useAuth();
  
  // V2: Calculer le niveau à partir du globalRole uniquement
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  return effectiveRole ? GLOBAL_ROLES[effectiveRole] : 0;
}
