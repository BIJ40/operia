import type { GlobalRole } from '@/types/globalRoles';
import type { ModuleKey } from '@/types/modules';
import type { PlanKey } from '@/config/planTiers';

export type GuardType = 'RoleGuard' | 'ModuleGuard' | 'FaqAdminGuard' | 'ApporteurGuard' | 'SupportConsoleGuard';

export interface RouteGuards {
  roleGuard?: { minRole: GlobalRole };
  moduleGuard?: { moduleKey: ModuleKey; requiredOption?: string; requiredOptions?: string[] };
  specialGuard?: 'FaqAdminGuard' | 'ApporteurGuard' | 'SupportConsoleGuard';
}

export interface RouteMetadata {
  path: string;
  label: string;
  component: string;
  section: SitemapSection;
  guards: RouteGuards;
  /** Plan agence minimum requis (STARTER, PRO, etc.) */
  planRequired?: PlanKey;
  isRedirect?: boolean;
  redirectTo?: string;
  isDynamic?: boolean;
  children?: RouteMetadata[];
}

export type SitemapSection = 
  | 'core' 
  | 'academy' 
  | 'pilotage' 
  | 'rh' 
  | 'support' 
  | 'reseau' 
  | 'projects' 
  | 'admin' 
  | 'apporteur' 
  | 'dev' 
  | 'public';

export const SECTION_LABELS: Record<SitemapSection, string> = {
  core: 'Core',
  academy: 'Help Academy',
  pilotage: 'Pilotage Agence',
  rh: 'Ressources Humaines',
  support: 'Support',
  reseau: 'Réseau Franchiseur',
  projects: 'Gestion de Projet',
  admin: 'Administration',
  apporteur: 'Portail Apporteur',
  dev: 'Développement',
  public: 'Pages Publiques',
};

export const SECTION_ICONS: Record<SitemapSection, string> = {
  core: 'Home',
  academy: 'GraduationCap',
  pilotage: 'BarChart3',
  rh: 'Users',
  support: 'LifeBuoy',
  reseau: 'Network',
  projects: 'FolderKanban',
  admin: 'Settings',
  apporteur: 'Building2',
  dev: 'Code',
  public: 'Globe',
};

