/**
 * V3.0 PHASE 5: Agency Role Floor Enforcement
 * 
 * Règle de sécurité : tout utilisateur avec une agence doit avoir au minimum le rôle N2.
 * Cette règle est appliquée côté base (trigger) ET côté TypeScript (double sécurité).
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

// Rôles considérés comme "trop bas" pour un utilisateur avec agence
const LOW_ROLES: (GlobalRole | null | undefined)[] = [null, undefined, 'base_user', 'franchisee_user'];

// Rôle plancher pour les utilisateurs avec agence
const AGENCY_FLOOR_ROLE: GlobalRole = 'franchisee_admin';

/**
 * Applique la règle du plancher N2 pour les utilisateurs avec agence.
 * Si l'utilisateur a une agence et un rôle < N2, on le monte à N2.
 * 
 * @param agence - L'agence de l'utilisateur (slug ou null)
 * @param globalRole - Le rôle actuel de l'utilisateur
 * @returns Le rôle effectif après application de la règle
 */
export function enforceAgencyRoleFloor(
  agence: string | null | undefined,
  globalRole: GlobalRole | null | undefined
): GlobalRole | null {
  // Pas d'agence = pas de règle de plancher
  if (!agence || agence === '') {
    return globalRole ?? null;
  }
  
  // A une agence : vérifier le plancher
  if (LOW_ROLES.includes(globalRole)) {
    return AGENCY_FLOOR_ROLE;
  }
  
  return globalRole ?? null;
}

/**
 * Vérifie si un rôle respecte la règle du plancher pour une agence.
 * 
 * @param agence - L'agence de l'utilisateur
 * @param globalRole - Le rôle à vérifier
 * @returns true si le rôle est valide, false sinon
 */
export function isValidAgencyRole(
  agence: string | null | undefined,
  globalRole: GlobalRole | null | undefined
): boolean {
  if (!agence || agence === '') {
    return true; // Pas d'agence = tout rôle valide
  }
  
  // A une agence : doit être N2+
  if (!globalRole) return false;
  
  return GLOBAL_ROLES[globalRole] >= GLOBAL_ROLES[AGENCY_FLOOR_ROLE];
}

/**
 * Message d'erreur pour les rôles invalides
 */
export const AGENCY_ROLE_FLOOR_ERROR = 
  'Un utilisateur rattaché à une agence doit avoir au minimum le rôle Dirigeant Agence (N2).';
