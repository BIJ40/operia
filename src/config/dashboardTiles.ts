import { 
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  MessageSquare, Network, Users, Shield, Database, Settings, LucideIcon,
  PieChart, Coins
} from 'lucide-react';

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
  badge?: string;
}

export const DASHBOARD_TILES: DashboardTile[] = [
  // Help Academy
  {
    id: 'GUIDE_APOGEE',
    title: 'Guide Apogée',
    description: 'Guide complet pour maîtriser le logiciel Apogée',
    icon: BookOpen,
    route: '/apogee',
    scopeSlug: 'apogee',
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'GUIDE_APPORTEURS',
    title: 'Guide Apporteurs',
    description: "Ressources pour les apporteurs d'affaires",
    icon: FileText,
    route: '/apporteurs',
    scopeSlug: 'apporteurs',
    color: 'primary',
    group: 'help_academy',
  },
  {
    id: 'BASE_DOCUMENTAIRE',
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    route: '/helpconfort',
    scopeSlug: 'helpconfort',
    color: 'primary',
    group: 'help_academy',
  },
  // Pilotage Agence
  {
    id: 'MES_INDICATEURS',
    title: 'Indicateurs généraux',
    description: 'Tableau de bord et KPI de votre agence',
    icon: BarChart3,
    route: '/mes-indicateurs',
    scopeSlug: 'mes_indicateurs',
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'ACTIONS_A_MENER',
    title: 'Actions à Mener',
    description: 'Suivi des actions et tâches en cours',
    icon: ListTodo,
    route: '/actions-a-mener',
    scopeSlug: 'actions_a_mener',
    color: 'accent',
    group: 'pilotage',
  },
  {
    id: 'DIFFUSION',
    title: 'Diffusion',
    description: 'Mode affichage TV agence',
    icon: Tv,
    route: '/diffusion',
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
    icon: MessageSquare,
    route: '/mes-demandes',
    scopeSlug: 'mes_demandes',
    color: 'primary',
    group: 'support',
  },
  {
    id: 'CONSOLE_SUPPORT',
    title: 'Console Support',
    description: 'Gestion des tickets et demandes utilisateurs',
    icon: MessageSquare,
    route: '/admin/support',
    scopeSlug: 'support_tickets',
    color: 'accent',
    group: 'support',
    requiresSupport: true,
  },
  // Franchiseur
  {
    id: 'RESEAU_FRANCHISEUR',
    title: 'Dashboard Réseau',
    description: 'Pilotage multi-agences et KPIs réseau',
    icon: Network,
    route: '/tete-de-reseau',
    scopeSlug: 'franchiseur_dashboard',
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_STATS',
    title: 'Statistiques Réseau',
    description: 'Matrices de performance multi-agences',
    icon: PieChart,
    route: '/tete-de-reseau/stats',
    scopeSlug: 'franchiseur_kpi',
    color: 'accent',
    group: 'franchiseur',
  },
  {
    id: 'FRANCHISEUR_ROYALTIES',
    title: 'Redevances',
    description: 'Calcul et suivi mensuel des redevances',
    icon: Coins,
    route: '/tete-de-reseau/redevances',
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
    route: '/admin/users',
    scopeSlug: 'admin_users',
    color: 'primary',
    group: 'admin',
    requiresFranchisor: true, // N3+ can manage users
  },
  {
    id: 'ADMIN_ROLES',
    title: 'Rôles & Permissions',
    description: 'Configuration des droits d\'accès',
    icon: Shield,
    route: '/admin/roles',
    scopeSlug: 'admin_roles',
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
  {
    id: 'ADMIN_BACKUP',
    title: 'Sauvegarde',
    description: 'Import/export des données',
    icon: Database,
    route: '/admin/backup',
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
    route: '/admin',
    scopeSlug: 'admin_settings',
    color: 'primary',
    group: 'admin',
    requiresAdmin: true,
  },
];

export const DASHBOARD_GROUPS = {
  help_academy: {
    title: 'Help! Academy',
    icon: BookOpen,
    colorClass: 'text-primary',
  },
  pilotage: {
    title: 'Pilotage Agence',
    icon: BarChart3,
    colorClass: 'text-accent',
  },
  support: {
    title: 'Support',
    icon: MessageSquare,
    colorClass: 'text-primary',
  },
  franchiseur: {
    title: 'Réseau',
    icon: Network,
    colorClass: 'text-accent',
  },
  admin: {
    title: 'Administration',
    icon: Settings,
    colorClass: 'text-destructive',
  },
} as const;
