/**
 * V3.1: Agency Role Floor Enforcement - DÉSACTIVÉ
 * 
 * HISTORIQUE: Le plancher N2 automatique a été désactivé car il empêchait
 * de créer des employés d'agence (commercial, assistante) avec le rôle N1 (franchisee_user).
 * 
 * Le trigger DB trg_enforce_agency_role_floor a été supprimé.
 * Les fonctions ci-dessous sont conservées pour rétrocompatibilité mais ne forcent plus le N2.
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

/**
 * DÉSACTIVÉ: Retourne simplement le rôle tel quel.
 * L'ancien comportement forçait N2 pour tout utilisateur avec agence.
 */
export function enforceAgencyRoleFloor(
  agence: string | null | undefined,
  globalRole: GlobalRole | null | undefined
): GlobalRole | null {
  return globalRole ?? null;
}

/**
 * DÉSACTIVÉ: Retourne toujours true.
 * L'ancien comportement exigeait N2+ pour les utilisateurs avec agence.
 */
export function isValidAgencyRole(
  agence: string | null | undefined,
  globalRole: GlobalRole | null | undefined
): boolean {
  return true;
}

/**
 * Message d'erreur (conservé pour rétrocompatibilité)
 */
export const AGENCY_ROLE_FLOOR_ERROR = 
  'Un utilisateur rattaché à une agence doit avoir au minimum le rôle Utilisateur Agence (N1).';
