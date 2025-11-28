/**
 * Configuration centralisée de la navigation
 * 
 * Ce fichier définit la structure de navigation de l'application.
 * Les scopes sont utilisés pour le filtrage des permissions.
 */

import {
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv,
  Headset, MessageSquare, Network, Building2, PieChart, GitCompare,
  Coins, Settings, Users, Shield, Database, Activity, Home, User, Grid3X3
} from 'lucide-react';

export interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  scope?: string;
  description?: string;
  children?: NavItem[];
}

export interface NavGroup {
  label: string;
  labelKey: string;
  items: NavItem[];
  requiredRole?: 'admin' | 'support' | 'franchiseur';
}

/**
 * Scopes de navigation et leurs significations :
 * 
 * Help Academy:
 * - apogee: Guide Apogée (logiciel)
 * - apporteurs: Guide des apporteurs d'affaires
 * - helpconfort: Base documentaire HelpConfort
 * 
 * Pilotage Agence:
 * - mes_indicateurs: Dashboard KPI et statistiques
 * - actions_a_mener: Gestion des actions/tâches
 * - diffusion: Mode affichage TV
 * 
 * Support:
 * - mes_demandes: Création/suivi de tickets utilisateur
 * - support_tickets: Gestion des tickets (staff support)
 * 
 * Franchiseur:
 * - franchiseur_dashboard: Vue d'ensemble réseau
 * - franchiseur_agencies: Gestion des agences
 * - franchiseur_kpi: Statistiques réseau
 * - franchiseur_royalties: Calcul des redevances
 * 
 * Administration:
 * - admin_users: Gestion des utilisateurs
 * - admin_roles: Permissions et rôles
 * - admin_backup: Sauvegardes
 * - admin_settings: Paramètres système
 */

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Help! Academy',
    labelKey: 'help-academy',
    items: [
      { 
        title: 'Guide Apogée', 
        url: '/apogee', 
        icon: BookOpen, 
        scope: 'apogee', 
        description: 'Guide complet pour maîtriser le logiciel Apogée' 
      },
      { 
        title: 'Guide Apporteurs', 
        url: '/apporteurs', 
        icon: FileText, 
        scope: 'apporteurs', 
        description: 'Ressources pour les apporteurs d\'affaires' 
      },
      { 
        title: 'Base Documentaire', 
        url: '/helpconfort', 
        icon: FolderOpen, 
        scope: 'helpconfort', 
        description: 'Documents et ressources HelpConfort' 
      },
    ],
  },
  {
    label: 'Pilotage Agence',
    labelKey: 'pilotage',
    items: [
      { 
        title: 'Statistiques', 
        icon: PieChart, 
        scope: 'mes_indicateurs',
        children: [
          { 
            title: 'Indicateurs généraux', 
            url: '/mes-indicateurs', 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Tableau de bord et KPI de votre agence' 
          },
          { 
            title: 'Indicateurs Apporteurs', 
            url: '/mes-indicateurs/apporteurs', 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques apporteurs' 
          },
          { 
            title: 'Indicateurs Univers', 
            url: '/mes-indicateurs/univers', 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques par univers' 
          },
          { 
            title: 'Indicateurs Techniciens', 
            url: '/mes-indicateurs/techniciens', 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques techniciens' 
          },
          { 
            title: 'Indicateurs SAV', 
            url: '/mes-indicateurs/sav', 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques SAV' 
          },
        ]
      },
      { 
        title: 'Actions à Mener', 
        url: '/actions-a-mener', 
        icon: ListTodo, 
        scope: 'actions_a_mener', 
        description: 'Suivi des actions et tâches en cours' 
      },
      { 
        title: 'Diffusion', 
        url: '/diffusion', 
        icon: Tv, 
        scope: 'diffusion', 
        description: 'Mode affichage TV agence' 
      },
    ],
  },
  {
    label: 'Support',
    labelKey: 'support',
    requiredRole: 'support',
    items: [
      { 
        title: 'Mes Demandes', 
        url: '/mes-demandes', 
        icon: MessageSquare, 
        scope: 'mes_demandes', 
        description: 'Créer et suivre vos demandes de support' 
      },
      { 
        title: 'Gestion Tickets', 
        url: '/admin/support', 
        icon: Headset, 
        scope: 'support_tickets', 
        description: 'Traiter les demandes de support' 
      },
    ],
  },
  {
    label: 'Réseau Franchiseur',
    labelKey: 'franchiseur',
    requiredRole: 'franchiseur',
    items: [
      { title: 'Dashboard Réseau', url: '/tete-de-reseau', icon: Network, scope: 'franchiseur_dashboard' },
      { title: 'Agences', url: '/tete-de-reseau/agences', icon: Building2, scope: 'franchiseur_agencies' },
      { title: 'Statistiques', url: '/tete-de-reseau/stats', icon: PieChart, scope: 'franchiseur_kpi' },
      { title: 'Comparatifs', url: '/tete-de-reseau/comparatifs', icon: GitCompare, scope: 'franchiseur_kpi' },
      { title: 'Redevances', url: '/tete-de-reseau/redevances', icon: Coins, scope: 'franchiseur_royalties' },
    ],
  },
  {
    label: 'Administration',
    labelKey: 'admin',
    requiredRole: 'admin',
    items: [
      { 
        title: 'Utilisateurs', 
        url: '/admin/users-list', 
        icon: Users, 
        scope: 'admin_users', 
        description: 'Gérer les comptes utilisateurs' 
      },
      { 
        title: 'Permissions', 
        icon: Shield, 
        scope: 'admin_roles',
        children: [
          { title: 'Groupes', url: '/admin/permissions/groups', icon: Users, scope: 'admin_roles', description: 'Gérer les groupes et leurs permissions' },
          { title: 'Utilisateurs', url: '/admin/permissions/users', icon: User, scope: 'admin_roles', description: 'Permissions individuelles' },
          { title: 'Matrice', url: '/admin/permissions/matrix', icon: Grid3X3, scope: 'admin_roles', description: 'Vue matricielle globale' },
          { title: 'Audit V2', url: '/admin/roles-v2', icon: Shield, scope: 'admin_roles', description: 'Audit et migration des rôles V2' },
        ]
      },
      { title: 'Agences', url: '/admin/agencies', icon: Building2, scope: 'admin_settings' },
      { title: 'Sauvegardes', url: '/admin/backup', icon: Database, scope: 'admin_backup' },
      { title: 'Activité', url: '/admin/user-activity', icon: Activity, scope: 'admin_settings' },
      { 
        title: 'Paramètres', 
        url: '/admin', 
        icon: Settings, 
        scope: 'admin_settings', 
        description: 'Configuration du système' 
      },
    ],
  },
];