// Complete sitemap data extracted from all route files
export const SITEMAP_ROUTES: RouteMetadata[] = [
  // ==================== CORE ====================
  {
    path: '/',
    label: 'Dashboard',
    component: 'Index',
    section: 'core',
    guards: { roleGuard: { minRole: 'base_user' } },
  },
  {
    path: '/profile',
    label: 'Profil utilisateur',
    component: 'Profile',
    section: 'core',
    guards: { roleGuard: { minRole: 'base_user' } },
  },
  {
    path: '/changelog',
    label: 'Changelog',
    component: 'Changelog',
    section: 'public',
    guards: {},
  },
  {
    path: '/roadmap',
    label: 'Roadmap',
    component: 'Roadmap',
    section: 'public',
    guards: {},
  },
  {
    path: '/qr/:token',
    label: 'QR Code Handler',
    component: 'QRCodeHandler',
    section: 'public',
    guards: {},
    isDynamic: true,
  },

  // ==================== ACADEMY ====================
  {
    path: '/academy',
    label: 'Academy Index',
    component: 'AcademyIndex',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
  },
  {
    path: '/academy/apogee',
    label: 'Guide Apogée',
    component: 'ApogeeGuide',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
  },
  {
    path: '/academy/apogee/category/:slug',
    label: 'Catégorie Apogée',
    component: 'Category',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
    isDynamic: true,
  },
  {
    path: '/academy/apporteurs',
    label: 'Guide Apporteurs',
    component: 'ApporteurGuide',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
  },
  {
    path: '/academy/apporteurs/category/:slug',
    label: 'Catégorie Apporteurs',
    component: 'ApporteurSubcategories',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
    isDynamic: true,
  },
  {
    path: '/academy/apporteurs/category/:slug/sub/:subslug',
    label: 'Sous-catégorie Apporteurs',
    component: 'CategoryApporteur',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'support.guides' },
    },
    isDynamic: true,
  },
  {
    path: '/academy/hc-services',
    label: 'Guide HC Services',
    component: 'HcServicesGuide',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'guides' },
    },
  },
  {
    path: '/academy/hc-services/category/:slug',
    label: 'Catégorie HC Services',
    component: 'CategoryHcServices',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'guides' },
    },
    isDynamic: true,
  },
  // Legacy OPERIA redirects
  {
    path: '/academy/operia',
    label: 'Redirect to HC Services',
    component: 'Navigate',
    section: 'academy',
    guards: {},
    isRedirect: true,
    redirectTo: '/academy/hc-services',
  },
  {
    path: '/academy/operia/category/:slug',
    label: 'Redirect OPERIA Category',
    component: 'Navigate',
    section: 'academy',
    guards: {},
    isRedirect: true,
    redirectTo: '/academy/hc-services',
    isDynamic: true,
  },
  {
    path: '/academy/hc-base',
    label: 'Base Documentaire',
    component: 'HelpConfort',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'guides' },
    },
  },
  {
    path: '/academy/hc-base/category/:slug',
    label: 'Catégorie Base Doc',
    component: 'CategoryHelpConfort',
    section: 'academy',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'guides' },
    },
    isDynamic: true,
  },

  // ==================== PILOTAGE ====================
  {
    path: '/agency',
    label: 'Pilotage Index',
    component: 'PilotageIndex',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'agence' },
    },
  },
  {
    path: '/agency/stats-hub',
    label: 'Hub Statistiques',
    component: 'StatsHub',
    section: 'pilotage',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'stats', requiredOption: 'stats_hub' },
    },
  },
  {
    path: '/agency/indicateurs',
    label: 'Indicateurs',
    component: 'IndicateursLayout',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'indicateurs' },
    },
  },
  {
    path: '/agency/veille-apporteurs',
    label: 'Veille Apporteurs',
    component: 'VeilleApporteursPage',
    section: 'pilotage',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'veille_apporteurs' },
    },
  },
  {
    path: '/agency/actions',
    label: 'Actions à Mener',
    component: 'ActionsAMener',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'actions_a_mener' },
    },
  },
  {
    path: '/agency/actions/category/:slug',
    label: 'Catégorie Actions',
    component: 'CategoryActionsAMener',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'actions_a_mener' },
    },
    isDynamic: true,
  },
  {
    path: '/agency/diffusion',
    label: 'Dashboard Diffusion',
    component: 'DiffusionDashboard',
    section: 'pilotage',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'diffusion' },
    },
  },
  {
    path: '/agency/rh-tech',
    label: 'RH Tech',
    component: 'RHTech',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence' },
    },
  },
  {
    path: '/agency/rh-tech/planning',
    label: 'Planning Hebdo',
    component: 'PlanningHebdo',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence' },
    },
  },
  {
    path: '/agency/apporteurs',
    label: 'Mes Apporteurs',
    component: 'MesApporteursPage',
    section: 'pilotage',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'mes_apporteurs' },
    },
  },
  {
    path: '/agency/carte',
    label: 'Carte des RDV',
    component: 'RdvMapPage',
    section: 'pilotage',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence', requiredOption: 'carte_rdv' },
    },
  },
  {
    path: '/agency/commercial',
    label: 'Commercial',
    component: 'CommercialPage',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence' },
    },
  },
  {
    path: '/agency/commercial/support-pptx',
    label: 'Support Commercial PPTX',
    component: 'CommercialSupportPptx',
    section: 'pilotage',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'agence' },
    },
  },
  // Legacy /hc-agency redirect
  {
    path: '/hc-agency',
    label: 'Redirect to /agency',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency',
  },
  // Pilotage Redirects
  {
    path: '/agency/statistiques',
    label: 'Redirect Statistiques',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency/indicateurs',
  },
  {
    path: '/agency/indicateurs/apporteurs',
    label: 'Redirect Indicateurs Apporteurs',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency/stats-hub',
  },
  {
    path: '/agency/indicateurs/univers',
    label: 'Redirect Indicateurs Univers',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency/stats-hub',
  },
  {
    path: '/agency/indicateurs/techniciens',
    label: 'Redirect Indicateurs Tech',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency/stats-hub',
  },
  {
    path: '/agency/indicateurs/sav',
    label: 'Redirect Indicateurs SAV',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/agency/stats-hub',
  },
  {
    path: '/agency/statia-builder',
    label: 'Redirect STATiA',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/admin/statia-by-bij',
  },
  {
    path: '/agency/maintenance',
    label: 'Redirect Maintenance',
    component: 'Navigate',
    section: 'pilotage',
    guards: {},
    isRedirect: true,
    redirectTo: '/rh/parc',
  },

  // ==================== RH ====================
  {
    path: '/rh',
    label: 'RH Index',
    component: 'RHIndex',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  {
    path: '/rh/suivi',
    label: 'Suivi Collaborateurs',
    component: 'RHSuiviIndex',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh', requiredOptions: ['rh_viewer', 'rh_admin'] },
    },
  },
  {
    path: '/rh/suivi/:id',
    label: 'Fiche Collaborateur',
    component: 'RHCollaborateurPage',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh', requiredOptions: ['rh_viewer', 'rh_admin'] },
    },
    isDynamic: true,
  },
  {
    path: '/rh/suivi/plannings',
    label: 'Plannings Techniciens',
    component: 'PlanningTechniciensSemaine',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  // Legacy N1 routes supprimées (heures, timesheets) - portail salarié N1 désactivé v0.8.3
  {
    path: '/rh/parc',
    label: 'Maintenance Préventive',
    component: 'MaintenancePreventivePage',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  {
    path: '/rh/epi',
    label: 'Gestion EPI',
    component: 'EPIPage',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  {
    path: '/rh/docgen',
    label: 'Génération Documents',
    component: 'DocGenPage',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  {
    path: '/rh/reunions',
    label: 'Réunions RH',
    component: 'RHMeetingsPage',
    section: 'rh',
    planRequired: 'PRO',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'rh' },
    },
  },
  // RH Redirects
  {
    path: '/rh/equipe',
    label: 'Redirect Équipe',
    component: 'Navigate',
    section: 'rh',
    guards: {},
    isRedirect: true,
    redirectTo: '/rh/suivi',
  },
  // Legacy N1 redirects supprimés - portail salarié N1 désactivé (v0.8.3)

  // ==================== SUPPORT ====================
  {
    path: '/support',
    label: 'Support Hub',
    component: 'SupportHub',
    section: 'support',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'support.aide_en_ligne' },
    },
  },
  {
    path: '/support/helpcenter',
    label: 'HelpCenter',
    component: 'HelpCenter',
    section: 'support',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'support.aide_en_ligne' },
    },
  },
  {
    path: '/support/mes-demandes',
    label: 'Mes Demandes',
    component: 'MesDemandesSupport',
    section: 'support',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'support.aide_en_ligne' },
    },
  },
  {
    path: '/support/console',
    label: 'Console Support',
    component: 'SupportConsolePage',
    section: 'support',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      specialGuard: 'SupportConsoleGuard',
    },
  },

  // ==================== RESEAU FRANCHISEUR ====================
  {
    path: '/hc-reseau',
    label: 'Réseau Index',
    component: 'ReseauIndex',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/dashboard',
    label: 'Dashboard Réseau',
    component: 'FranchiseurHome',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/agences',
    label: 'Agences',
    component: 'FranchiseurAgencies',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/agences/:agencyId',
    label: 'Profil Agence',
    component: 'FranchiseurAgencyProfile',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
    isDynamic: true,
  },
  {
    path: '/hc-reseau/animateurs',
    label: 'Animateurs',
    component: 'FranchiseurAnimateurs',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/animateurs/:animatorId',
    label: 'Profil Animateur',
    component: 'AnimatorProfile',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
    isDynamic: true,
  },
  {
    path: '/hc-reseau/tableaux',
    label: 'Tableaux Stats',
    component: 'FranchiseurStats',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/periodes',
    label: 'Comparaison Périodes',
    component: 'FranchiseurComparison',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/comparatif',
    label: 'Comparatif Agences',
    component: 'ComparatifAgencesPage',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/graphiques',
    label: 'Graphiques Réseau',
    component: 'ReseauGraphiquesPage',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/redevances',
    label: 'Redevances',
    component: 'FranchiseurRoyalties',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_admin' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },
  {
    path: '/hc-reseau/utilisateurs',
    label: 'Utilisateurs TDR',
    component: 'TDRUsersPage',
    section: 'reseau',
    guards: {
      roleGuard: { minRole: 'franchisor_user' },
      moduleGuard: { moduleKey: 'reseau_franchiseur' },
    },
  },

  // ==================== PROJECTS ====================
  {
    path: '/projects',
    label: 'Projects Index',
    component: 'ProjectsIndex',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/kanban',
    label: 'Kanban Tickets',
    component: 'ApogeeTicketsKanban',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/historique',
    label: 'Historique Tickets',
    component: 'ApogeeTicketsHistory',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/list',
    label: 'Liste Tickets',
    component: 'ApogeeTicketsList',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/incompletes',
    label: 'Tickets Incomplets',
    component: 'ApogeeTicketsIncomplete',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/review',
    label: 'Review Tickets',
    component: 'ApogeeTicketsReview',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'base_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  {
    path: '/projects/permissions',
    label: 'Permissions Tickets',
    component: 'ApogeeTicketsAdmin',
    section: 'projects',
    guards: {
      roleGuard: { minRole: 'franchisee_user' },
      moduleGuard: { moduleKey: 'ticketing' },
    },
  },
  // Duplicate scan feature removed v0.8.3

  // ==================== ADMIN ====================
  {
    path: '/admin',
    label: 'Admin Index',
    component: 'AdminIndex',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/sitemap',
    label: 'Sitemap Routes',
    component: 'AdminSitemap',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/gestion',
    label: 'Gestion Unifiée',
    component: 'UnifiedManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
    },
  },
  {
    path: '/admin/modules',
    label: 'Gestion Modules',
    component: 'ModulesManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/flow',
    label: 'Flow Builder',
    component: 'FlowBuilder',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'franchisor_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/templates',
    label: 'Templates',
    component: 'TemplateManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/apporteurs',
    label: 'Admin Apporteurs',
    component: 'ApporteurManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'franchisee_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/apporteurs/orgs',
    label: 'Organisations Apporteurs',
    component: 'ApporteurOrganizationsAdmin',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/rapportactivite',
    label: 'Rapport Activité',
    component: 'RapportActiviteBuilder',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'franchisor_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/faq',
    label: 'Admin FAQ',
    component: 'AdminFaq',
    section: 'admin',
    guards: {
      specialGuard: 'FaqAdminGuard',
    },
  },
  {
    path: '/admin/support',
    label: 'Admin Support',
    component: 'AdminSupport',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/priorities',
    label: 'Gestion Annonces',
    component: 'PriorityManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/statia-by-bij',
    label: 'STATiA Builder',
    component: 'StatiaBuilder',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/apogee-ticket',
    label: 'Admin Apogée Tickets',
    component: 'ApogeeTicketsAdmin',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/monitoring',
    label: 'Monitoring',
    component: 'SystemHealth',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/backup',
    label: 'Backup Manager',
    component: 'BackupManager',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'superadmin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/feature-flags',
    label: 'Feature Flags',
    component: 'FeatureFlagsAdmin',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/agencies/:agencyId',
    label: 'Profil Agence Admin',
    component: 'FranchiseurAgencyProfile',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
    isDynamic: true,
  },
  {
    path: '/admin/docgen',
    label: 'DocGen Templates',
    component: 'DocGenManagement',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
  },
  {
    path: '/admin/docgen/:instanceId',
    label: 'Instance DocGen',
    component: 'DocGenInstancePage',
    section: 'admin',
    guards: {
      roleGuard: { minRole: 'platform_admin' },
      moduleGuard: { moduleKey: 'admin_plateforme' },
    },
    isDynamic: true,
  },
  // Admin Redirects
  {
    path: '/admin/documents',
    label: 'Redirect Documents',
    component: 'Navigate',
    section: 'admin',
    guards: {},
    isRedirect: true,
    redirectTo: '/admin/templates',
  },
  {
    path: '/admin/chatbot',
    label: 'Redirect Chatbot',
    component: 'Navigate',
    section: 'admin',
    guards: {},
    isRedirect: true,
    redirectTo: '/admin/faq',
  },
  {
    path: '/admin/apogee-tickets',
    label: 'Redirect Apogée Tickets',
    component: 'Navigate',
    section: 'admin',
    guards: {},
    isRedirect: true,
    redirectTo: '/projects/kanban',
  },
  {
    path: '/admin/permissions',
    label: 'Redirect Permissions',
    component: 'Navigate',
    section: 'admin',
    guards: {},
    isRedirect: true,
    redirectTo: '/admin/gestion',
  },

  // ==================== APPORTEUR PORTAL ====================
  {
    path: '/espace-apporteur',
    label: 'Portail Apporteur',
    component: 'ApporteurLayout',
    section: 'apporteur',
    guards: {
      specialGuard: 'ApporteurGuard',
    },
  },
  {
    path: '/espace-apporteur/dossiers',
    label: 'Dossiers Apporteur',
    component: 'ApporteurDossiers',
    section: 'apporteur',
    guards: {
      specialGuard: 'ApporteurGuard',
    },
  },
  {
    path: '/espace-apporteur/demandes',
    label: 'Demandes Apporteur',
    component: 'ApporteurDemandes',
    section: 'apporteur',
    guards: {
      specialGuard: 'ApporteurGuard',
    },
  },
  {
    path: '/espace-apporteur/guide',
    label: 'Guide Apporteur',
    component: 'ApporteurGuidePortal',
    section: 'apporteur',
    guards: {
      specialGuard: 'ApporteurGuard',
    },
  },
  {
    path: '/espace-apporteur/parametres',
    label: 'Paramètres Apporteur',
    component: 'ApporteurSettings',
    section: 'apporteur',
    guards: {
      specialGuard: 'ApporteurGuard',
    },
  },

  // ==================== DEV ====================
  {
    path: '/dev/components',
    label: 'Components Showcase',
    component: 'ComponentsShowcase',
    section: 'dev',
    guards: {
      roleGuard: { minRole: 'superadmin' },
    },
  },
];

