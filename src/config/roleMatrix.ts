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
  /**
   * canAccessSupport: Capacité NATIVE de tout utilisateur connecté
   * Permet d'accéder à "Mes Demandes" (/mes-demandes) et créer des tickets.
   * Doit être TRUE pour tous les rôles N0-N6.
   */
  canAccessSupport: boolean;
  /**
   * canAccessSupportConsoleUI: Accès au back-office support (/support/console)
   * P1.2 - Option B, P2.1 - Sémantique clarifiée
   * Accessible aux support.agent=true OU N5+ (platform_admin, superadmin)
   * Note: Renommé de canAccessSupportConsole pour clarté sémantique UI vs backend
   */
  canAccessSupportConsoleUI: boolean;
  canAccessFranchiseur: boolean;
  canAccessAdmin: boolean;
  
  // Gestion utilisateurs
  canManageUsers: boolean;
  canAssignRolesUpTo: GlobalRole | null; // Le plus haut rôle assignable
  
  // Conditions spéciales
  requiresAgencyForPilotage: boolean;
}

// ============================================================================
// GESTION UTILISATEURS - Matrice par rôle
// ============================================================================

export type UserViewScope = 'none' | 'self' | 'ownAgency' | 'assignedAgencies' | 'allAgencies';
export type UserManageScope = 'none' | 'ownAgency' | 'assignedAgencies' | 'allAgencies';

export interface UserManagementCapabilities {
  viewScope: UserViewScope;
  manageScope: UserManageScope;
  canCreateRoles: GlobalRole[];
  canEditRoles: GlobalRole[];
  canDeactivateRoles: GlobalRole[];
  canDeleteUsers: boolean; // Hard delete (N5+ only)
}

/**
 * Obtient les capacités de gestion utilisateurs pour un rôle donné
 */
export function getUserManagementCapabilities(role: GlobalRole | null): UserManagementCapabilities {
  if (!role) {
    return {
      viewScope: 'none',
      manageScope: 'none',
      canCreateRoles: [],
      canEditRoles: [],
      canDeactivateRoles: [],
      canDeleteUsers: false,
    };
  }

  switch (role) {
    case 'base_user': // N0
      return {
        viewScope: 'self',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };

    case 'franchisee_user': // N1
      return {
        viewScope: 'ownAgency',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };

    case 'franchisee_admin': // N2 - Dirigeant agence
      return {
        viewScope: 'ownAgency',
        manageScope: 'ownAgency',
        canCreateRoles: ['franchisee_user'], // Max N1 - base_user exclu (N5/N6 seulement)
        canEditRoles: ['franchisee_user'],
        canDeactivateRoles: ['franchisee_user'],
        canDeleteUsers: false,
      };

    case 'franchisor_user': // N3 - Animateur réseau
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['franchisee_user', 'franchisee_admin'],
        canEditRoles: ['franchisee_user', 'franchisee_admin'],
        canDeactivateRoles: ['franchisee_user', 'franchisee_admin'],
        canDeleteUsers: false,
      };

    case 'franchisor_admin': // N4 - Directeur/DG réseau
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user'], // Max N3 - base_user exclu
        canEditRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user'],
        canDeactivateRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user'],
        canDeleteUsers: false,
      };

    case 'platform_admin': // N5
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'], // Max N4
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin'],
        canDeleteUsers: true,
      };

    case 'superadmin': // N6
      return {
        viewScope: 'allAgencies',
        manageScope: 'allAgencies',
        canCreateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'], // Max N5 (règle N-1)
        canEditRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'],
        canDeactivateRoles: ['base_user', 'franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin'],
        canDeleteUsers: true,
      };

    default:
      return {
        viewScope: 'none',
        manageScope: 'none',
        canCreateRoles: [],
        canEditRoles: [],
        canDeactivateRoles: [],
        canDeleteUsers: false,
      };
  }
}

/**
 * Vérifie si un utilisateur peut voir un autre utilisateur donné
 */
