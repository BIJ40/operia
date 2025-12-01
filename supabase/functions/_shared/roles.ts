/**
 * SYSTÈME DE PERMISSIONS V2.0 - Constantes et helpers partagés
 * 
 * Ce fichier centralise les définitions de rôles pour toutes les edge functions.
 * Import: import { GLOBAL_ROLES, getRoleLevel, canEditTarget } from '../_shared/roles.ts'
 */

// Mapping des rôles vers leurs niveaux hiérarchiques
export const GLOBAL_ROLES: Record<string, number> = {
  base_user: 0,        // N0 - Utilisateur de base
  franchisee_user: 1,  // N1 - Utilisateur franchisé
  franchisee_admin: 2, // N2 - Admin franchisé (dirigeant agence)
  franchisor_user: 3,  // N3 - Utilisateur franchiseur (animateur)
  franchisor_admin: 4, // N4 - Admin franchiseur (directeur)
  platform_admin: 5,   // N5 - Admin plateforme
  superadmin: 6,       // N6 - Super admin
}

// Liste ordonnée des rôles pour les dropdowns
export const GLOBAL_ROLES_LIST = [
  { value: 'base_user', label: 'N0 - Utilisateur de base', level: 0 },
  { value: 'franchisee_user', label: 'N1 - Utilisateur franchisé', level: 1 },
  { value: 'franchisee_admin', label: 'N2 - Admin franchisé', level: 2 },
  { value: 'franchisor_user', label: 'N3 - Animateur réseau', level: 3 },
  { value: 'franchisor_admin', label: 'N4 - Directeur réseau', level: 4 },
  { value: 'platform_admin', label: 'N5 - Admin plateforme', level: 5 },
  { value: 'superadmin', label: 'N6 - Super admin', level: 6 },
]

/**
 * Récupère le niveau d'un rôle
 */
export const getRoleLevel = (role: string | null): number => {
  if (!role) return 0
  return GLOBAL_ROLES[role] ?? 0
}

/**
 * Récupère le label d'un rôle
 */
export const getRoleLabel = (role: string | null): string => {
  const found = GLOBAL_ROLES_LIST.find(r => r.value === role)
  return found?.label || 'Inconnu'
}

/**
 * N2+ peut accéder à la page de gestion utilisateurs
 */
export const canAccessUsersPage = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.franchisee_admin // N2+
}

/**
 * N3+ peut créer/modifier des utilisateurs
 */
export const canManageUsers = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.franchisor_user // N3+
}

/**
 * N3+ peut gérer les tickets support
 */
export const canManageSupportTickets = (roleLevel: number): boolean => {
  return roleLevel >= GLOBAL_ROLES.franchisor_user // N3+
}

/**
 * Vérifie si l'appelant peut créer/modifier un utilisateur cible
 * Règles:
 * - N0-N1: ne peuvent pas modifier d'autres utilisateurs
 * - N2: uniquement même agence, max N2
 * - N3+: accès global, mais plafonnement au niveau de l'appelant
 */
export const canEditTarget = (
  callerLevel: number, 
  targetLevel: number, 
  callerAgency: string | null, 
  targetAgency: string | null
): { allowed: boolean; reason?: string } => {
  // N0-N1: ne peuvent pas modifier d'autres utilisateurs
  if (callerLevel < GLOBAL_ROLES.franchisee_admin) {
    return { allowed: false, reason: 'Niveau insuffisant pour gérer des utilisateurs' }
  }
  
  // N2 (franchisee_admin): uniquement même agence, max N1
  if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
    if (callerAgency !== targetAgency) {
      return { allowed: false, reason: 'Vous ne pouvez gérer que les utilisateurs de votre agence' }
    }
    if (targetLevel >= GLOBAL_ROLES.franchisee_admin) {
      return { allowed: false, reason: 'Vous ne pouvez pas attribuer un rôle supérieur ou égal à N2 (Admin agence)' }
    }
    return { allowed: true }
  }
  
  // N3+: accès global, mais plafonnement STRICT au niveau de l'appelant (règle N-1)
  if (targetLevel >= callerLevel) {
    return { allowed: false, reason: `Vous ne pouvez pas attribuer un rôle supérieur ou égal à N${callerLevel}` }
  }
  
  return { allowed: true }
}

/**
 * Vérifie si l'appelant peut réinitialiser le mot de passe d'un utilisateur
 */
export const canResetPassword = (
  callerLevel: number, 
  targetLevel: number, 
  callerAgency: string | null, 
  targetAgency: string | null
): { allowed: boolean; reason?: string } => {
  // N0-N1: ne peuvent pas réinitialiser
  if (callerLevel < GLOBAL_ROLES.franchisee_admin) {
    return { allowed: false, reason: 'Niveau insuffisant pour réinitialiser des mots de passe' }
  }
  
  // N2 (franchisee_admin): uniquement même agence
  if (callerLevel === GLOBAL_ROLES.franchisee_admin) {
    if (callerAgency !== targetAgency) {
      return { allowed: false, reason: 'Vous ne pouvez réinitialiser que les mots de passe de votre agence' }
    }
    if (targetLevel > GLOBAL_ROLES.franchisee_admin) {
      return { allowed: false, reason: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un utilisateur de niveau supérieur' }
    }
    return { allowed: true }
  }
  
  // N3+: peut réinitialiser mais pas pour un niveau supérieur
  if (targetLevel > callerLevel) {
    return { allowed: false, reason: 'Vous ne pouvez pas réinitialiser le mot de passe d\'un utilisateur de niveau supérieur' }
  }
  
  return { allowed: true }
}