// Helper functions
export function getRoutesBySection(section: SitemapSection): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.section === section);
}

export function getActiveRoutes(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => !route.isRedirect);
}

export function getRedirectRoutes(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.isRedirect);
}

export function getDynamicRoutes(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.isDynamic);
}

export function getRoutesWithRoleGuard(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.guards.roleGuard);
}

export function getRoutesWithModuleGuard(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.guards.moduleGuard);
}

export function getRoutesWithSpecialGuard(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.guards.specialGuard);
}

export function getPublicRoutes(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => 
    !route.guards.roleGuard && 
    !route.guards.moduleGuard && 
    !route.guards.specialGuard &&
    !route.isRedirect
  );
}

export function getAllSections(): SitemapSection[] {
  return [...new Set(SITEMAP_ROUTES.map(route => route.section))];
}

export function getAllModulesUsed(): string[] {
  const modules = new Set<string>();
  SITEMAP_ROUTES.forEach(route => {
    if (route.guards.moduleGuard?.moduleKey) {
      modules.add(route.guards.moduleGuard.moduleKey);
    }
  });
  return [...modules];
}

export function getSitemapStats() {
  return {
    totalRoutes: SITEMAP_ROUTES.length,
    activeRoutes: getActiveRoutes().length,
    redirectRoutes: getRedirectRoutes().length,
    dynamicRoutes: getDynamicRoutes().length,
    routesWithRoleGuard: getRoutesWithRoleGuard().length,
    routesWithModuleGuard: getRoutesWithModuleGuard().length,
    routesWithSpecialGuard: getRoutesWithSpecialGuard().length,
    routesWithPlanRequired: getRoutesWithPlanRequired().length,
    publicRoutes: getPublicRoutes().length,
    modulesUsed: getAllModulesUsed().length,
    sections: getAllSections().length,
  };
}

/**
 * Retourne les routes nécessitant un plan agence spécifique
 */
export function getRoutesWithPlanRequired(): RouteMetadata[] {
  return SITEMAP_ROUTES.filter(route => route.planRequired);
}

/**
 * Retourne les plans utilisés dans les routes
 */
export function getAllPlansUsed(): string[] {
  const plans = new Set<string>();
  SITEMAP_ROUTES.forEach(route => {
    if (route.planRequired) {
      plans.add(route.planRequired);
    }
  });
  return [...plans];
}
