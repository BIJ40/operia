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
    // Guide HC Services (ex-OPERIA)
    hcServices: '/academy/hc-services',
    hcServicesCategory: (slug: string) => `/academy/hc-services/category/${slug}`,
    // Legacy OPERIA (redirect)
    operia: '/academy/hc-services',
    operiaCategory: (slug: string) => `/academy/hc-services/category/${slug}`,
    // Base Documentaire
    documents: '/academy/hc-base',
    documentsCategory: (slug: string) => `/academy/hc-base/category/${slug}`,
  },

  // ============================================
  // MON AGENCE (/agency - ex /hc-agency)
  // ============================================
  agency: {
    index: '/agency',
    // Module RT Technicien
    techInterventions: '/agency/tech-interventions',
    techRtRunner: (interventionId: string) => `/agency/tech-interventions/rt/${interventionId}`,
    // Hub Statistiques
    statsHub: '/agency/stats-hub',
    // Mes Apporteurs
    mesApporteurs: '/agency/apporteurs',
    // Indicateurs (pages détaillées)
    indicateurs: '/agency/indicateurs',
    indicateursApporteurs: '/agency/indicateurs/apporteurs',
    indicateursUnivers: '/agency/indicateurs/univers',
    indicateursTechniciens: '/agency/indicateurs/techniciens',
    indicateursSav: '/agency/indicateurs/sav',
    // Actions à mener
    actions: '/agency/actions',
    actionsCategory: (slug: string) => `/agency/actions/category/${slug}`,
    // Veille Apporteurs
    veilleApporteurs: '/agency/veille-apporteurs',
    // Diffusion
    diffusion: '/agency/diffusion',
    // RH Tech
    rhTech: '/agency/rh-tech',
    planningHebdo: '/agency/rh-tech/planning',
    // Maintenance préventive
    maintenance: '/agency/maintenance',
    // Commercial
    commercial: '/agency/commercial',
    commercialPptx: '/agency/commercial/support-pptx',
    // Carte RDV
    map: '/agency/carte',
  },

  // ============================================
  // RH (Ressources Humaines) - Back-office N2 uniquement
  // NOTE: Portail salarié N1 supprimé
  // ============================================
  rh: {
    index: '/rh',
    // Suivi RH (N2 back-office)
    suivi: '/rh/suivi',
    suiviCollaborateur: (id: string) => `/rh/suivi/${id}`,
    // Vue Dirigeant/RH (N2)
    plannings: '/rh/suivi/plannings',
    collaborateurProfile: (id: string) => `/rh/suivi/${id}`,
    // Parc & Matériel
    parc: '/rh/parc',
    // epi: supprimé - intégré dans parc
    // DocGen
    docgen: '/rh/docgen',
    docgenInstance: (instanceId: string) => `/rh/docgen/${instanceId}`,
    // Réunions
    reunions: '/rh/reunions',
  },

  // ============================================
  // SUPPORT V2
  // ============================================
  support: {
    index: '/support',                // Redirects to /?tab=support
    userTickets: '/support/mes-demandes', // UserTickets.tsx - Full ticket management
    
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
  },

  // ============================================
  // ADMINISTRATION
  // ============================================
  admin: {
    index: '/admin',
    /** @deprecated Legacy route — redirects to /?tab=ticketing */
    users: '/admin/users',
    agencies: '/admin/agencies',
    agencyProfile: (agencyId: string) => `/admin/agencies/${agencyId}`,
    backup: '/admin/backup',
    cacheBackup: '/admin/cache-backup',
    helpconfortBackup: '/admin/helpconfort-backup',
    userActivity: '/admin/user-activity',
    
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
  // DEV (Admin only)
  // ============================================
  dev: {
    unifiedSearchAnimations: '/dev/unified-search-animations',
  },

  // ============================================
  // USER
  // ============================================
  profile: '/profile',
  agence: '/agence',
  changelog: '/changelog',

} as const;

// ============================================
// TYPE HELPERS
// ============================================

type StaticRoutes = 
  | typeof ROUTES['home']
  | typeof ROUTES['profile']
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
  
  | typeof ROUTES['reseau']['index']
  | typeof ROUTES['reseau']['dashboard']
  | typeof ROUTES['reseau']['agences']
  
  | typeof ROUTES['reseau']['tableaux']
  | typeof ROUTES['reseau']['periodes']
  | typeof ROUTES['reseau']['redevances']
  | typeof ROUTES['admin']['index']
  | typeof ROUTES['admin']['users']
  | typeof ROUTES['admin']['agencies']
  | typeof ROUTES['admin']['backup']
  | typeof ROUTES['admin']['userActivity']
  | typeof ROUTES['admin']['userActivity'];

export type RoutePath = StaticRoutes | string;
