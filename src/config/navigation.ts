/**
 * Configuration centralisée de la navigation
 * 
 * Ce fichier définit la structure de navigation de l'application.
 * Les scopes sont utilisés pour le filtrage des permissions.
 * 
 * NOTE: Les routes sont maintenant centralisées dans src/config/routes.ts
 * Ce fichier utilise ROUTES pour les URLs.
 */

import {
  BookOpen, FileText, FolderOpen, BarChart3, ListTodo, Tv, Calendar,
  Headset, Network, Building2, PieChart, GitCompare,
  Coins, Settings, Users, Database, Activity, LifeBuoy, Kanban, HelpCircle,
  MessagesSquare
} from 'lucide-react';
import { ROUTES } from './routes';

export interface NavItem {
  title: string;
  url?: string;
  icon: React.ElementType;
  scope?: string;
  description?: string;
  children?: NavItem[];
  isDisabled?: boolean; // Lien désactivé (tuile "Bientôt")
  badge?: string;
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
        url: ROUTES.academy.apogee, 
        icon: BookOpen, 
        scope: 'apogee', 
        description: 'Guide complet pour maîtriser le logiciel Apogée' 
      },
      { 
        title: 'Guide Apporteurs', 
        url: ROUTES.academy.apporteurs, 
        icon: FileText, 
        scope: 'apporteurs', 
        description: 'Ressources pour les apporteurs d\'affaires',
        badge: 'Bientôt',
        isDisabled: true,
      },
      { 
        title: 'Base Documentaire', 
        url: ROUTES.academy.documents, 
        icon: FolderOpen, 
        scope: 'helpconfort', 
        description: 'Documents et ressources HelpConfort' 
      },
    ],
  },
  {
    label: 'Mon Agence',
    labelKey: 'pilotage',
    items: [
      { 
        title: 'Statistiques', 
        url: ROUTES.pilotage.statsHub,
        icon: BarChart3, 
        scope: 'mes_indicateurs',
        description: 'Statistiques et indicateurs de l\'agence',
        children: [
          { 
            title: 'Vue d\'ensemble', 
            url: ROUTES.pilotage.statsHub, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Vue globale des statistiques' 
          },
          { 
            title: 'Mon CA', 
            url: ROUTES.pilotage.indicateurs, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Indicateurs de chiffre d\'affaires' 
          },
          { 
            title: 'Mes Univers', 
            url: ROUTES.pilotage.indicateursUnivers, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques par univers métier' 
          },
          { 
            title: 'Mes Apporteurs', 
            url: ROUTES.pilotage.indicateursApporteurs, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques apporteurs d\'affaires' 
          },
          { 
            title: 'Mes SAV', 
            url: ROUTES.pilotage.indicateursSav, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques SAV' 
          },
        ]
      },
      { 
        title: 'Actions à Mener', 
        url: ROUTES.pilotage.actions, 
        icon: ListTodo, 
        scope: 'actions_a_mener', 
        description: 'Suivi des actions et tâches en cours' 
      },
      { 
        title: 'Diffusion', 
        url: ROUTES.pilotage.diffusion, 
        icon: Tv, 
        scope: 'diffusion', 
        description: 'Mode affichage TV agence',
        badge: 'En cours',
      },
      { 
        title: 'Les plannings', 
        url: ROUTES.pilotage.rhTech, 
        icon: Calendar, 
        scope: 'mes_indicateurs', 
        description: 'Validation des plannings hebdomadaires',
        badge: 'Bientôt',
        isDisabled: true,
      },
    ],
  },
  {
    label: 'Support',
    labelKey: 'support',
    items: [
      { 
        title: 'Support', 
        url: ROUTES.support.index, 
        icon: HelpCircle, 
        scope: 'mes_demandes', 
        description: 'Chat IA et assistance'
      },
      { 
        title: 'Console Support', 
        url: ROUTES.support.console, 
        icon: Headset, 
        scope: 'support_tickets', 
        description: 'Traiter les demandes de support' 
      },
    ],
  },
  {
    label: 'Communication',
    labelKey: 'communication',
    items: [
      { 
        title: 'Messages', 
        url: ROUTES.messages, 
        icon: MessagesSquare, 
        scope: 'messaging', 
        description: 'Discussions internes et groupes' 
      },
    ],
  },
  {
    label: 'Gestion de Projet',
    labelKey: 'projects',
    items: [
      { 
        title: 'Kanban', 
        url: ROUTES.projects.kanban, 
        icon: Kanban, 
        scope: 'apogee_tickets', 
        description: 'Tableau de bord projet' 
      },
      { 
        title: 'Liste', 
        url: ROUTES.projects.list, 
        icon: ListTodo, 
        scope: 'apogee_tickets', 
        description: 'Vue liste des tickets' 
      },
      { 
        title: 'Tickets incomplets', 
        url: ROUTES.projects.incomplete, 
        icon: ListTodo, 
        scope: 'apogee_tickets', 
        description: 'Tickets à compléter' 
      },
      { 
        title: 'Review', 
        url: ROUTES.projects.review, 
        icon: FileText, 
        scope: 'apogee_tickets', 
        description: 'Revue des tickets' 
      },
      { 
        title: 'Permissions', 
        url: ROUTES.projects.permissions, 
        icon: Users, 
        scope: 'apogee_tickets', 
        description: 'Gestion des droits' 
      },
    ],
  },
  {
    label: 'Espace Franchiseur',
    labelKey: 'franchiseur',
    requiredRole: 'franchiseur',
    items: [
      { title: 'Dashboard Réseau', url: ROUTES.reseau.dashboard, icon: Network, scope: 'franchiseur_dashboard' },
      { title: 'Agences', url: ROUTES.reseau.agences, icon: Building2, scope: 'franchiseur_agencies' },
      { title: 'Utilisateurs', url: ROUTES.reseau.users, icon: Users, scope: 'franchiseur_agencies' },
      { title: 'Animateurs', url: ROUTES.reseau.animateurs, icon: Users, scope: 'franchiseur_agencies' },
      { title: 'Tableaux', url: ROUTES.reseau.tableaux, icon: PieChart, scope: 'franchiseur_kpi' },
      { title: 'Périodes', url: ROUTES.reseau.periodes, icon: GitCompare, scope: 'franchiseur_kpi' },
      { title: 'Comparatif', url: ROUTES.reseau.comparatif, icon: BarChart3, scope: 'franchiseur_kpi' },
      { title: 'Graphiques', url: ROUTES.reseau.graphiques, icon: BarChart3, scope: 'franchiseur_kpi' },
      { title: 'Redevances', url: ROUTES.reseau.redevances, icon: Coins, scope: 'franchiseur_royalties' },
    ],
  },
  {
    label: 'Administration',
    labelKey: 'admin',
    requiredRole: 'admin',
    items: [
      { 
        title: 'Utilisateurs', 
        url: ROUTES.admin.users, 
        icon: Users, 
        scope: 'admin_users', 
        description: 'Gestion des comptes',
        children: [
          { title: 'Liste utilisateurs', url: ROUTES.admin.users, icon: Users, scope: 'admin_users' },
          { title: 'Activité', url: ROUTES.admin.userActivity, icon: Activity, scope: 'admin_users' },
        ]
      },
      { 
        title: 'Agences', 
        url: ROUTES.admin.agencies, 
        icon: Building2, 
        scope: 'admin_settings',
        description: 'Configurer les agences'
      },
      { 
        title: 'Support', 
        url: ROUTES.admin.supportTickets, 
        icon: LifeBuoy, 
        scope: 'support_tickets',
        description: 'Gérer les tickets support',
        children: [
          { title: 'Tickets', url: ROUTES.admin.supportTickets, icon: LifeBuoy, scope: 'support_tickets' },
          { title: 'Statistiques', url: ROUTES.admin.supportStats, icon: BarChart3, scope: 'support_tickets' },
          { title: 'Historique Escalades', url: ROUTES.admin.escalationHistory, icon: FileText, scope: 'support_tickets' },
        ]
      },
      { 
        title: 'Helpi (IA)', 
        url: ROUTES.admin.helpi, 
        icon: Database, 
        scope: 'admin_settings',
        description: 'Intelligence artificielle',
        children: [
          { title: 'Moteur RAG', url: ROUTES.admin.helpi, icon: Database, scope: 'admin_settings' },
          { title: 'Guides Apogée', url: ROUTES.admin.apogeeGuides, icon: BookOpen, scope: 'admin_settings' },
        ]
      },
      { 
        title: 'Données', 
        url: ROUTES.admin.backup, 
        icon: Database, 
        scope: 'admin_backup',
        description: 'Sauvegardes et stockage',
        children: [
          { title: 'Sauvegardes', url: ROUTES.admin.backup, icon: Database, scope: 'admin_backup' },
          { title: 'HelpConfort Backup', url: ROUTES.admin.helpconfortBackup, icon: Database, scope: 'admin_backup' },
          { title: 'Cache', url: ROUTES.admin.cacheBackup, icon: Database, scope: 'admin_backup' },
          { title: 'Stockage', url: ROUTES.admin.storageQuota, icon: Database, scope: 'admin_backup' },
        ]
      },
      { 
        title: 'Système', 
        url: ROUTES.admin.systemHealth, 
        icon: Activity, 
        scope: 'admin_settings',
        description: 'Surveillance système',
        children: [
          { title: 'Santé Système', url: ROUTES.admin.systemHealth, icon: Activity, scope: 'admin_settings' },
          { title: 'Métadonnées Pages', url: ROUTES.admin.pageMetadata, icon: Settings, scope: 'admin_settings' },
        ]
      },
    ],
  },
];

