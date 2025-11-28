/**
 * Hook V2.0 - Vérifie si l'utilisateur a le rôle global minimum requis
 * Remplace isAdmin/isFranchiseur par une vérification basée sur les niveaux V2
 */

import { useAuth } from '@/contexts/AuthContext';
import { GlobalRole, GLOBAL_ROLES, hasMinimumRole } from '@/types/globalRoles';

/**
 * Vérifie si l'utilisateur connecté a au moins le rôle requis
 * @param minRole - Rôle minimum requis (N0-N6)
 * @returns true si l'utilisateur a le niveau requis ou supérieur
 */
export function useHasGlobalRole(minRole?: GlobalRole): boolean {
  const { globalRole, suggestedGlobalRole, isAdmin } = useAuth();
  
  // Si pas de rôle requis, juste vérifier l'authentification
  if (!minRole) return true;
  
  // Legacy admin bypass (pour transition)
  if (isAdmin) return true;
  
  // Utiliser le rôle réel ou suggéré
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  
  return hasMinimumRole(effectiveRole, minRole);
}

/**
 * Vérifie si l'utilisateur peut accéder au niveau spécifié
 * @param minLevel - Niveau numérique minimum (0-6)
 * @returns true si l'utilisateur a le niveau requis
 */
export function useHasMinLevel(minLevel: number): boolean {
  const { globalRole, suggestedGlobalRole, isAdmin } = useAuth();
  
  // Legacy admin bypass
  if (isAdmin) return true;
  
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  const userLevel = effectiveRole ? GLOBAL_ROLES[effectiveRole] : 0;
  
  return userLevel >= minLevel;
}

/**
 * Retourne le niveau effectif de l'utilisateur
 */
export function useGlobalRoleLevel(): number {
  const { globalRole, suggestedGlobalRole, isAdmin } = useAuth();
  
  // Legacy admin = niveau max
  if (isAdmin) return GLOBAL_ROLES.superadmin;
  
  const effectiveRole = globalRole ?? suggestedGlobalRole;
  return effectiveRole ? GLOBAL_ROLES[effectiveRole] : 0;
}
