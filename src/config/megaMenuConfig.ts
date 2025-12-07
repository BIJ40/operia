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
  section?: 'salarie' | 'dirigeant';
}

export interface MegaMenuSection {
  id: string;
  title: string;
  description?: string;
  icon: string;
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
    moduleKey: 'pilotage_agence',
    accessKey: 'canAccessPilotageAgence',
    links: [
      { label: 'Vue d\'ensemble', href: ROUTES.pilotage.index, icon: 'LayoutDashboard', description: 'Dashboard agence', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Apporteurs', href: ROUTES.pilotage.indicateursApporteurs, icon: 'Handshake', description: 'CA par apporteur', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Univers', href: ROUTES.pilotage.indicateursUnivers, icon: 'PieChart', description: 'CA par univers', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Techniciens', href: ROUTES.pilotage.indicateursTechniciens, icon: 'Wrench', description: 'CA par technicien', minRole: 'franchisee_admin' },
      { label: 'Indicateurs SAV', href: ROUTES.pilotage.indicateursSav, icon: 'LifeBuoy', description: 'Service après-vente', minRole: 'franchisee_admin' },
      { label: 'Actions à Mener', href: ROUTES.pilotage.actions, icon: 'ListTodo', description: 'Tâches opérationnelles', minRole: 'franchisee_admin' },
      { label: 'Diffusion', href: ROUTES.pilotage.diffusion, icon: 'Tv', description: 'Mode TV agence', minRole: 'franchisee_admin' },
    ],
  },

