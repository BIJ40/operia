import { 
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  MessageSquare, Network, Users, Database, Settings, LucideIcon,
  PieChart, Coins, Headphones, GraduationCap, Kanban, Activity,
  HelpCircle, Calendar, UserCog, Briefcase, Inbox, Building2, GitCompare,
  Wrench, Brain, Car, LineChart
} from 'lucide-react';
import { ROUTES } from './routes';
import { ModuleKey } from '@/types/modules';

export interface DashboardTile {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  scopeSlug: string;
  color: 'primary' | 'accent';
  group: 'guides' | 'pilotage' | 'rh' | 'support' | 'projects' | 'franchiseur' | 'admin' | 'communication' | 'technicien';
  requiresAdmin?: boolean;
  requiresFranchisor?: boolean; // N3+ (franchisor_user)
  requiresModule?: ModuleKey; // Requires specific module to be enabled
  requiresModuleOption?: string; // Requires specific module option (e.g., 'coffre' for rh_parc.coffre)
  requiresModuleOptions?: string[]; // OR logic - at least one option required
  featureFlagKey?: string; // Clé du feature flag global (ex: 'pilotage.actions-mener')
  badge?: string;
  isDisabled?: boolean; // Tuile grisée "Bientôt disponible"
}

export const DASHBOARD_TILES: DashboardTile[] = [
  // Guides (ex-Help Academy)
  {
    id: 'GUIDE_APOGEE',
    title: 'Guide Apogée',
    description: 'Guide complet pour maîtriser le logiciel Apogée',
    icon: BookOpen,
    route: ROUTES.academy.apogee,
    scopeSlug: 'apogee',
    color: 'primary',
    group: 'guides',
    requiresModule: 'guides',
  },
  {
    id: 'GUIDE_APPORTEURS',
    title: 'Guide Apporteurs',
    description: 'Ressources pour les apporteurs d\'affaires',
    icon: FileText,
    route: ROUTES.academy.apporteurs,
    scopeSlug: 'apporteurs',
    color: 'primary',
    group: 'guides',
    requiresModule: 'guides',
  },
  {
    id: 'BASE_DOCUMENTAIRE',
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    route: ROUTES.academy.documents,
    scopeSlug: SCOPE_SLUGS.BASE_DOCUMENTAIRE,
    color: 'primary',
    group: 'guides',
    requiresModule: 'guides',
  },
  // Pilotage Agence
  {
    id: 'STATISTIQUES_HUB',
    title: 'Statistiques',
    description: 'Accès aux indicateurs et KPI de votre agence',
    icon: PieChart,
    route: ROUTES.agency.statsHub,
    scopeSlug: SCOPE_SLUGS.MES_INDICATEURS,
    color: 'accent',
    group: 'pilotage',
    requiresModule: 'agence',
  },
  {
    id: 'ACTIONS_A_MENER',
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    route: ROUTES.agency.actions,
    scopeSlug: SCOPE_SLUGS.ACTIONS_A_MENER,
    color: 'accent',
    group: 'pilotage',
    requiresModule: 'agence',
    featureFlagKey: 'pilotage.actions-mener',
  },
  // HIDDEN: Veille Apporteurs - temporairement désactivé (voir /admin/hidden-features)
  {
    id: 'MAINTENANCE_PREVENTIVE',
    title: 'Parc Véhicules',
    description: 'Véhicules, matériel et EPI',
    icon: Car,
    route: ROUTES.rh.parc,
    scopeSlug: SCOPE_SLUGS.ACTIONS_A_MENER,
    color: 'accent',
    group: 'rh',
    requiresModule: 'rh',
  },
  {
    id: 'DIFFUSION',
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    route: ROUTES.agency.diffusion,
    scopeSlug: SCOPE_SLUGS.DIFFUSION,
    color: 'accent',
    group: 'pilotage',
    requiresModule: 'agence',
    featureFlagKey: 'pilotage.diffusion',
    badge: 'En cours',
  },
  {
    id: 'VALIDATION_PLANNINGS',
    title: 'Validation plannings',
    description: 'Validation des plannings hebdomadaires',
    icon: Calendar,
    route: ROUTES.agency.rhTech,
    scopeSlug: SCOPE_SLUGS.RH_TECH,
    color: 'accent',
    group: 'rh',
    requiresModule: 'rh',
    requiresModuleOptions: ['rh_viewer', 'rh_admin'],
    featureFlagKey: 'rh.validation-plannings',
    badge: 'Bientôt',
    isDisabled: true,
  },
  // Tuile MON_EQUIPE supprimée - remplacée par Suivi RH dans /rh/suivi
  // Tuiles MON_COFFRE_RH, DEMANDE_RH, DEMANDES_RH supprimées - portail salarié abandonné
  // Support
  {
    id: 'SUPPORT',
    title: 'Support',
    description: 'Chat IA et assistance en ligne',
    icon: HelpCircle,
    route: ROUTES.support.index,
    scopeSlug: SCOPE_SLUGS.MES_DEMANDES,
    color: 'primary',
    group: 'support',
  },
  // Tuile "Ouvrir un ticket" supprimée - redirige vers /support qui intègre déjà la création
  {
    id: 'CONSOLE_SUPPORT',
    title: 'Console support',
    description: 'Gestion des tickets et demandes utilisateurs',
    icon: Headphones,
    route: ROUTES.support.console,
    scopeSlug: SCOPE_SLUGS.APOGEE_TICKETS,
    color: 'accent',
    group: 'support',
    // F-NAV-1: requiresSupport supprimé - filtrage via canAccessSupportConsoleUI uniquement
  },
  // Gestion de Projet
  {
    id: 'PROJET_INDEX',
    title: 'Gestion de Projet',
    description: 'Kanban et suivi des tickets développement',
    icon: Kanban,
    route: ROUTES.projects.index,
    scopeSlug: SCOPE_SLUGS.APOGEE_TICKETS,
    color: 'accent',
    group: 'projects',
    requiresModule: 'ticketing',
  },
  // Espace Technicien
  {
    id: 'TECH_APP',
    title: 'APP',
    description: 'Interventions et relevés techniques',
    icon: Wrench,
    route: ROUTES.agency.techInterventions,
    scopeSlug: SCOPE_SLUGS.RH_TECH,
    color: 'accent',
    group: 'technicien',
    requiresModule: 'agence', // P2: Filtre module pour cacher aux N0 sans module
  },
  // Franchiseur
  {
    id: 'RESEAU_FRANCHISEUR',
    title: 'Dashboard Réseau',
    description: 'Pilotage multi-agences et KPIs réseau',
    icon: Network,
    route: ROUTES.reseau.dashboard,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_DASHBOARD,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_AGENCES',
    title: 'Agences',
    description: 'Gestion des agences du réseau',
    icon: Building2,
    route: ROUTES.reseau.agences,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_AGENCIES,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_USERS',
    title: 'Utilisateurs Réseau',
    description: 'Gestion des utilisateurs du réseau',
    icon: Users,
    route: ROUTES.reseau.users,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_AGENCIES,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_STATS',
    title: 'Statistiques Réseau',
    description: 'Matrices de performance multi-agences',
    icon: PieChart,
    route: ROUTES.reseau.tableaux,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_KPI,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_PERIODES',
    title: 'Périodes',
    description: 'Comparaison des performances entre agences',
    icon: GitCompare,
    route: ROUTES.reseau.periodes,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_KPI,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_COMPARATIF',
    title: 'Comparatif',
    description: 'Tableau comparatif KPI par agence',
    icon: BarChart3,
    route: ROUTES.reseau.comparatif,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_KPI,
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_ROYALTIES',
    title: 'Redevances',
    description: 'Calcul et suivi mensuel des redevances',
    icon: Coins,
    route: ROUTES.reseau.redevances,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_ROYALTIES,
    color: 'accent',
    group: 'franchiseur',
    badge: 'En cours',
  },
  // Administration
  {
    id: 'ADMIN_USERS',
    title: 'Utilisateurs',
    description: 'Gestion des comptes utilisateurs',
    icon: Users,
    route: ROUTES.admin.users,
    scopeSlug: SCOPE_SLUGS.ADMIN_USERS,
    color: 'primary',
    group: 'admin',
    requiresFranchisor: true, // N3+ can manage users
  },
  {
    id: 'ADMIN_ANNOUNCEMENTS',
    title: 'Annonces',
    description: 'Annonces prioritaires réseau',
    icon: MessageSquare,
    route: ROUTES.admin.announcements,
    scopeSlug: SCOPE_SLUGS.ADMIN_SETTINGS,
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'ADMIN_BACKUP',
    title: 'Sauvegarde',
    description: 'Import et export des données',
    icon: Database,
    route: ROUTES.admin.backup,
    scopeSlug: SCOPE_SLUGS.ADMIN_BACKUP,
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'ADMIN_SETTINGS',
    title: 'Paramètres',
    description: 'Configuration du système',
    icon: Settings,
    route: ROUTES.admin.index,
    scopeSlug: SCOPE_SLUGS.ADMIN_SETTINGS,
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'ADMIN_SYSTEM_HEALTH',
    title: 'Santé Système',
    description: 'Monitoring et état des services',
    icon: Activity,
    route: ROUTES.admin.systemHealth,
    scopeSlug: SCOPE_SLUGS.ADMIN_SETTINGS,
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'ADMIN_HELPI',
    title: 'Helpi',
    description: 'Moteur de connaissances IA unifié',
    icon: Brain,
    route: ROUTES.admin.helpi,
    scopeSlug: SCOPE_SLUGS.ADMIN_SETTINGS,
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'FRANCHISEUR_GRAPHIQUES',
    title: 'Graphiques',
    description: 'Visualisations graphiques du réseau',
    icon: LineChart,
    route: ROUTES.reseau.graphiques,
    scopeSlug: SCOPE_SLUGS.FRANCHISEUR_KPI,
    color: 'accent',
    group: 'franchiseur',
  },
];

