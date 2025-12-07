/**
 * Configuration des méga-menus pour la navigation horizontale
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
  {
    id: 'mon-agence',
    title: 'Mon Agence',
    description: 'Pilotage et gestion de votre agence',
    icon: 'Building2',
    moduleKey: 'pilotage_agence',
    accessKey: 'canAccessPilotageAgence',
    links: [
      { label: 'Vue d\'ensemble', href: ROUTES.pilotage.index, icon: 'LayoutDashboard', description: 'Dashboard agence' },
      { label: 'Mon équipe', href: ROUTES.pilotage.equipe, icon: 'Users', description: 'Collaborateurs et RH' },
      { label: 'Indicateurs généraux', href: ROUTES.pilotage.indicateurs, icon: 'BarChart3', description: 'KPI et métriques' },
      { label: 'Indicateurs Apporteurs', href: ROUTES.pilotage.indicateursApporteurs, icon: 'Handshake', description: 'CA par apporteur' },
      { label: 'Indicateurs Univers', href: ROUTES.pilotage.indicateursUnivers, icon: 'PieChart', description: 'CA par univers' },
      { label: 'Indicateurs Techniciens', href: ROUTES.pilotage.indicateursTechniciens, icon: 'Wrench', description: 'CA par technicien' },
      { label: 'Actions à Mener', href: ROUTES.pilotage.actions, icon: 'ListTodo', description: 'Tâches et suivis' },
      { label: 'Diffusion', href: ROUTES.pilotage.diffusion, icon: 'Tv', description: 'Mode TV agence' },
    ],
  },
  {
    id: 'rh',
    title: 'RH',
    description: 'Ressources humaines et documents',
    icon: 'Briefcase',
    moduleKey: 'rh',
    links: [
      { label: 'Mon Coffre RH', href: ROUTES.pilotage.monCoffreRh, icon: 'FolderOpen', description: 'Mes documents personnels' },
      { label: 'Demandes RH', href: ROUTES.pilotage.demandesRh, icon: 'FileText', description: 'Traiter les demandes', minRole: 'franchisee_admin' },
    ],
  },
  {
    id: 'tickets',
    title: 'Tickets',
    description: 'Support et gestion de projet',
    icon: 'Kanban',
    moduleKey: 'apogee_tickets',
    links: [
      { label: 'Kanban', href: ROUTES.projects.kanban, icon: 'Kanban', description: 'Vue tableau' },
      { label: 'Liste', href: ROUTES.projects.list, icon: 'ListTodo', description: 'Vue liste' },
      { label: 'Auto-Classeur', href: ROUTES.projects.autoClassify, icon: 'Sparkles', description: 'Classification IA' },
      { label: 'Doublons IA', href: ROUTES.projects.duplicates, icon: 'GitCompare', description: 'Détection doublons' },
    ],
  },
  {
    id: 'statia',
    title: 'StatIA',
    description: 'Intelligence statistique',
    icon: 'Brain',
    moduleKey: 'pilotage_agence',
    links: [
      { label: 'Dashboard StatIA', href: ROUTES.pilotage.statsHub, icon: 'BarChart3', description: 'Vue d\'ensemble' },
      { label: 'CA par Technicien', href: ROUTES.pilotage.indicateursTechniciens, icon: 'Wrench', description: 'Performance techniciens' },
      { label: 'CA par Univers', href: ROUTES.pilotage.indicateursUnivers, icon: 'PieChart', description: 'Répartition métiers' },
      { label: 'CA par Apporteur', href: ROUTES.pilotage.indicateursApporteurs, icon: 'Handshake', description: 'Sources d\'affaires' },
      { label: 'Indicateurs SAV', href: ROUTES.pilotage.indicateursSav, icon: 'LifeBuoy', description: 'Service après-vente' },
    ],
  },
  {
    id: 'academy',
    title: 'Academy',
    description: 'Formation et documentation',
    icon: 'GraduationCap',
    moduleKey: 'help_academy',
    accessKey: 'canAccessHelpAcademy',
    links: [
      { label: 'Guide Apogée', href: ROUTES.academy.apogee, icon: 'BookOpen', description: 'Maîtriser le logiciel' },
      { label: 'Guide Apporteurs', href: ROUTES.academy.apporteurs, icon: 'FileText', description: 'Ressources partenaires', badge: 'Bientôt', isDisabled: true },
      { label: 'Base Documentaire', href: ROUTES.academy.documents, icon: 'FolderOpen', description: 'Documents HelpConfort' },
    ],
  },
  {
    id: 'franchiseur',
    title: 'Franchiseur',
    description: 'Gestion du réseau',
    icon: 'Network',
    accessKey: 'canAccessFranchiseur',
    links: [
      { label: 'Dashboard Réseau', href: ROUTES.reseau.dashboard, icon: 'Network', description: 'Vue d\'ensemble' },
      { label: 'Agences', href: ROUTES.reseau.agences, icon: 'Building2', description: 'Gestion des agences' },
      { label: 'Animateurs', href: ROUTES.reseau.animateurs, icon: 'Users', description: 'Équipe animation', minRole: 'franchisor_admin' },
      { label: 'Tableaux', href: ROUTES.reseau.tableaux, icon: 'PieChart', description: 'Statistiques réseau' },
      { label: 'Périodes', href: ROUTES.reseau.periodes, icon: 'GitCompare', description: 'Comparatifs' },
      { label: 'Redevances', href: ROUTES.reseau.redevances, icon: 'Coins', description: 'Calcul royalties', minRole: 'franchisor_admin' },
    ],
  },
  {
    id: 'admin',
    title: 'Administration',
    description: 'Paramètres système',
    icon: 'Settings',
    accessKey: 'canAccessAdmin',
    links: [
      { label: 'Utilisateurs', href: ROUTES.admin.users, icon: 'Users', description: 'Comptes utilisateurs' },
      { label: 'Agences', href: ROUTES.admin.agencies, icon: 'Building2', description: 'Configuration agences' },
      { label: 'Annonces', href: ROUTES.admin.announcements, icon: 'MessageCircle', description: 'Communications' },
      { label: 'FAQ', href: ROUTES.admin.faq, icon: 'HelpCircle', description: 'Questions fréquentes' },
      { label: 'Helpi', href: ROUTES.admin.helpi, icon: 'Brain', description: 'Moteur IA' },
      { label: 'Sauvegardes', href: ROUTES.admin.backup, icon: 'Database', description: 'Backup données' },
      { label: 'Activité', href: ROUTES.admin.userActivity, icon: 'Activity', description: 'Logs utilisateurs' },
    ],
  },
];

export const SUPPORT_MENU: MegaMenuSection = {
  id: 'support',
  title: 'Support',
  description: 'Aide et assistance',
  icon: 'Headset',
  accessKey: 'canAccessSupport',
  links: [
    { label: 'Centre d\'aide', href: ROUTES.support.helpcenter, icon: 'HelpCircle', description: 'FAQ et chat' },
    { label: 'Mes demandes', href: ROUTES.support.userTickets, icon: 'LifeBuoy', description: 'Suivi tickets' },
    { label: 'Console Support', href: ROUTES.support.console, icon: 'Headset', description: 'Traitement demandes', requiresSupportConsoleUI: true },
  ],
};
