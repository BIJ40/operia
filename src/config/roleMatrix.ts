/**
 * ROLE_MATRIX V2.0
 * 
 * Source de vérité unique pour les droits d'accès par rôle global.
 * Définit ce que chaque niveau de rôle (N0-N6) peut voir/faire.
 */

import { GlobalRole, GLOBAL_ROLES } from '@/types/globalRoles';

// ============================================================================
// Types pour la matrice de rôles
// ============================================================================

export interface RoleCapabilities {
  // Accès aux sections principales
  canAccessHelpAcademy: boolean;
  canAccessPilotageAgence: boolean;
  canAccessSupport: boolean;        // Créer ses propres tickets
  canAccessSupportConsole: boolean; // Gérer les tickets des autres
  canAccessFranchiseur: boolean;
  canAccessAdmin: boolean;
  
  // Gestion utilisateurs
  canManageUsers: boolean;
  canAssignRolesUpTo: GlobalRole | null; // Le plus haut rôle assignable
  
  // Conditions spéciales
  requiresAgencyForPilotage: boolean;
}

// ============================================================================
// MATRICE DE RÔLES - Source de vérité unique
// ============================================================================

export const ROLE_MATRIX: Record<GlobalRole, RoleCapabilities> = {
  // N0 - Utilisateur de base (visiteur)
  base_user: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: false,
    canAccessSupport: true,
    canAccessSupportConsole: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canAssignRolesUpTo: null,
    requiresAgencyForPilotage: false,
  },

  // N1 - Utilisateur franchisé (technicien, assistant)
  franchisee_user: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: false, // Pas d'accès au pilotage
    canAccessSupport: true,
    canAccessSupportConsole: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canAssignRolesUpTo: null,
    requiresAgencyForPilotage: false,
  },

  // N2 - Admin franchisé (dirigeant agence)
  franchisee_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true, // Accès pilotage SI agence
    canAccessSupport: true,
    canAccessSupportConsole: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canAssignRolesUpTo: null,
    requiresAgencyForPilotage: true, // Doit avoir une agence
  },

  // N3 - Utilisateur franchiseur (animateur réseau)
  franchisor_user: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: false, // Pas de pilotage individuel
    canAccessSupport: true,
    canAccessSupportConsole: true, // Console support
    canAccessFranchiseur: true,    // Vue réseau
    canAccessAdmin: false,
    canManageUsers: true,          // Peut gérer des utilisateurs
    canAssignRolesUpTo: 'franchisee_admin', // Peut assigner jusqu'à N2
    requiresAgencyForPilotage: false,
  },

  // N4 - Admin franchiseur (directeur réseau, DG)
  franchisor_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: false,
    canAccessSupport: true,
    canAccessSupportConsole: true,
    canAccessFranchiseur: true,
    canAccessAdmin: false,
    canManageUsers: true,
    canAssignRolesUpTo: 'franchisor_user', // Peut assigner jusqu'à N3
    requiresAgencyForPilotage: false,
  },

  // N5 - Admin plateforme (support niveau 3)
  platform_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true, // Peut voir tout pour debug
    canAccessSupport: true,
    canAccessSupportConsole: true,
    canAccessFranchiseur: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canAssignRolesUpTo: 'franchisor_admin', // Peut assigner jusqu'à N4
    requiresAgencyForPilotage: false, // Pas de restriction agence
  },

  // N6 - Super administrateur
  superadmin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsole: true,
    canAccessFranchiseur: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canAssignRolesUpTo: 'superadmin', // Peut tout assigner
    requiresAgencyForPilotage: false,
  },
};

// ============================================================================
// Helpers V2 - À utiliser partout
// ============================================================================

/**
 * Obtient les capacités d'un rôle
 */
export function getRoleCapabilities(role: GlobalRole | null): RoleCapabilities {
  if (!role) {
    return ROLE_MATRIX.base_user;
  }
  return ROLE_MATRIX[role] ?? ROLE_MATRIX.base_user;
}

/**
 * Vérifie si un rôle peut accéder à une section
 */
export function canAccessSection(
  role: GlobalRole | null,
  section: keyof Omit<RoleCapabilities, 'canAssignRolesUpTo' | 'requiresAgencyForPilotage' | 'canManageUsers'>,
  agence?: string | null
): boolean {
  const caps = getRoleCapabilities(role);
  
  // Cas spécial : pilotage agence nécessite une agence si le flag est true
  if (section === 'canAccessPilotageAgence' && caps.requiresAgencyForPilotage && !agence) {
    return false;
  }
  
  return caps[section];
}

/**
 * Vérifie si un utilisateur peut assigner un rôle donné
 */
export function canAssignRole(assignerRole: GlobalRole | null, targetRole: GlobalRole): boolean {
  const caps = getRoleCapabilities(assignerRole);
  
  if (!caps.canManageUsers || !caps.canAssignRolesUpTo) {
    return false;
  }
  
  const maxAssignableLevel = GLOBAL_ROLES[caps.canAssignRolesUpTo];
  const targetLevel = GLOBAL_ROLES[targetRole];
  
  return targetLevel <= maxAssignableLevel;
}

/**
 * Obtient la liste des rôles assignables par un utilisateur
 */
export function getAssignableRolesList(assignerRole: GlobalRole | null): GlobalRole[] {
  const caps = getRoleCapabilities(assignerRole);
  
  if (!caps.canManageUsers || !caps.canAssignRolesUpTo) {
    return [];
  }
  
  const maxLevel = GLOBAL_ROLES[caps.canAssignRolesUpTo];
  
  return (Object.keys(GLOBAL_ROLES) as GlobalRole[]).filter(
    role => GLOBAL_ROLES[role] <= maxLevel
  );
}

// ============================================================================
// Mapping pour dashboardTiles et navigation
// ============================================================================

export type TileGroup = 'help_academy' | 'pilotage' | 'support' | 'franchiseur' | 'admin';

/**
 * Vérifie si un groupe de tuiles est visible pour un rôle
 */
export function canAccessTileGroup(
  role: GlobalRole | null,
  group: TileGroup,
  options?: { agence?: string | null; isSupportConsole?: boolean }
): boolean {
  const caps = getRoleCapabilities(role);
  
  switch (group) {
    case 'help_academy':
      return caps.canAccessHelpAcademy;
    case 'pilotage':
      if (caps.requiresAgencyForPilotage && !options?.agence) {
        return false;
      }
      return caps.canAccessPilotageAgence;
    case 'support':
      return caps.canAccessSupport;
    case 'franchiseur':
      return caps.canAccessFranchiseur;
    case 'admin':
      return caps.canAccessAdmin;
    default:
      return false;
  }
}

/**
 * Vérifie si une tuile spécifique est visible
 */
export function canAccessTile(
  role: GlobalRole | null,
  tileId: string,
  options?: { agence?: string | null }
): boolean {
  const caps = getRoleCapabilities(role);
  
  // Tuiles spéciales
  switch (tileId) {
    case 'CONSOLE_SUPPORT':
      return caps.canAccessSupportConsole;
    case 'ADMIN_USERS':
      return caps.canManageUsers;
    case 'ADMIN_ROLES':
    case 'ADMIN_BACKUP':
    case 'ADMIN_SETTINGS':
      return caps.canAccessAdmin;
    default:
      return true; // La visibilité dépend du groupe
  }
}