export const DASHBOARD_GROUPS = {
  guides: {
    title: 'Help! Academy',
    icon: GraduationCap,
    colorClass: 'text-primary',
    indexUrl: ROUTES.academy.index,
  },
  pilotage: {
    title: 'Mon Agence',
    icon: Building2,
    colorClass: 'text-accent',
    indexUrl: ROUTES.agency.index,
  },
  rh: {
    title: 'Mon Espace RH',
    icon: Briefcase,
    colorClass: 'text-helpconfort-blue',
    indexUrl: ROUTES.rh.index,
  },
  support: {
    title: 'Support',
    icon: Headphones,
    colorClass: 'text-primary',
    indexUrl: ROUTES.support.index,
  },
  projects: {
    title: 'Gestion de Projet',
    icon: Kanban,
    colorClass: 'text-accent',
    indexUrl: ROUTES.projects.index,
  },
  franchiseur: {
    title: 'Espace Franchiseur',
    icon: Network,
    colorClass: 'text-accent',
    indexUrl: ROUTES.reseau.index,
  },
  admin: {
    title: 'Administration',
    icon: Settings,
    colorClass: 'text-destructive',
    indexUrl: ROUTES.admin.index,
  },
  technicien: {
    title: 'Espace Technicien',
    icon: Wrench,
    colorClass: 'text-helpconfort-orange',
    indexUrl: ROUTES.agency.techInterventions,
  },
} as const;
