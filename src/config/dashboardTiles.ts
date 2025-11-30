import { 
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  MessageSquare, Network, Users, Database, Settings, LucideIcon,
  PieChart, Coins, LifeBuoy, Headphones, GraduationCap, Kanban, Activity
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
  group: 'help_academy' | 'pilotage' | 'support' | 'franchiseur' | 'admin';
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
    scopeSlug: 'apogee',
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'GUIDE_APPORTEURS',
    title: 'Guide Apporteurs',
    description: "Ressources pour les apporteurs d'affaires",
    icon: FileText,
    route: ROUTES.academy.apporteurs,
    scopeSlug: 'apporteurs',
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'BASE_DOCUMENTAIRE',
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    route: ROUTES.academy.documents,
    scopeSlug: 'helpconfort',
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
    scopeSlug: 'mes_indicateurs',
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'ACTIONS_A_MENER',
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    route: ROUTES.pilotage.actions,
    scopeSlug: 'actions_a_mener',
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'DIFFUSION',
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    route: ROUTES.pilotage.diffusion,
    scopeSlug: 'diffusion',
    color: 'accent',
    group: 'pilotage',
    badge: 'En cours',
  },
  // Support
  {
    id: 'MES_DEMANDES',
    title: 'Mes Demandes',
    description: 'Créer et suivre vos demandes de support',
    icon: LifeBuoy,
    route: ROUTES.support.userTickets,
    scopeSlug: 'mes_demandes',
    color: 'primary',
    group: 'support',
  },
  {
    id: 'CONSOLE_SUPPORT',
    title: 'Console Support',
    description: 'Gestion des tickets et demandes utilisateurs',
    icon: Headphones,
    route: ROUTES.support.console,
    scopeSlug: 'support_tickets',
    color: 'accent',
    group: 'support',
    requiresSupport: true,
  },
  {
    id: 'TICKETING_DEV',
    title: 'Ticketing Développement',
    description: 'Suivi des évolutions et corrections Apogée',
    icon: Kanban,
    route: ROUTES.admin.apogeeTickets,
    scopeSlug: 'apogee_tickets',
    color: 'accent',
    group: 'support',
    requiresModule: 'apogee_tickets',
  },
  // Franchiseur
  {
    id: 'RESEAU_FRANCHISEUR',
    title: 'Dashboard Réseau',
    description: 'Pilotage multi-agences et KPIs réseau',
    icon: Network,
    route: ROUTES.reseau.dashboard,
    scopeSlug: 'franchiseur_dashboard',
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_STATS',
    title: 'Statistiques Réseau',
    description: 'Matrices de performance multi-agences',
    icon: PieChart,
    route: ROUTES.reseau.stats,
    scopeSlug: 'franchiseur_kpi',
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_ROYALTIES',
    title: 'Redevances',
    description: 'Calcul et suivi mensuel des redevances',
    icon: Coins,
    route: ROUTES.reseau.redevances,
    scopeSlug: 'franchiseur_royalties',
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
    scopeSlug: 'admin_users',
    color: 'primary',
    group: 'admin',
    requiresFranchisor: true, // N3+ can manage users
  },
  {
    id: 'ADMIN_BACKUP',
    title: 'Sauvegarde',
    description: 'Import/export des données',
    icon: Database,
    route: ROUTES.admin.backup,
    scopeSlug: 'admin_backup',
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
    scopeSlug: 'admin_settings',
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
    scopeSlug: 'admin_settings',
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
