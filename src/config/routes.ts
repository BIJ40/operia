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
  // HOME / DASHBOARD (page d'accueil = dashboard)
  // ============================================
  home: '/',
  widgets: '/widgets',

  // ============================================
  // HELP ACADEMY
  // ============================================
  academy: {
    index: '/academy',
    favorites: '/academy/favoris',
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
  // MON AGENCE (hc-agency)
  // ============================================
  agency: {
    index: '/hc-agency',
    // Module RT Technicien
    techInterventions: '/hc-agency/tech-interventions',
    techRtRunner: (interventionId: string) => `/hc-agency/tech-interventions/rt/${interventionId}`,
    // Hub Statistiques
    statsHub: '/hc-agency/stats-hub',
    // Indicateurs (pages détaillées)
    indicateurs: '/hc-agency/indicateurs',
    indicateursApporteurs: '/hc-agency/indicateurs/apporteurs',
    indicateursUnivers: '/hc-agency/indicateurs/univers',
    indicateursTechniciens: '/hc-agency/indicateurs/techniciens',
    indicateursSav: '/hc-agency/indicateurs/sav',
    // Actions à mener
    actions: '/hc-agency/actions',
    actionsCategory: (slug: string) => `/hc-agency/actions/category/${slug}`,
    // Veille Apporteurs
    veilleApporteurs: '/hc-agency/veille-apporteurs',
    // Diffusion (sous statistiques)
    diffusion: '/hc-agency/statistiques/diffusion',
    // RH Tech
    rhTech: '/hc-agency/rh-tech',
    planningHebdo: '/hc-agency/rh-tech/planning',
    // Maintenance préventive
    maintenance: '/hc-agency/maintenance',
    // Commercial
    commercial: '/hc-agency/commercial',
    commercialPptx: '/hc-agency/commercial/support-pptx',
  },

  // ============================================
  // RH (Ressources Humaines) - Toutes les pages RH unifiées
  // ============================================
  rh: {
    index: '/rh',
    // Suivi RH (N2 back-office)
    suivi: '/rh/suivi',
    suiviCollaborateur: (id: string) => `/rh/suivi/${id}`,
    // Portail Salarié P1 (N1+)
    coffre: '/rh/coffre',
    demande: '/rh/demande',
    monPlanning: '/rh/mon-planning',
    monVehicule: '/rh/mon-vehicule',
    monMateriel: '/rh/mon-materiel',
    signature: '/rh/signature',
    // Vue Dirigeant/RH (N2)
    equipe: '/rh/equipe',
    plannings: '/rh/equipe/plannings',
    collaborateurProfile: (id: string) => `/rh/equipe/${id}`,
    demandes: '/rh/demandes',
    conges: '/rh/conges',
    dashboard: '/rh/dashboard',
    // Parc & Matériel
    parc: '/rh/parc',
    epi: '/rh/epi',
    // DocGen
    docgen: '/rh/docgen',
    docgenInstance: (instanceId: string) => `/rh/docgen/${instanceId}`,
  },

  // ============================================
  // SUPPORT V2
  // ============================================
  support: {
    index: '/support',                // SupportIndex.tsx - HUB page with Chat IA
    userTickets: '/support/mes-demandes', // UserTickets.tsx - Full ticket management
    console: '/support/console',      // AdminSupportTickets.tsx - SU Console (N1/N2/N5)
    faq: '/support/faq',
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
    animateurProfile: (animatorId: string) => `/hc-reseau/animateurs/${animatorId}`,
    users: '/hc-reseau/utilisateurs',
    tableaux: '/hc-reseau/tableaux',
    periodes: '/hc-reseau/periodes',
    comparatif: '/hc-reseau/comparatif',
    graphiques: '/hc-reseau/graphiques',
    redevances: '/hc-reseau/redevances',
  },

  // ============================================
  // GESTION DE PROJET (ex apogee-tickets)
  // ============================================
  projects: {
    index: '/projects',
    kanban: '/projects/kanban',
    list: '/projects/list',
    history: '/projects/historique',
    incomplete: '/projects/incomplets',
    review: '/projects/review',
    permissions: '/projects/permissions',
    duplicates: '/projects/doublons',
  },

  // ============================================
  // ADMINISTRATION
  // ============================================
  admin: {
    index: '/admin',
    supportTickets: '/admin/support-tickets',
    supportStats: '/admin/support-stats',
    users: '/admin/users',
    agencies: '/admin/agencies',
    agencyProfile: (agencyId: string) => `/admin/agencies/${agencyId}`,
    backup: '/admin/backup',
    cacheBackup: '/admin/cache-backup',
    helpconfortBackup: '/admin/helpconfort-backup',
    userActivity: '/admin/user-activity',
    escalationHistory: '/admin/escalation-history',
    documents: '/admin/documents',
    storageQuota: '/admin/storage-quota',
    pageMetadata: '/admin/page-metadata',
    apogeeGuides: '/admin/apogee-guides',
    helpi: '/admin/helpi',
    systemHealth: '/admin/system-health',
    announcements: '/admin/announcements',
    faq: '/admin/faq',
    featureFlags: '/admin/feature-flags',
    statia: '/admin/statia-by-bij',
    formationGenerator: '/admin/formation-generator',
    widgets: '/admin/widgets',
    modules: '/admin/modules',
    permissionsCenter: '/admin/permissions',
    // Legacy redirects (kept for backward compatibility)
    apogeeTickets: '/admin/apogee-tickets',
    apogeeTicketsIncomplete: '/admin/apogee-tickets/incomplets',
    apogeeTicketsReview: '/admin/apogee-tickets/review',
    apogeeTicketsPermissions: '/admin/apogee-tickets/permissions',
    rapportActivite: '/admin/rapportactivite',
  },

  // ============================================
  // REPORTS
  // ============================================
  reports: {
    monthly: '/reports/monthly',
  },

  // ============================================
  // MESSAGING
  // ============================================
  messages: '/messages',


  // ============================================
  // DEV (Admin only)
  // ============================================
  dev: {
    unifiedSearchAnimations: '/dev/unified-search-animations',
  },

  // ============================================
  // USER
  // ============================================
  profile: '/profile',
  favorites: '/favorites',
  changelog: '/changelog',

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
  | typeof ROUTES['agency']['index']
  | typeof ROUTES['agency']['statsHub']
  | typeof ROUTES['agency']['indicateurs']
  | typeof ROUTES['agency']['indicateursApporteurs']
  | typeof ROUTES['agency']['indicateursUnivers']
  | typeof ROUTES['agency']['indicateursTechniciens']
  | typeof ROUTES['agency']['indicateursSav']
  | typeof ROUTES['agency']['actions']
  | typeof ROUTES['agency']['diffusion']
  | typeof ROUTES['agency']['rhTech']
  | typeof ROUTES['support']['index']
  | typeof ROUTES['support']['userTickets']
  | typeof ROUTES['support']['console']
  | typeof ROUTES['reseau']['index']
  | typeof ROUTES['reseau']['dashboard']
  | typeof ROUTES['reseau']['agences']
  | typeof ROUTES['reseau']['animateurs']
  | typeof ROUTES['reseau']['tableaux']
  | typeof ROUTES['reseau']['periodes']
  | typeof ROUTES['reseau']['redevances']
  | typeof ROUTES['admin']['index']
  | typeof ROUTES['admin']['users']
  | typeof ROUTES['admin']['agencies']
  | typeof ROUTES['admin']['backup']
  | typeof ROUTES['admin']['userActivity']
  | typeof ROUTES['admin']['supportStats']
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
    [ROUTES.legacy.mesIndicateurs]: ROUTES.agency.indicateurs,
    [ROUTES.legacy.actionsAMener]: ROUTES.agency.actions,
    [ROUTES.legacy.diffusion]: ROUTES.agency.diffusion,
    [ROUTES.legacy.rhTech]: ROUTES.agency.rhTech,
    [ROUTES.legacy.mesDemandes]: ROUTES.support.userTickets,
    [ROUTES.legacy.tetDeReseau]: ROUTES.reseau.dashboard,
  };
  
  return mappings[path] || null;
}