/**
 * Titres des pages pour le header
 */
export const PAGE_TITLES: Record<string, string> = {
  // Home
  [ROUTES.home]: 'Tableau de bord',
  
  // Help Academy (V2 routes)
  [ROUTES.academy.index]: 'Help! Academy',
  [ROUTES.academy.apogee]: 'Guide Apogée',
  [ROUTES.academy.apporteurs]: 'Guide Apporteurs',
  [ROUTES.academy.documents]: 'Base Documentaire',
  
  // Pilotage (V2 routes)
  [ROUTES.pilotage.index]: 'Mon Agence',
  [ROUTES.pilotage.indicateurs]: 'Indicateurs généraux',
  [ROUTES.pilotage.indicateursApporteurs]: 'Indicateurs Apporteurs',
  [ROUTES.pilotage.indicateursUnivers]: 'Indicateurs Univers',
  [ROUTES.pilotage.indicateursTechniciens]: 'Indicateurs Techniciens',
  [ROUTES.pilotage.indicateursSav]: 'Indicateurs SAV',
  [ROUTES.pilotage.actions]: 'Actions à Mener',
  [ROUTES.pilotage.diffusion]: 'Mode Diffusion',
  [ROUTES.pilotage.rhTech]: 'RH Tech - Planning',
  [ROUTES.rh.equipe]: 'Mon équipe',
  
  // Support (V2 routes)
  [ROUTES.support.index]: 'Support',
  [ROUTES.support.userTickets]: 'Mes demandes',
  [ROUTES.support.console]: 'Console support',
  
  // Réseau Franchiseur (V2 routes)
  [ROUTES.reseau.index]: 'Espace Franchiseur',
  [ROUTES.reseau.dashboard]: 'Dashboard Réseau',
  [ROUTES.reseau.agences]: 'Agences du Réseau',
  [ROUTES.reseau.users]: 'Utilisateurs Réseau',
  [ROUTES.reseau.animateurs]: 'Gestion Animateurs',
  [ROUTES.reseau.tableaux]: 'Tableaux Réseau',
  [ROUTES.reseau.periodes]: 'Périodes',
  [ROUTES.reseau.redevances]: 'Redevances',
  
  // Admin (V2 routes)
  [ROUTES.admin.index]: 'Administration',
  [ROUTES.admin.supportTickets]: 'Tickets Support',
  [ROUTES.admin.supportStats]: 'Statistiques Support',
  [ROUTES.admin.users]: 'Gestion Utilisateurs',
  [ROUTES.admin.agencies]: 'Gestion Agences',
  [ROUTES.admin.backup]: 'Sauvegardes',
  [ROUTES.admin.helpconfortBackup]: 'HelpConfort Backup',
  [ROUTES.admin.cacheBackup]: 'Cache Backup',
  [ROUTES.admin.userActivity]: 'Activité Utilisateurs',
  [ROUTES.admin.escalationHistory]: 'Historique Escalades',
  [ROUTES.admin.helpi]: 'Helpi - Moteur IA',
  [ROUTES.admin.apogeeGuides]: 'Guides Apogée (RAG)',
  [ROUTES.admin.systemHealth]: 'Santé Système',
  [ROUTES.admin.storageQuota]: 'Stockage',
  [ROUTES.admin.pageMetadata]: 'Métadonnées Pages',
  [ROUTES.admin.statia]: 'StatIA by BIJ',
  // Gestion de Projet (V2 routes)
  [ROUTES.projects.index]: 'Gestion de Projet',
  [ROUTES.projects.kanban]: 'Kanban Projet',
  [ROUTES.projects.incomplete]: 'Tickets Incomplets',
  [ROUTES.projects.review]: 'Review Tickets',
  [ROUTES.projects.permissions]: 'Permissions Tickets',
  
  // Legacy admin apogee-tickets (redirects)
  [ROUTES.admin.apogeeTickets]: 'Gestion de Projet',
  
  // RH
  [ROUTES.rh.demande]: 'Demande de congé',
  
  // User
  [ROUTES.profile]: 'Mon Profil',
  [ROUTES.favorites]: 'Mes Favoris',
  
  // Communication
  [ROUTES.messages]: 'Messages',
  
  // Legacy routes (backward compatibility)
  [ROUTES.legacy.apogee]: 'Guide Apogée',
  [ROUTES.legacy.apporteurs]: 'Guide Apporteurs',
  [ROUTES.legacy.helpconfort]: 'Base Documentaire',
  [ROUTES.legacy.mesIndicateurs]: 'Indicateurs généraux',
  [ROUTES.legacy.actionsAMener]: 'Actions à Mener',
  [ROUTES.legacy.diffusion]: 'Mode Diffusion',
  [ROUTES.legacy.rhTech]: 'RH Tech - Planning',
  // mesDemandes removed - now active route at ROUTES.support.userTickets
  [ROUTES.legacy.tetDeReseau]: 'Dashboard Réseau',
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
