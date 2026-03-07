/**
 * Global Roles System V2.0
 * 
 * Système simplifié de rôles hiérarchiques.
 * Chaque utilisateur possède UN SEUL rôle global.
 * Le niveau numérique permet les comparaisons d'autorité.
 */

// Échelle hiérarchique des rôles (du plus faible au plus fort)
export const GLOBAL_ROLES = {
  base_user: 0,        // N0 - Utilisateur de base (visiteur)
  franchisee_user: 1,  // N1 - Utilisateur franchisé (technicien, assistant)
  franchisee_admin: 2, // N2 - Admin franchisé (dirigeant agence)
  franchisor_user: 3,  // N3 - Utilisateur franchiseur (animateur réseau)
  franchisor_admin: 4, // N4 - Admin franchiseur (directeur réseau, DG)
  platform_admin: 5,   // N5 - Admin plateforme (support niveau 3)
  superadmin: 6,       // N6 - Super administrateur
} as const;

export type GlobalRole = keyof typeof GLOBAL_ROLES;
export type GlobalRoleLevel = typeof GLOBAL_ROLES[GlobalRole];

// Labels d'affichage pour l'UI
export const GLOBAL_ROLE_LABELS: Record<GlobalRole, string> = {
  base_user: 'Utilisateur de base',
  franchisee_user: 'Utilisateur agence',
  franchisee_admin: 'Administrateur agence',
  franchisor_user: 'Animateur réseau',
  franchisor_admin: 'Directeur réseau',
  platform_admin: 'Administrateur plateforme',
  superadmin: 'Super administrateur',
};

// Descriptions pour l'UI admin
export const GLOBAL_ROLE_DESCRIPTIONS: Record<GlobalRole, string> = {
  base_user: 'Accès minimal en lecture seule',
  franchisee_user: 'Accès standard aux guides et outils agence',
  franchisee_admin: 'Gestion complète de l\'agence + pilotage',
  franchisor_user: 'Visualisation des données réseau multi-agences',
  franchisor_admin: 'Gestion complète du réseau franchiseur',
  platform_admin: 'Administration de la plateforme + support avancé',
  superadmin: 'Accès total à toutes les fonctionnalités',
};

// Couleurs pour badges
export const GLOBAL_ROLE_COLORS: Record<GlobalRole, string> = {
  base_user: 'bg-gray-100 text-gray-800',
  franchisee_user: 'bg-blue-100 text-blue-800',
  franchisee_admin: 'bg-indigo-100 text-indigo-800',
  franchisor_user: 'bg-purple-100 text-purple-800',
  franchisor_admin: 'bg-pink-100 text-pink-800',
  platform_admin: 'bg-orange-100 text-orange-800',
  superadmin: 'bg-red-100 text-red-800',
};

/**
 * Vérifie si un rôle atteint un niveau minimum
 */
export function hasMinimumRole(userRole: GlobalRole | null, requiredRole: GlobalRole): boolean {
  if (!userRole) return false;
  return GLOBAL_ROLES[userRole] >= GLOBAL_ROLES[requiredRole];
}

/**
 * Obtient le niveau numérique d'un rôle
 */
export function getRoleLevel(role: GlobalRole | null): GlobalRoleLevel {
  if (!role) return 0;
  return GLOBAL_ROLES[role];
}

/**
 * Compare deux rôles
 */
export function compareRoles(roleA: GlobalRole | null, roleB: GlobalRole | null): number {
  const levelA = getRoleLevel(roleA);
  const levelB = getRoleLevel(roleB);
  return levelA - levelB;
}

/**
 * Obtient tous les rôles disponibles triés par niveau
 */
export function getAllRolesSorted(): GlobalRole[] {
  return Object.entries(GLOBAL_ROLES)
    .sort(([, a], [, b]) => a - b)
    .map(([role]) => role as GlobalRole);
}

/**
 * Obtient les rôles assignables par un utilisateur donné.
 * @deprecated Utiliser getUserManagementCapabilities() depuis permissionsEngine.ts
 * Exemple: getUserManagementCapabilities(role).canCreateRoles
 */
