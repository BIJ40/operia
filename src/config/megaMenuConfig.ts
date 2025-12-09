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
    href: ROUTES.pilotage.index,
    moduleKey: 'pilotage_agence',
    accessKey: 'canAccessPilotageAgence',
    links: [
      { label: 'Vue d\'ensemble', href: ROUTES.pilotage.index, icon: 'LayoutDashboard', description: 'Dashboard agence', minRole: 'franchisee_admin' },
      { label: 'Hub Statistiques', href: ROUTES.pilotage.statsHub, icon: 'BarChart2', description: 'Centre statistiques', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Apporteurs', href: ROUTES.pilotage.indicateursApporteurs, icon: 'Handshake', description: 'CA par apporteur', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Univers', href: ROUTES.pilotage.indicateursUnivers, icon: 'PieChart', description: 'CA par univers', minRole: 'franchisee_admin' },
      { label: 'Indicateurs Techniciens', href: ROUTES.pilotage.indicateursTechniciens, icon: 'Wrench', description: 'CA par technicien', minRole: 'franchisee_admin' },
      { label: 'Indicateurs SAV', href: ROUTES.pilotage.indicateursSav, icon: 'LifeBuoy', description: 'Service après-vente', minRole: 'franchisee_admin' },
      { label: 'Actions à Mener', href: ROUTES.pilotage.actions, icon: 'ListTodo', description: 'Tâches opérationnelles', minRole: 'franchisee_admin' },
      { label: 'Diffusion', href: ROUTES.pilotage.diffusion, icon: 'Tv', description: 'Mode TV agence', minRole: 'franchisee_admin' },
      { label: 'StatIA Builder', href: ROUTES.pilotage.statiaBuilder, icon: 'Sparkles', description: 'Créer des métriques', minRole: 'franchisee_admin' },
      { label: 'Maintenance', href: ROUTES.pilotage.maintenance, icon: 'Wrench', description: 'Maintenance préventive', minRole: 'franchisee_admin' },
      { label: 'Commercial', href: ROUTES.pilotage.commercial, icon: 'Briefcase', description: 'Outils commerciaux', minRole: 'franchisee_admin' },
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
    href: '/rh',
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
    href: ROUTES.academy.index,
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
    href: ROUTES.projects.index,
    moduleKey: 'apogee_tickets',
    links: [
      { label: 'Kanban', href: ROUTES.projects.kanban, icon: 'Kanban', description: 'Vue tableau' },
      { label: 'Liste', href: ROUTES.projects.list, icon: 'ListTodo', description: 'Vue liste' },
      { label: 'Import', href: ROUTES.projects.import, icon: 'Upload', description: 'Importer tickets', minRole: 'franchisor_user' },
      { label: 'Tickets incomplets', href: ROUTES.projects.incomplete, icon: 'AlertCircle', description: 'À compléter', minRole: 'franchisor_user' },
      { label: 'Classification', href: ROUTES.projects.classify, icon: 'Tags', description: 'Classifier tickets', minRole: 'franchisor_user' },
      { label: 'Revue', href: ROUTES.projects.review, icon: 'CheckCircle', description: 'Revoir tickets', minRole: 'franchisor_user' },
      { label: 'Permissions', href: ROUTES.projects.permissions, icon: 'Shield', description: 'Gérer droits', minRole: 'franchisor_admin' },
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
  // ============================================
  {
    id: 'admin',
    title: 'Administration',
    description: 'Paramètres système',
    icon: 'Settings',
    href: ROUTES.admin.index,
    accessKey: 'canAccessAdmin',
    links: [
      // Groupe: Utilisateurs & Agences
      { label: 'Utilisateurs', href: ROUTES.admin.users, icon: 'Users', description: 'Comptes utilisateurs', minRole: 'platform_admin', group: 'users' },
      { label: 'Agences', href: ROUTES.admin.agencies, icon: 'Building2', description: 'Configuration agences', minRole: 'platform_admin', group: 'users' },
      { label: 'Gestion Widgets', href: ROUTES.admin.widgets, icon: 'LayoutGrid', description: 'Permissions widgets', minRole: 'platform_admin', group: 'users' },
      // Groupe: Contenu
      { label: 'Annonces', href: ROUTES.admin.announcements, icon: 'MessageCircle', description: 'Communications', minRole: 'platform_admin', group: 'content' },
      { label: 'FAQ', href: ROUTES.admin.faq, icon: 'HelpCircle', description: 'Questions fréquentes', minRole: 'platform_admin', group: 'content' },
      { label: 'Guides Apogée', href: ROUTES.admin.apogeeGuides, icon: 'BookOpen', description: 'Gestion guides', minRole: 'platform_admin', group: 'content' },
      { label: 'Documents', href: ROUTES.admin.documents, icon: 'FolderOpen', description: 'Gestion documents', minRole: 'platform_admin', group: 'content' },
      // Groupe: IA & Métriques
      { label: 'Helpi', href: ROUTES.admin.helpi, icon: 'Brain', description: 'Moteur IA', minRole: 'platform_admin', group: 'ai' },
      { label: 'StatIA-BY-BIJ', href: ROUTES.admin.statia, icon: 'BarChart', description: 'Moteur métriques', minRole: 'platform_admin', group: 'ai' },
      { label: 'Générateur Formation', href: ROUTES.admin.formationGenerator, icon: 'Sparkles', description: 'Résumés IA', minRole: 'platform_admin', group: 'ai' },
      // Groupe: Système
      { label: 'Métadonnées Pages', href: ROUTES.admin.pageMetadata, icon: 'FileCode', description: 'SEO pages', minRole: 'platform_admin', group: 'system' },
      { label: 'Quotas Stockage', href: ROUTES.admin.storageQuota, icon: 'HardDrive', description: 'Espace disque', minRole: 'platform_admin', group: 'system' },
      { label: 'Sauvegardes', href: ROUTES.admin.backup, icon: 'Database', description: 'Backup données', minRole: 'platform_admin', group: 'system' },
      { label: 'Cache Backup', href: ROUTES.admin.cacheBackup, icon: 'Archive', description: 'Cache système', minRole: 'platform_admin', group: 'system' },
      { label: 'Backup HelpConfort', href: ROUTES.admin.helpconfortBackup, icon: 'Archive', description: 'Backup HC', minRole: 'platform_admin', group: 'system' },
      // Groupe: Support
      { label: 'Support Tickets', href: ROUTES.admin.supportTickets, icon: 'Ticket', description: 'Admin tickets', minRole: 'platform_admin', group: 'support' },
      { label: 'Stats Support', href: ROUTES.admin.supportStats, icon: 'TrendingUp', description: 'Métriques support', minRole: 'platform_admin', group: 'support' },
      { label: 'Historique Escalade', href: ROUTES.admin.escalationHistory, icon: 'History', description: 'Escalations', minRole: 'platform_admin', group: 'support' },
      // Groupe: Monitoring
      { label: 'Activité', href: ROUTES.admin.userActivity, icon: 'Activity', description: 'Logs utilisateurs', minRole: 'superadmin', group: 'monitoring' },
      { label: 'System Health', href: ROUTES.admin.systemHealth, icon: 'HeartPulse', description: 'Monitoring Sentry', minRole: 'superadmin', group: 'monitoring' },
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
    { label: 'Console Support', href: ROUTES.support.console, icon: 'Headset', description: 'Traitement demandes', requiresSupportConsoleUI: true, minRole: 'franchisor_user' },
  ],
};
