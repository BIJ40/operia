/**
 * Query Keys centralisés pour assurer la synchronisation des données utilisateurs
 * à travers tous les points d'entrée de l'application.
 * 
 * Tous les hooks qui modifient des utilisateurs DOIVENT utiliser invalidateUserQueries()
 * pour garantir que les modifications sont visibles partout.
 */

export const USER_QUERY_KEYS = {
  // Listes d'utilisateurs
  management: ['user-management'] as const,
  accessRights: ['access-rights-users'] as const,
  adminUnified: ['admin-users-unified'] as const,
  agencyUsers: (agencySlug: string | null) => ['agency-users', agencySlug] as const,
  
  // Modules utilisateur
  modules: ['user-modules'] as const,
  
  // Profil individuel
  profile: (userId: string) => ['user-profile', userId] as const,
  
  // Agencies
  accessRightsAgencies: ['access-rights-agencies'] as const,
  agencies: ['agencies'] as const,
  adminAgencies: ['admin-agencies'] as const,
} as const;

/**
 * Invalide TOUTES les query keys liées aux utilisateurs.
 * À utiliser après toute mutation sur les utilisateurs (create, update, delete, modules).
 */
export function getInvalidateUserQueryKeys(): readonly (readonly string[] | readonly [string, string | null])[] {
  return [
    USER_QUERY_KEYS.management,
    USER_QUERY_KEYS.accessRights,
    USER_QUERY_KEYS.adminUnified,
    USER_QUERY_KEYS.modules,
    // Note: agency-users est paramétré, on invalide avec queryKey partiel
  ];
}

/**
 * Toutes les query keys à invalider pour synchronisation complète
 */
export const ALL_USER_QUERY_PATTERNS = [
  'user-management',
  'access-rights-users',
  'admin-users-unified',
  'user-modules',
  'agency-users',
  'user-profile',
] as const;
