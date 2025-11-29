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
  Coins, Settings, Users, Database, Activity, LifeBuoy
} from 'lucide-react';
import { ROUTES } from './routes';

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
        description: 'Ressources pour les apporteurs d\'affaires' 
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
            url: ROUTES.pilotage.indicateurs, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Tableau de bord et KPI de votre agence' 
          },
          { 
            title: 'Indicateurs Apporteurs', 
            url: ROUTES.pilotage.indicateursApporteurs, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques apporteurs' 
          },
          { 
            title: 'Indicateurs Univers', 
            url: ROUTES.pilotage.indicateursUnivers, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques par univers' 
          },
          { 
            title: 'Indicateurs Techniciens', 
            url: ROUTES.pilotage.indicateursTechniciens, 
            icon: BarChart3, 
            scope: 'mes_indicateurs', 
            description: 'Statistiques techniciens' 
          },
          { 
            title: 'Indicateurs SAV', 
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
        description: 'Mode affichage TV agence' 
      },
      { 
        title: 'RH Tech', 
        url: ROUTES.pilotage.rhTech, 
        icon: Calendar, 
        scope: 'mes_indicateurs', 
        description: 'Planning hebdomadaire techniciens' 
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
        url: ROUTES.support.userTickets, 
        icon: LifeBuoy, 
        scope: 'mes_demandes', 
        description: 'Créer et suivre vos demandes de support' 
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
    label: 'Réseau Franchiseur',
    labelKey: 'franchiseur',
    requiredRole: 'franchiseur',
    items: [
      { title: 'Dashboard Réseau', url: ROUTES.reseau.dashboard, icon: Network, scope: 'franchiseur_dashboard' },
      { title: 'Agences', url: ROUTES.reseau.agences, icon: Building2, scope: 'franchiseur_agencies' },
      { title: 'Animateurs', url: ROUTES.reseau.animateurs, icon: Users, scope: 'franchiseur_agencies' },
      { title: 'Statistiques', url: ROUTES.reseau.stats, icon: PieChart, scope: 'franchiseur_kpi' },
      { title: 'Comparatifs', url: ROUTES.reseau.comparatifs, icon: GitCompare, scope: 'franchiseur_kpi' },
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
        description: 'Gestion des comptes utilisateurs' 
      },
      { title: 'Agences', url: ROUTES.admin.agencies, icon: Building2, scope: 'admin_settings' },
      { title: 'Sauvegardes', url: ROUTES.admin.backup, icon: Database, scope: 'admin_backup' },
      { title: 'Activité', url: ROUTES.admin.userActivity, icon: Activity, scope: 'admin_settings' },
      { 
        title: 'Paramètres', 
        url: ROUTES.admin.index, 
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
  // Home
  [ROUTES.home]: 'Tableau de bord',
  
  // Help Academy (V2 routes)
  [ROUTES.academy.index]: 'Help! Academy',
  [ROUTES.academy.apogee]: 'Guide Apogée',
  [ROUTES.academy.apporteurs]: 'Guide Apporteurs',
  [ROUTES.academy.documents]: 'Base Documentaire',
  
  // Pilotage (V2 routes)
  [ROUTES.pilotage.index]: 'Pilotage Agence',
  [ROUTES.pilotage.indicateurs]: 'Indicateurs généraux',
  [ROUTES.pilotage.indicateursApporteurs]: 'Indicateurs Apporteurs',
  [ROUTES.pilotage.indicateursUnivers]: 'Indicateurs Univers',
  [ROUTES.pilotage.indicateursTechniciens]: 'Indicateurs Techniciens',
  [ROUTES.pilotage.indicateursSav]: 'Indicateurs SAV',
  [ROUTES.pilotage.actions]: 'Actions à Mener',
  [ROUTES.pilotage.diffusion]: 'Mode Diffusion',
  [ROUTES.pilotage.rhTech]: 'RH Tech - Planning',
  
  // Support (V2 routes)
  [ROUTES.support.index]: 'Support',
  [ROUTES.support.userTickets]: 'Mes Demandes',
  [ROUTES.support.console]: 'Console Support',
  
  // Réseau Franchiseur (V2 routes)
  [ROUTES.reseau.index]: 'Réseau Franchiseur',
  [ROUTES.reseau.dashboard]: 'Dashboard Réseau',
  [ROUTES.reseau.agences]: 'Agences du Réseau',
  [ROUTES.reseau.animateurs]: 'Gestion Animateurs',
  [ROUTES.reseau.stats]: 'Statistiques Réseau',
  [ROUTES.reseau.comparatifs]: 'Comparatifs',
  [ROUTES.reseau.redevances]: 'Redevances',
  
  // Admin (V2 routes)
  [ROUTES.admin.index]: 'Administration',
  [ROUTES.admin.support]: 'Gestion Tickets',
  [ROUTES.admin.users]: 'Gestion Utilisateurs',
  [ROUTES.admin.agencies]: 'Gestion Agences',
  [ROUTES.admin.backup]: 'Sauvegardes',
  [ROUTES.admin.userActivity]: 'Activité Utilisateurs',
  [ROUTES.admin.escalationHistory]: 'Historique Escalades',
  
  // User
  [ROUTES.profile]: 'Mon Profil',
  [ROUTES.favorites]: 'Mes Favoris',
  
  // Legacy routes (backward compatibility)
  [ROUTES.legacy.apogee]: 'Guide Apogée',
  [ROUTES.legacy.apporteurs]: 'Guide Apporteurs',
  [ROUTES.legacy.helpconfort]: 'Base Documentaire',
  [ROUTES.legacy.mesIndicateurs]: 'Indicateurs généraux',
  [ROUTES.legacy.actionsAMener]: 'Actions à Mener',
  [ROUTES.legacy.diffusion]: 'Mode Diffusion',
  [ROUTES.legacy.rhTech]: 'RH Tech - Planning',
  [ROUTES.legacy.mesDemandes]: 'Mes Demandes',
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