export function canViewUser(
  callerRole: GlobalRole | null,
  callerAgency: string | null,
  targetAgency: string | null,
  assignedAgencies?: string[]
): boolean {
  const caps = getUserManagementCapabilities(callerRole);
  
  switch (caps.viewScope) {
    case 'none':
      return false;
    case 'self':
      return false; // self = on ne voit pas les autres
    case 'ownAgency':
      return callerAgency !== null && callerAgency === targetAgency;
    case 'assignedAgencies':
      if (!targetAgency) return false;
      if (assignedAgencies && assignedAgencies.length > 0) {
        return assignedAgencies.includes(targetAgency);
      }
      return true; // Si pas d'assignation, voit tout
    case 'allAgencies':
      return true;
    default:
      return false;
  }
}

/**
 * Vérifie si un utilisateur peut gérer (créer/éditer/désactiver) un autre utilisateur
 */
export function canManageUser(
  callerRole: GlobalRole | null,
  callerAgency: string | null,
  targetRole: GlobalRole | null,
  targetAgency: string | null,
  assignedAgencies?: string[]
): boolean {
  const caps = getUserManagementCapabilities(callerRole);
  
  // Vérifier le scope d'agence
  let agencyAllowed = false;
  switch (caps.manageScope) {
    case 'none':
      return false;
    case 'ownAgency':
      agencyAllowed = callerAgency !== null && callerAgency === targetAgency;
      break;
    case 'assignedAgencies':
      if (!targetAgency) {
        agencyAllowed = true; // Utilisateur sans agence = gérable
      } else if (assignedAgencies && assignedAgencies.length > 0) {
        agencyAllowed = assignedAgencies.includes(targetAgency);
      } else {
        agencyAllowed = true; // Pas d'assignation = tout
      }
      break;
    case 'allAgencies':
      agencyAllowed = true;
      break;
  }
  
  if (!agencyAllowed) return false;
  
  // Vérifier le rôle cible
  if (!targetRole) return true; // Utilisateur sans rôle = éditable
  return caps.canEditRoles.includes(targetRole);
}

/**
 * Vérifie si un utilisateur peut assigner un rôle donné
 */
export function canAssignRoleV2(callerRole: GlobalRole | null, targetRole: GlobalRole): boolean {
  const caps = getUserManagementCapabilities(callerRole);
  return caps.canCreateRoles.includes(targetRole);
}

/**
 * Vérifie si un utilisateur peut désactiver un autre utilisateur
 */
export function canDeactivateUser(
  callerRole: GlobalRole | null,
  targetRole: GlobalRole | null
): boolean {
  const caps = getUserManagementCapabilities(callerRole);
  if (!targetRole) return caps.canDeactivateRoles.length > 0;
  return caps.canDeactivateRoles.includes(targetRole);
}

// ============================================================================
// CHAMPS UTILISATEUR vs PROFIL
// ============================================================================

/**
 * Champs "USER" (compte métier) - gérés par admins/managers
 */
export const USER_FIELDS = [
  'email',
  'first_name',
  'last_name',
  'agence',
  'global_role',
  'enabled_modules',
  'role_agence', // Poste occupé
  'is_active',
  'deactivated_at',
  'deactivated_by',
] as const;

/**
 * Champs "PROFIL" (self-service) - éditables par l'utilisateur lui-même
 */
export const PROFILE_FIELDS = [
  'avatar_url',
  // Futurs champs: phone_mobile, phone_fix, preferences_notifications, etc.
] as const;

/**
 * Champs LEGACY - supprimés de la DB (2025-11-29)
 * Conservé pour documentation uniquement
 */
export const LEGACY_FIELDS_REMOVED = [
  'system_role',      // Supprimé de profiles
  'group_id',         // Supprimé de profiles  
  'role_id',          // Supprimé de profiles
  'support_level',    // À supprimer
  'service_competencies', // À supprimer
] as const;

// ============================================================================
// MATRICE DE RÔLES - Source de vérité unique
// ============================================================================

