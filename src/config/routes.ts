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
    // Module RT Technicien
    techInterventions: '/hc-agency/tech-interventions',
    techRtRunner: (interventionId: string) => `/hc-agency/tech-interventions/rt/${interventionId}`,
    // Hub Statistiques (nouvelle page centrale)
    statsHub: '/hc-agency/statistiques',
    // Indicateurs (pages détaillées)
    indicateurs: '/hc-agency/indicateurs',
    indicateursApporteurs: '/hc-agency/indicateurs/apporteurs',
    indicateursUnivers: '/hc-agency/indicateurs/univers',
    indicateursTechniciens: '/hc-agency/indicateurs/techniciens',
    indicateursSav: '/hc-agency/indicateurs/sav',
    // Actions à mener
    actions: '/hc-agency/actions',
    actionsCategory: (slug: string) => `/hc-agency/actions/category/${slug}`,
    // Diffusion (sous statistiques)
    diffusion: '/hc-agency/statistiques/diffusion',
    // RH Tech
    rhTech: '/hc-agency/rh-tech',
    // Équipe (legacy - redirects to collaborateurs)
    equipe: '/hc-agency/equipe',
    // Collaborateurs (Module RH & Parc - Phase 1)
    collaborateurs: '/hc-agency/collaborateurs',
    collaborateurProfile: (id: string) => `/hc-agency/collaborateurs/${id}`,
    // Coffre-fort RH (vue salarié)
    monCoffreRh: '/pilotage/mon-coffre-rh',
    // Faire une demande RH (vue salarié)
    faireUneDemande: '/faire-une-demande',
    // Demandes RH (vue agence - Dirigeant/RH)
    demandesRh: '/hc-agency/demandes-rh',
    // Gestion des congés (vue agence - N2)
    gestionConges: '/hc-agency/gestion-conges',
    // Dashboard RH (statistiques RH - Dirigeant/RH)
    dashboardRh: '/hc-agency/dashboard-rh',
    // StatIA Builder (N2+)
    statiaBuilder: '/hc-agency/statia-builder',
  },

  // ============================================
  // SUPPORT V2
  // ============================================
  support: {
    index: '/support',                // SupportIndex.tsx - HUB page
    helpcenter: '/support/helpcenter', // SupportUser.tsx - 3 columns (FAQ | Chat | Demands)
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
    import: '/projects/import',
    importPriorities: '/projects/import-priorities',
    importEvaluated: '/projects/import-evaluated',
    importBugs: '/projects/import-bugs',
    importV1: '/projects/import-v1',
    importTraite: '/projects/import-traite',
    importDysfonctionnements: '/projects/import-dysfonctionnements',
    incomplete: '/projects/incomplets',
    classify: '/projects/classifier',
    review: '/projects/review',
    permissions: '/projects/permissions',
    duplicates: '/projects/doublons',
    autoClassify: '/projects/auto-classify',
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
    chatbotRag: '/admin/chatbot-rag',
    systemHealth: '/admin/system-health',
    announcements: '/admin/announcements',
    statia: '/admin/statia-by-bij',
    // Legacy redirects (kept for backward compatibility)
    apogeeTickets: '/admin/apogee-tickets',
    apogeeTicketsImport: '/admin/apogee-tickets/import',
    apogeeTicketsImportPriorities: '/admin/apogee-tickets/import-priorities',
    apogeeTicketsImportEvaluated: '/admin/apogee-tickets/import-evaluated',
    apogeeTicketsImportTraite: '/projects/import-traite',
    apogeeTicketsImportBugs: '/admin/apogee-tickets/import-bugs',
    apogeeTicketsImportV1: '/admin/apogee-tickets/import-v1',
    apogeeTicketsIncomplete: '/admin/apogee-tickets/incomplets',
    apogeeTicketsClassify: '/admin/apogee-tickets/classifier',
    apogeeTicketsReview: '/admin/apogee-tickets/review',
    apogeeTicketsPermissions: '/admin/apogee-tickets/permissions',
  },

  // ============================================
  // MESSAGING
  // ============================================
  messages: '/messages',

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
  | typeof ROUTES['pilotage']['index']
  | typeof ROUTES['pilotage']['statsHub']
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
    [ROUTES.legacy.mesIndicateurs]: ROUTES.pilotage.indicateurs,
    [ROUTES.legacy.actionsAMener]: ROUTES.pilotage.actions,
    [ROUTES.legacy.diffusion]: ROUTES.pilotage.diffusion,
    [ROUTES.legacy.rhTech]: ROUTES.pilotage.rhTech,
    [ROUTES.legacy.mesDemandes]: ROUTES.support.userTickets,
    [ROUTES.legacy.tetDeReseau]: ROUTES.reseau.dashboard,
  };
  
  return mappings[path] || null;
}