  // ============================================
  // RH (Ressources Humaines)
  // Module: rh
  // Scindé en 2 vues: Salarié (N1) et Dirigeant (N2)
  // ============================================
  {
    id: 'rh',
    title: 'RH',
    description: 'Ressources humaines',
    icon: 'Briefcase',
    moduleKey: 'rh',
    links: [
      // === Vue Salarié (N1 ou N2 avec is_salaried_manager) ===
      { 
        label: 'Mon Coffre RH', 
        href: ROUTES.pilotage.monCoffreRh, 
        icon: 'FolderOpen', 
        description: 'Mes documents personnels',
        section: 'salarie',
        requiresOption: { module: 'rh', option: 'coffre' },
      },
      { 
        label: 'Demande de congé', 
        href: ROUTES.pilotage.faireUneDemande, 
        icon: 'CalendarDays', 
        description: 'Poser une demande',
        section: 'salarie',
        requiresOption: { module: 'rh', option: 'coffre' },
      },
      // === Vue Dirigeant (N2+) ===
      { 
        label: 'Mon équipe', 
        href: ROUTES.pilotage.collaborateurs, 
        icon: 'Users', 
        description: 'Collaborateurs et RH',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_viewer' },
      },
      { 
        label: 'Demandes RH', 
        href: ROUTES.pilotage.demandesRh, 
        icon: 'FileText', 
        description: 'Traiter les demandes',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_admin' },
      },
      { 
        label: 'Dashboard RH', 
        href: ROUTES.pilotage.dashboardRh, 
        icon: 'BarChart3', 
        description: 'Statistiques RH',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_admin' },
      },
      { 
        label: 'Gestion congés', 
        href: ROUTES.pilotage.gestionConges, 
        icon: 'Calendar', 
        description: 'Validation des congés',
        section: 'dirigeant',
        minRole: 'franchisee_admin',
        requiresOption: { module: 'rh', option: 'rh_admin' },
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
    moduleKey: 'help_academy',
    accessKey: 'canAccessHelpAcademy',
    links: [
      { label: 'Guide Apogée', href: ROUTES.academy.apogee, icon: 'BookOpen', description: 'Maîtriser le logiciel' },
      { label: 'Guide Apporteurs', href: ROUTES.academy.apporteurs, icon: 'FileText', description: 'Ressources partenaires', minRole: 'franchisee_user' },
      { label: 'Base Documentaire', href: ROUTES.academy.documents, icon: 'FolderOpen', description: 'Documents HelpConfort' },
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
    moduleKey: 'apogee_tickets',
    links: [
      { label: 'Kanban', href: ROUTES.projects.kanban, icon: 'Kanban', description: 'Vue tableau' },
      { label: 'Liste', href: ROUTES.projects.list, icon: 'ListTodo', description: 'Vue liste' },
      { label: 'Auto-Classeur', href: ROUTES.projects.autoClassify, icon: 'Sparkles', description: 'Classification IA', minRole: 'franchisor_user' },
      { label: 'Doublons IA', href: ROUTES.projects.duplicates, icon: 'GitCompare', description: 'Détection doublons', minRole: 'franchisor_user' },
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
    accessKey: 'canAccessFranchiseur',
    links: [
      { label: 'Dashboard Réseau', href: ROUTES.reseau.dashboard, icon: 'Network', description: 'Vue d\'ensemble', minRole: 'franchisor_user' },
      { label: 'Agences', href: ROUTES.reseau.agences, icon: 'Building2', description: 'Gestion des agences', minRole: 'franchisor_user' },
      { label: 'Animateurs', href: ROUTES.reseau.animateurs, icon: 'Users', description: 'Équipe animation', minRole: 'franchisor_admin' },
      { label: 'Tableaux', href: ROUTES.reseau.tableaux, icon: 'PieChart', description: 'Statistiques réseau', minRole: 'franchisor_user' },
      { label: 'Périodes', href: ROUTES.reseau.periodes, icon: 'GitCompare', description: 'Comparatifs temporels', minRole: 'franchisor_user' },
      { label: 'Comparatif Agences', href: ROUTES.reseau.comparatif, icon: 'BarChart3', description: 'Benchmark', minRole: 'franchisor_user' },
      { label: 'Redevances', href: ROUTES.reseau.redevances, icon: 'Coins', description: 'Calcul royalties', minRole: 'franchisor_admin' },
    ],
  },

  // ============================================
  // ADMINISTRATION (N5+)
  // Module: admin_plateforme
  // ============================================
  {
    id: 'admin',
    title: 'Administration',
    description: 'Paramètres système',
    icon: 'Settings',
    accessKey: 'canAccessAdmin',
    links: [
      { label: 'Utilisateurs', href: ROUTES.admin.users, icon: 'Users', description: 'Comptes utilisateurs', minRole: 'platform_admin' },
      { label: 'Agences', href: ROUTES.admin.agencies, icon: 'Building2', description: 'Configuration agences', minRole: 'platform_admin' },
      { label: 'Annonces', href: ROUTES.admin.announcements, icon: 'MessageCircle', description: 'Communications', minRole: 'platform_admin' },
      { label: 'FAQ', href: ROUTES.admin.faq, icon: 'HelpCircle', description: 'Questions fréquentes', minRole: 'platform_admin' },
      { label: 'Helpi', href: ROUTES.admin.helpi, icon: 'Brain', description: 'Moteur IA', minRole: 'platform_admin' },
      { label: 'Sauvegardes', href: ROUTES.admin.backup, icon: 'Database', description: 'Backup données', minRole: 'platform_admin' },
      { label: 'Activité', href: ROUTES.admin.userActivity, icon: 'Activity', description: 'Logs utilisateurs', minRole: 'superadmin' },
      { label: 'System Health', href: ROUTES.admin.systemHealth, icon: 'HeartPulse', description: 'Monitoring Sentry', minRole: 'superadmin' },
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
  accessKey: 'canAccessSupport',
  links: [
    { label: 'Centre d\'aide', href: ROUTES.support.helpcenter, icon: 'HelpCircle', description: 'FAQ et chat' },
    { label: 'Mes demandes', href: ROUTES.support.userTickets, icon: 'LifeBuoy', description: 'Suivi tickets' },
    { label: 'Console Support', href: ROUTES.support.console, icon: 'Headset', description: 'Traitement demandes', requiresSupportConsoleUI: true, minRole: 'franchisor_user' },
  ],
};
