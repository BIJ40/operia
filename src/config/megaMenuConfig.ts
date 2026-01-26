/**
 * Configuration des méga-menus pour la navigation horizontale
 * 
 * RÈGLE CLÉE: Chaque utilisateur ne voit QUE ce qui lui est activé,
 * indépendamment de son niveau N (rôle global).
 */

import { ROUTES } from './routes';

export interface MegaMenuLink {
  label: string;
  href: string;
  icon?: string;
  description?: string;
  badge?: string;
  isDisabled?: boolean;
  minRole?: string;
  requiresSupportConsoleUI?: boolean;
  /** Option requise dans enabled_modules pour voir ce lien */
  requiresOption?: {
    module: string;
    option: string;
  };
  /** Section (pour regroupement dans le menu RH) */
  section?: 'salarie' | 'dirigeant' | 'maintenance';
  /** Groupe (pour regroupement dans le menu Admin) */
  group?: 'users' | 'content' | 'ai' | 'system' | 'support' | 'monitoring';
}

export interface MegaMenuSection {
  id: string;
  title: string;
  description?: string;
  icon: string;
  href?: string; // Lien direct vers la section principale
  links: MegaMenuLink[];
  accessKey?: 'canAccessHelpAcademy' | 'canAccessPilotageAgence' | 'canAccessSupport' | 'canAccessFranchiseur' | 'canAccessAdmin';
  moduleKey?: string;
}

