import { 
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  MessageSquare, Network, Users, Database, Settings, LucideIcon,
  PieChart, Coins, LifeBuoy, Headphones, GraduationCap, Kanban, Activity,
  HelpCircle, Calendar, UserCog
} from 'lucide-react';
import { ROUTES } from './routes';
import { ModuleKey } from '@/types/modules';
import { SCOPE_SLUGS } from './scopeRegistry';

export interface DashboardTile {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  scopeSlug: string;
  color: 'primary' | 'accent';
  group: 'help_academy' | 'pilotage' | 'support' | 'projects' | 'franchiseur' | 'admin';
  requiresAdmin?: boolean;
  requiresSupport?: boolean;
  requiresFranchisor?: boolean; // N3+ (franchisor_user)
  requiresModule?: ModuleKey; // Requires specific module to be enabled
  badge?: string;
}

export const DASHBOARD_TILES: DashboardTile[] = [
  // Help Academy
  {
    id: 'GUIDE_APOGEE',
    title: 'Guide Apogée',
    description: 'Guide complet pour maîtriser le logiciel Apogée',
    icon: BookOpen,
    route: ROUTES.academy.apogee,
    scopeSlug: SCOPE_SLUGS.APOGEE,
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'GUIDE_APPORTEURS',
    title: 'Guide Apporteurs',
    description: 'Ressources pour les apporteurs d\'affaires',
    icon: FileText,
    route: ROUTES.academy.apporteurs,
    scopeSlug: SCOPE_SLUGS.APPORTEURS,
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'BASE_DOCUMENTAIRE',
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    route: ROUTES.academy.documents,
    scopeSlug: SCOPE_SLUGS.BASE_DOCUMENTAIRE,
    color: 'primary',
    group: 'help_academy',
  },
  // Pilotage Agence
  {
    id: 'STATISTIQUES_HUB',
    title: 'Statistiques',
    description: 'Accès aux indicateurs et KPI de votre agence',
    icon: PieChart,
    route: ROUTES.pilotage.statsHub,
    scopeSlug: SCOPE_SLUGS.MES_INDICATEURS,
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'ACTIONS_A_MENER',
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    route: ROUTES.pilotage.actions,
    scopeSlug: SCOPE_SLUGS.ACTIONS_A_MENER,
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'DIFFUSION',
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    route: ROUTES.pilotage.diffusion,
    scopeSlug: SCOPE_SLUGS.DIFFUSION,
    color: 'accent',
    group: 'pilotage',
    badge: 'En cours',
  },
  {
    id: 'RH_TECH',
    title: 'RH Tech',
    description: 'Planning hebdomadaire techniciens',
    icon: Calendar,
    route: ROUTES.pilotage.rhTech,
    scopeSlug: SCOPE_SLUGS.RH_TECH,
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'MON_EQUIPE',
    title: 'Mon équipe',
    description: 'Gestion des collaborateurs de l\'agence',
    icon: UserCog,
    route: ROUTES.pilotage.equipe,
    scopeSlug: SCOPE_SLUGS.MON_EQUIPE,
    color: 'accent',
    group: 'pilotage',
  },
  // Support
  {
    id: 'CENTRE_AIDE',
    title: 'Centre d\'aide',
    description: 'FAQ, chat et assistance en ligne',
    icon: HelpCircle,
    route: ROUTES.support.helpcenter,
    scopeSlug: SCOPE_SLUGS.MES_DEMANDES,
    color: 'primary',
    group: 'support',
  },
  {
    id: 'MES_DEMANDES',
    title: 'Mes demandes',
    description: 'Créer et suivre vos demandes de support',
    icon: LifeBuoy,
    route: ROUTES.support.userTickets,
    scopeSlug: SCOPE_SLUGS.MES_DEMANDES,
    color: 'primary',
    group: 'support',
  },
  {
    id: 'CONSOLE_SUPPORT',
    title: 'Console support',
    description: 'Gestion des tickets et demandes utilisateurs',
    icon: Headphones,
    route: ROUTES.support.console,
    scopeSlug: SCOPE_SLUGS.SUPPORT_TICKETS,
    color: 'accent',
    group: 'support',
    requiresSupport: true,
  },
  // Gestion de Projet
  {
    id: 'PROJET_KANBAN',
    title: 'Gestion de Projet',
    description: 'Kanban et suivi des tickets développement',
    icon: Kanban,
    route: ROUTES.projects.kanban,
    scopeSlug: SCOPE_SLUGS.APOGEE_TICKETS,
    color: 'accent',
    group: 'projects',
    requiresModule: 'apogee_tickets',
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
    id: 'FRANCHISEUR_STATS',
    title: 'Statistiques Réseau',
    description: 'Matrices de performance multi-agences',
    icon: PieChart,
    route: ROUTES.reseau.stats,
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
];

export const DASHBOARD_GROUPS = {
  help_academy: {
    title: 'Help! Academy',
    icon: GraduationCap,
    colorClass: 'text-primary',
    indexUrl: ROUTES.academy.index,
  },
  pilotage: {
    title: 'Pilotage Agence',
    icon: BarChart3,
    colorClass: 'text-accent',
    indexUrl: ROUTES.pilotage.index,
  },
  support: {
    title: 'Support',
    icon: MessageSquare,
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
    title: 'Réseau',
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
} as const;