export const ROLE_MATRIX: Record<GlobalRole, RoleCapabilities> = {
  // N0 - Utilisateur de base (visiteur)
  base_user: {
    canAccessHelpAcademy: false,
    canAccessPilotageAgence: false,
    canAccessSupport: true,
    canAccessSupportConsoleUI: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canAssignRolesUpTo: null,
    requiresAgencyForPilotage: false,
  },

  // N1 - Utilisateur franchisé (technicien, assistant)
  franchisee_user: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: false,
    canAccessSupport: true,
    canAccessSupportConsoleUI: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: false,
    canAssignRolesUpTo: null,
    requiresAgencyForPilotage: false,
  },

  // N2 - Admin franchisé (dirigeant agence)
  franchisee_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsoleUI: false,
    canAccessFranchiseur: false,
    canAccessAdmin: false,
    canManageUsers: true,
    canAssignRolesUpTo: 'franchisee_user',
    requiresAgencyForPilotage: true,
  },

  // N3 - Utilisateur franchiseur (animateur réseau)
  franchisor_user: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsoleUI: false,
    canAccessFranchiseur: true,
    canAccessAdmin: false,
    canManageUsers: true,
    canAssignRolesUpTo: 'franchisee_admin',
    requiresAgencyForPilotage: true,
  },

  // N4 - Admin franchiseur (directeur réseau, DG)
  franchisor_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsoleUI: false,
    canAccessFranchiseur: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canAssignRolesUpTo: 'franchisor_user',
    requiresAgencyForPilotage: true,
  },

  // N5 - Admin plateforme (support niveau 3)
  platform_admin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsoleUI: true,
    canAccessFranchiseur: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canAssignRolesUpTo: 'platform_admin',
    requiresAgencyForPilotage: false,
  },

  // N6 - Super administrateur
  superadmin: {
    canAccessHelpAcademy: true,
    canAccessPilotageAgence: true,
    canAccessSupport: true,
    canAccessSupportConsoleUI: true,
    canAccessFranchiseur: true,
    canAccessAdmin: true,
    canManageUsers: true,
    canAssignRolesUpTo: 'superadmin',
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

// ============================================================================
// P2.3 - Navigation Unifiée - Fonction centrale d'accès
// ============================================================================

export interface FeatureAccessContext {
  globalRole: GlobalRole | null;
  agence?: string | null;
  enabledModules?: Record<string, any> | null;
  canAccessSupportConsoleUI?: boolean;
}

/**
 * P2.3 - Fonction unique pour vérifier l'accès à n'importe quelle feature
 * Remplace la logique dispersée dans Landing.tsx, UnifiedSidebar.tsx, etc.
 * 
 * @param featureId - ID de la tile, route, ou nav item
 * @param context - Contexte d'authentification (role, agence, modules, etc.)
 * @returns true si l'utilisateur peut accéder à cette feature
 */
export function canAccessFeature(
  featureId: string,
  context: FeatureAccessContext
): boolean {
  const { globalRole, agence, enabledModules, canAccessSupportConsoleUI } = context;
  const caps = getRoleCapabilities(globalRole);
  
  // Helper: vérifie si un module est activé
  const hasModuleActivated = (moduleKey: string): boolean => {
    // N5+ bypass complet
    const roleLevel = globalRole ? GLOBAL_ROLES[globalRole] : 0;
    if (roleLevel >= GLOBAL_ROLES.platform_admin) return true;
    
    if (!enabledModules) return false;
    const moduleState = enabledModules[moduleKey as keyof typeof enabledModules];
    if (typeof moduleState === 'boolean') return moduleState;
    if (typeof moduleState === 'object') return moduleState.enabled;
    return false;
  };
  
  // Mapping featureId → règles d'accès
  // Features principales (tiles, routes, nav items)
  switch (featureId) {
    // Help Academy - VÉRIFIE RÔLE ET MODULE
    case 'GUIDE_APOGEE':
    case 'apogee':
    case 'academy_apogee':
      return caps.canAccessHelpAcademy && hasModuleActivated('guides');
      
    case 'GUIDE_APPORTEURS':
    case 'apporteurs':
    case 'academy_apporteurs':
      return caps.canAccessHelpAcademy && hasModuleActivated('guides');
      
    case 'BASE_DOCUMENTAIRE':
    case 'helpconfort':
    case 'academy_documents':
      return caps.canAccessHelpAcademy && hasModuleActivated('guides');
    
    // Pilotage Agence - VÉRIFIE RÔLE ET MODULE (canonique: agence)
    case 'STATISTIQUES_HUB':
    case 'mes_indicateurs':
      if (caps.requiresAgencyForPilotage && !agence) return false;
      return caps.canAccessPilotageAgence && hasModuleActivated('agence');
      
    case 'ACTIONS_A_MENER':
    case 'actions_a_mener':
      if (caps.requiresAgencyForPilotage && !agence) return false;
      return caps.canAccessPilotageAgence && hasModuleActivated('agence');
      
    case 'DIFFUSION':
    case 'diffusion':
      if (caps.requiresAgencyForPilotage && !agence) return false;
      return caps.canAccessPilotageAgence && hasModuleActivated('agence');
      
    case 'RH_TECH':
    case 'rh_tech':
      if (caps.requiresAgencyForPilotage && !agence) return false;
      return caps.canAccessPilotageAgence && hasModuleActivated('agence');
      
    case 'MON_EQUIPE':
    case 'mon_equipe':
      if (caps.requiresAgencyForPilotage && !agence) return false;
      return caps.canAccessPilotageAgence && hasModuleActivated('agence');
    
    // Support
    case 'CENTRE_AIDE':
    case 'MES_DEMANDES':
    case 'mes_demandes':
      return caps.canAccessSupport;
      
    case 'CONSOLE_SUPPORT':
      // P2.1 - Utiliser canAccessSupportConsoleUI (support.agent OU N5+)
      return canAccessSupportConsoleUI ?? caps.canAccessSupportConsoleUI;
    
    // Gestion de Projet
    case 'PROJET_KANBAN':
    case 'apogee_tickets':
      // Vérifié au niveau du groupe - module required
      return true;
    
    // Franchiseur
    case 'RESEAU_FRANCHISEUR':
    case 'franchiseur_dashboard':
      return caps.canAccessFranchiseur;
      
    case 'FRANCHISEUR_STATS':
    case 'franchiseur_kpi':
      return caps.canAccessFranchiseur;
      
    case 'FRANCHISEUR_ROYALTIES':
    case 'franchiseur_royalties':
      return caps.canAccessFranchiseur;
    
    // Administration
    case 'ADMIN_USERS':
    case 'admin_users':
      return caps.canManageUsers;
      
    case 'ADMIN_BACKUP':
    case 'admin_backup':
      return caps.canAccessAdmin;
      
    case 'ADMIN_SETTINGS':
    case 'admin_settings':
      return caps.canAccessAdmin;
      
    case 'ADMIN_SYSTEM_HEALTH':
      return caps.canAccessAdmin;
    
    default:
      // Par défaut, accessible si le groupe parent l'est
      return true;
  }
}

/**
 * Vérifie si un utilisateur peut assigner un rôle donné (legacy helper)
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

export type TileGroup = 'guides' | 'pilotage' | 'rh' | 'support' | 'projects' | 'franchiseur' | 'admin';

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
    case 'guides':
      return caps.canAccessHelpAcademy;
    case 'pilotage':
      if (caps.requiresAgencyForPilotage && !options?.agence) {
        return false;
      }
      return caps.canAccessPilotageAgence;
    case 'rh':
      // Le groupe RH est toujours accessible - la visibilité est contrôlée par le module RH au niveau de la tuile
      return true;
    case 'support':
      return caps.canAccessSupport;
    case 'projects':
      // Ticketing = overwrite-only, vérifié au niveau module
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
 * Note: Pour CONSOLE_SUPPORT, utiliser canAccessSupportConsoleUI de AuthContext
 */
export function canAccessTile(
  role: GlobalRole | null,
  tileId: string,
  options?: { agence?: string | null; canAccessSupportConsoleUI?: boolean }
): boolean {
  const caps = getRoleCapabilities(role);
  
  // Tuiles spéciales
  switch (tileId) {
    case 'CONSOLE_SUPPORT':
      // Utiliser la valeur combinée si fournie, sinon fallback sur ROLE_MATRIX
      return options?.canAccessSupportConsoleUI ?? caps.canAccessSupportConsoleUI;
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