export const MEGA_MENU_CONFIG: MegaMenuSection[] = [
  // ============================================
  // MON AGENCE (Pilotage Opérationnel) - N2+
  // Module: pilotage_agence
  // ============================================
  {
    id: 'mon-agence',
    title: 'Mon Agence',
    description: 'Pilotage et statistiques agence',
    icon: 'Building2',
    href: ROUTES.agency.index,
    moduleKey: 'pilotage_agence',
    accessKey: 'canAccessPilotageAgence',
    links: [
      { label: 'Stats Hub', href: ROUTES.agency.statsHub, icon: 'BarChart2', description: 'Centre statistiques', minRole: 'franchisee_admin' },
      // HIDDEN: { label: 'Veille Apporteurs', href: ROUTES.agency.veilleApporteurs, icon: 'Radar', description: 'Alertes apporteurs', minRole: 'franchisee_admin' },
      { label: 'Diffusion', href: ROUTES.agency.diffusion, icon: 'Tv', description: 'Mode TV agence', minRole: 'franchisee_admin' },
      { label: 'Actions à Mener', href: ROUTES.agency.actions, icon: 'ListTodo', description: 'Tâches opérationnelles', minRole: 'franchisee_admin' },
    ],
  },

  // ============================================
  // RH (Ressources Humaines) - Back-office N2 uniquement
  // Module: rh
  // NOTE: Portail salarié N1 supprimé
  // ============================================
  {
    id: 'rh',
    title: 'RH & Maintenance',
    description: 'Ressources humaines & maintenance',
    icon: 'Briefcase',
    href: '/rh',
    moduleKey: 'rh',
    links: [
      // === Gestion RH (N2+) ===
      { 
        label: 'Suivi RH', 
        href: ROUTES.rh.suivi, 
        icon: 'ClipboardList', 
        description: 'Gestion complète des collaborateurs',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
      { 
        label: 'Plannings', 
        href: ROUTES.rh.plannings, 
        icon: 'CalendarDays', 
        description: 'Plannings hebdomadaires',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
      { 
        label: 'DocGen', 
        href: ROUTES.rh.docgen, 
        icon: 'FileEdit', 
        description: 'Génération de documents',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
      // === Maintenance (N2+) ===
      { 
        label: 'Parc Véhicules', 
        href: ROUTES.rh.parc, 
        icon: 'Car', 
        description: 'Gestion de flotte',
        section: 'maintenance',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
      { 
        label: 'Matériel & EPI', 
        href: ROUTES.rh.epi, 
        icon: 'HardHat', 
        description: 'Équipements de protection',
        section: 'maintenance',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
    ],
  },

  // ============================================
  // HELP ACADEMY
  // Module: help_academy
  // ============================================
  {
    id: 'academy',
    title: 'Academy',
    description: 'Formation et documentation',
    icon: 'GraduationCap',
    href: ROUTES.academy.index,
    moduleKey: 'help_academy',
    accessKey: 'canAccessHelpAcademy',
    links: [
      { label: 'Guide Apogée', href: ROUTES.academy.apogee, icon: 'BookOpen', description: 'Maîtriser le logiciel' },
      { label: 'Guide Apporteurs', href: ROUTES.academy.apporteurs, icon: 'FileText', description: 'Ressources partenaires', minRole: 'franchisee_user' },
      { label: 'Base Documentaire', href: ROUTES.academy.documents, icon: 'FolderOpen', description: 'Documents HelpConfort' },
      { label: 'Mes Favoris', href: ROUTES.academy.favorites, icon: 'Heart', description: 'Vos sections favorites' },
    ],
  },

  // ============================================
  // GESTION DE PROJET (ex-Tickets)
  // Module: apogee_tickets
  // ============================================
  {
    id: 'tickets',
    title: 'Gestion de Projet',
    description: 'Suivi et gestion de projet',
    icon: 'Kanban',
    href: ROUTES.projects.index,
    moduleKey: 'apogee_tickets',
    links: [
      { label: 'Kanban', href: ROUTES.projects.kanban, icon: 'Kanban', description: 'Vue tableau' },
      { label: 'Liste', href: ROUTES.projects.list, icon: 'ListTodo', description: 'Vue liste' },
      { label: 'Tickets incomplets', href: ROUTES.projects.incomplete, icon: 'AlertCircle', description: 'À compléter', minRole: 'franchisor_user' },
      { label: 'Review', href: ROUTES.projects.review, icon: 'CheckCircle', description: 'Revoir tickets', minRole: 'franchisor_user' },
      { label: 'Permissions', href: ROUTES.projects.permissions, icon: 'Shield', description: 'Gérer droits', minRole: 'franchisor_admin' },
    ],
  },

  // ============================================
  // FRANCHISEUR (N3+)
  // Module: reseau_franchiseur
  // ============================================
  {
    id: 'franchiseur',
    title: 'Franchiseur',
    description: 'Gestion du réseau',
    icon: 'Network',
    href: ROUTES.reseau.index,
    accessKey: 'canAccessFranchiseur',
    links: [
      { label: 'Dashboard Réseau', href: ROUTES.reseau.dashboard, icon: 'Network', description: 'Vue d\'ensemble', minRole: 'franchisor_user' },
      { label: 'Agences', href: ROUTES.reseau.agences, icon: 'Building2', description: 'Gestion des agences', minRole: 'franchisor_user' },
      { label: 'Animateurs', href: ROUTES.reseau.animateurs, icon: 'Users', description: 'Équipe animation', minRole: 'franchisor_admin' },
      { label: 'Utilisateurs Réseau', href: ROUTES.reseau.users, icon: 'UserCog', description: 'Comptes franchisés', minRole: 'franchisor_admin' },
      { label: 'Tableaux', href: ROUTES.reseau.tableaux, icon: 'PieChart', description: 'Statistiques réseau', minRole: 'franchisor_user' },
      { label: 'Périodes', href: ROUTES.reseau.periodes, icon: 'CalendarRange', description: 'Comparatifs temporels', minRole: 'franchisor_user' },
      { label: 'Comparatif Agences', href: ROUTES.reseau.comparatif, icon: 'BarChart3', description: 'Benchmark', minRole: 'franchisor_user' },
      { label: 'Graphiques', href: ROUTES.reseau.graphiques, icon: 'LineChart', description: 'Visualisations', minRole: 'franchisor_user' },
      { label: 'Redevances', href: ROUTES.reseau.redevances, icon: 'Coins', description: 'Calcul royalties', minRole: 'franchisor_admin' },
    ],
  },

  // ============================================
  // ADMINISTRATION (N5+)
  // Module: admin_plateforme
  // Sous-onglets simplifiés: Gestion, IA, Support, Données, Système
  // ============================================
  {
    id: 'admin',
    title: 'Admin',
    description: 'Paramètres système',
    icon: 'Settings',
    href: ROUTES.admin.index,
    accessKey: 'canAccessAdmin',
    links: [
      { label: 'Gestion', href: '/admin?tab=gestion', icon: 'Shield', description: 'Utilisateurs, agences, permissions', minRole: 'platform_admin' },
      { label: 'IA', href: '/admin?tab=ia', icon: 'Brain', description: 'Helpi, StatIA, Formation', minRole: 'platform_admin' },
      { label: 'Support', href: '/admin?tab=support', icon: 'Headset', description: 'Console, stats, escalades', minRole: 'platform_admin' },
      { label: 'Données', href: '/admin?tab=donnees', icon: 'Database', description: 'Sauvegardes, stockage', minRole: 'platform_admin' },
      { label: 'Système', href: '/admin?tab=systeme', icon: 'Cpu', description: 'Santé, métadonnées, annonces', minRole: 'platform_admin' },
    ],
  },
];

// ============================================
// SUPPORT MENU (séparé car toujours visible)
// ============================================
export const SUPPORT_MENU: MegaMenuSection = {
  id: 'support',
  title: 'Support',
  description: 'Aide et assistance',
  icon: 'Headset',
  href: ROUTES.support.index,
  accessKey: 'canAccessSupport',
  links: [
    { label: 'Support', href: ROUTES.support.index, icon: 'HelpCircle', description: 'Chat IA et assistance' },
  ],
};