/**
 * Titres des pages pour le header
 */
export const PAGE_TITLES: Record<string, string> = {
  '/': 'Tableau de bord',
  // HELP Academy
  '/apogee': 'Guide Apogée',
  '/apporteurs': 'Guide Apporteurs',
  '/helpconfort': 'Base Documentaire',
  '/documents': 'Documents',
  // Pilotage
  '/mes-indicateurs': 'Indicateurs généraux',
  '/mes-indicateurs/apporteurs': 'Indicateurs Apporteurs',
  '/mes-indicateurs/univers': 'Indicateurs Univers',
  '/mes-indicateurs/techniciens': 'Indicateurs Techniciens',
  '/mes-indicateurs/sav': 'Indicateurs SAV',
  '/actions-a-mener': 'Actions à Mener',
  '/diffusion': 'Mode Diffusion',
  // Support
  '/mes-demandes': 'Mes Demandes',
  '/support': 'Support',
  '/support-tickets': 'Mes Tickets',
  // Franchiseur
  '/tete-de-reseau': 'Dashboard Réseau',
  '/tete-de-reseau/agences': 'Agences du Réseau',
  '/tete-de-reseau/stats': 'Statistiques Réseau',
  '/tete-de-reseau/comparatifs': 'Comparatifs',
  '/tete-de-reseau/redevances': 'Redevances',
  '/tete-de-reseau/parametres': 'Paramètres Réseau',
  // Admin
  '/admin': 'Administration',
  '/admin/support': 'Gestion Tickets',
  '/admin/users': 'Gestion Utilisateurs',
  '/admin/users-list': 'Liste Utilisateurs',
  '/admin/role-permissions': 'Rôles & Permissions',
  '/admin/permissions/groups': 'Groupes de permissions',
  '/admin/permissions/users': 'Permissions utilisateurs',
  '/admin/permissions/matrix': 'Matrice des permissions',
  '/admin/roles-v2': 'Audit Rôles V2',
  '/admin/agencies': 'Gestion Agences',
  '/admin/backup': 'Sauvegardes',
  '/admin/documents': 'Documents Admin',
  '/admin/user-activity': 'Activité Utilisateurs',
  '/admin/storage-quota': 'Quota Stockage',
  '/admin/cache-backup': 'Cache & Backup',
  // User
  '/profile': 'Mon Profil',
  '/favorites': 'Mes Favoris',
};

/**
 * Retourne le titre d'une page en fonction de son chemin
 */
export function getPageTitle(pathname: string): string {
  // Check exact match first
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }
  // Check for prefix matches
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path) && path !== '/') {
      return title;
    }
  }
  return 'HC Services';
}
