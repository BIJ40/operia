/**
 * Registre central des routes de l'application
 * 
 * RÈGLE: Toutes les routes applicatives V2 doivent être définies ici.
 * Aucune route ne doit être hardcodée ailleurs dans le code.
 * 
 * Usage:
 * import { ROUTES } from '@/config/routes';
 * <Link to={ROUTES.support.userTickets}>...</Link>
 * navigate(ROUTES.pilotage.indicateurs);
 */

export const ROUTES = {
  // ============================================
  // HOME
  // ============================================
  home: '/',

  // ============================================
  // HELP ACADEMY
  // ============================================
  academy: {
    index: '/academy',
    // Guide Apogée
    apogee: '/academy/apogee',
    apogeeCategory: (slug: string) => `/academy/apogee/category/${slug}`,
    // Guide Apporteurs
    apporteurs: '/academy/apporteurs',
    apporteursCategory: (slug: string) => `/academy/apporteurs/category/${slug}`,
    apporteursSubCategory: (slug: string, subslug: string) => `/academy/apporteurs/category/${slug}/sub/${subslug}`,
  // Base Documentaire
    documents: '/academy/hc-base',
    documentsCategory: (slug: string) => `/academy/hc-base/category/${slug}`,
  },

  // ============================================
  // PILOTAGE AGENCE
  // ============================================
  pilotage: {
    index: '/hc-agency',
    // Indicateurs
    indicateurs: '/hc-agency/indicateurs',
    indicateursApporteurs: '/hc-agency/indicateurs/apporteurs',
    indicateursUnivers: '/hc-agency/indicateurs/univers',
    indicateursTechniciens: '/hc-agency/indicateurs/techniciens',
    indicateursSav: '/hc-agency/indicateurs/sav',
    // Actions à mener
    actions: '/hc-agency/actions',
    actionsCategory: (slug: string) => `/hc-agency/actions/category/${slug}`,
    // Diffusion
    diffusion: '/hc-agency/diffusion',
    // RH Tech
    rhTech: '/hc-agency/rh-tech',
    // Équipe
    equipe: '/hc-agency/equipe',
  },

  // ============================================
  // SUPPORT
  // ============================================
  support: {
    index: '/support',
    userTickets: '/support/mes-demandes',
    console: '/support/console',
  },

  // ============================================
  // RÉSEAU FRANCHISEUR
  // ============================================
  reseau: {
    index: '/hc-reseau',
    dashboard: '/hc-reseau/dashboard',
    agences: '/hc-reseau/agences',
    agenceProfile: (agencyId: string) => `/hc-reseau/agences/${agencyId}`,
    animateurs: '/hc-reseau/animateurs',
    stats: '/hc-reseau/stats',
    comparatifs: '/hc-reseau/comparatifs',
    redevances: '/hc-reseau/redevances',
  },

  // ============================================
  // ADMINISTRATION
  // ============================================
  admin: {
    index: '/admin',
    users: '/admin/users',
    agencies: '/admin/agencies',
    agencyProfile: (agencyId: string) => `/admin/agencies/${agencyId}`,
    collaborateurs: '/admin/collaborateurs',
    backup: '/admin/backup',
    userActivity: '/admin/user-activity',
    support: '/admin/support',
    escalationHistory: '/admin/escalation-history',
    pageMetadata: '/admin/page-metadata',
  },

  // ============================================
  // USER
  // ============================================
  profile: '/profile',
  favorites: '/favorites',

  // ============================================
  // LEGACY ROUTES (SUPPRIMÉES)
  // Ces routes ne sont plus actives dans App.tsx.
  // Elles sont documentées ici pour référence historique uniquement.
  // ============================================
  legacy: {
    apogee: '/apogee',
    apporteurs: '/apporteurs',
    helpconfort: '/helpconfort',
    mesIndicateurs: '/mes-indicateurs',
    actionsAMener: '/actions-a-mener',
    diffusion: '/diffusion',
    rhTech: '/rh-tech',
    mesDemandes: '/mes-demandes',
    tetDeReseau: '/tete-de-reseau',
  },
} as const;

// ============================================
// TYPE HELPERS
// ============================================

type StaticRoutes = 
  | typeof ROUTES['home']
  | typeof ROUTES['profile']
  | typeof ROUTES['favorites']
  | typeof ROUTES['academy']['index']
  | typeof ROUTES['academy']['apogee']
  | typeof ROUTES['academy']['apporteurs']
  | typeof ROUTES['academy']['documents']
  | typeof ROUTES['pilotage']['index']
  | typeof ROUTES['pilotage']['indicateurs']
  | typeof ROUTES['pilotage']['indicateursApporteurs']
  | typeof ROUTES['pilotage']['indicateursUnivers']
  | typeof ROUTES['pilotage']['indicateursTechniciens']
  | typeof ROUTES['pilotage']['indicateursSav']
  | typeof ROUTES['pilotage']['actions']
  | typeof ROUTES['pilotage']['diffusion']
  | typeof ROUTES['pilotage']['rhTech']
  | typeof ROUTES['support']['index']
  | typeof ROUTES['support']['userTickets']
  | typeof ROUTES['support']['console']
  | typeof ROUTES['reseau']['index']
  | typeof ROUTES['reseau']['dashboard']
  | typeof ROUTES['reseau']['agences']
  | typeof ROUTES['reseau']['animateurs']
  | typeof ROUTES['reseau']['stats']
  | typeof ROUTES['reseau']['comparatifs']
  | typeof ROUTES['reseau']['redevances']
  | typeof ROUTES['admin']['index']
  | typeof ROUTES['admin']['users']
  | typeof ROUTES['admin']['agencies']
  | typeof ROUTES['admin']['backup']
  | typeof ROUTES['admin']['userActivity']
  | typeof ROUTES['admin']['support']
  | typeof ROUTES['admin']['escalationHistory'];

export type RoutePath = StaticRoutes | string;

/**
 * Helper pour vérifier si une route est une route legacy
 */
export function isLegacyRoute(path: string): boolean {
  const legacyPaths = Object.values(ROUTES.legacy);
  return legacyPaths.some(legacyPath => path === legacyPath || path.startsWith(legacyPath + '/'));
}

/**
 * Mapper une route legacy vers la route V2 correspondante
 */
export function getLegacyRouteRedirect(path: string): string | null {
  const mappings: Record<string, string> = {
    [ROUTES.legacy.apogee]: ROUTES.academy.apogee,
    [ROUTES.legacy.apporteurs]: ROUTES.academy.apporteurs,
    [ROUTES.legacy.helpconfort]: ROUTES.academy.documents,
    [ROUTES.legacy.mesIndicateurs]: ROUTES.pilotage.indicateurs,
    [ROUTES.legacy.actionsAMener]: ROUTES.pilotage.actions,
    [ROUTES.legacy.diffusion]: ROUTES.pilotage.diffusion,
    [ROUTES.legacy.rhTech]: ROUTES.pilotage.rhTech,
    [ROUTES.legacy.mesDemandes]: ROUTES.support.userTickets,
    [ROUTES.legacy.tetDeReseau]: ROUTES.reseau.dashboard,
  };
  
  return mappings[path] || null;
}
