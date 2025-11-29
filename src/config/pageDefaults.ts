import { ROUTES } from '@/config/routes';

/**
 * Configuration centralisée des métadonnées par défaut des pages.
 * Source unique de vérité pour les titres et descriptions.
 */
export interface PageDefaultConfig {
  pageKey: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  route: string;
}

export const PAGE_DEFAULTS: PageDefaultConfig[] = [
  // Home
  { pageKey: 'home', defaultTitle: 'Tableau de bord', route: ROUTES.home },
  
  // Help Academy
  { pageKey: 'academy_index', defaultTitle: 'Help! Academy', defaultSubtitle: 'Accédez à tous les guides et ressources', route: ROUTES.academy.index },
  { pageKey: 'academy_apogee', defaultTitle: 'Guide Apogée', defaultSubtitle: 'Tout ce que vous devez savoir sur l\'utilisation d\'Apogée', route: ROUTES.academy.apogee },
  { pageKey: 'academy_apporteurs', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Ressources pour les apporteurs d\'affaires', route: ROUTES.academy.apporteurs },
  { pageKey: 'academy_documents', defaultTitle: 'Base Documentaire', defaultSubtitle: 'Documents et ressources HelpConfort', route: ROUTES.academy.documents },
  
  // Pilotage Agence
  { pageKey: 'pilotage_index', defaultTitle: 'Pilotage Agence', defaultSubtitle: 'Gérez votre activité au quotidien', route: ROUTES.pilotage.index },
  { pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux', defaultSubtitle: 'Suivez vos principaux KPI agence', route: ROUTES.pilotage.indicateurs },
  { pageKey: 'pilotage_indicateurs_apporteurs', defaultTitle: 'Indicateurs Apporteurs', defaultSubtitle: 'Performance de vos apporteurs d\'affaires', route: ROUTES.pilotage.indicateursApporteurs },
  { pageKey: 'pilotage_indicateurs_univers', defaultTitle: 'Indicateurs Univers', defaultSubtitle: 'Répartition par univers de métier', route: ROUTES.pilotage.indicateursUnivers },
  { pageKey: 'pilotage_indicateurs_techniciens', defaultTitle: 'Indicateurs Techniciens', defaultSubtitle: 'Performance de vos techniciens', route: ROUTES.pilotage.indicateursTechniciens },
  { pageKey: 'pilotage_indicateurs_sav', defaultTitle: 'Indicateurs SAV', defaultSubtitle: 'Suivi du service après-vente', route: ROUTES.pilotage.indicateursSav },
  { pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener', defaultSubtitle: 'Suivi des actions et tâches en cours', route: ROUTES.pilotage.actions },
  { pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion', defaultSubtitle: 'Affichage TV pour l\'agence', route: ROUTES.pilotage.diffusion },
  { pageKey: 'pilotage_rh_tech', defaultTitle: 'RH Tech', defaultSubtitle: 'Planning hebdomadaire des techniciens', route: ROUTES.pilotage.rhTech },
  { pageKey: 'pilotage_equipe', defaultTitle: 'Mon équipe', defaultSubtitle: 'Gestion des collaborateurs de l\'agence', route: ROUTES.pilotage.equipe },
  
  // Support
  { pageKey: 'support_index', defaultTitle: 'Support', defaultSubtitle: 'Assistance et demandes', route: ROUTES.support.index },
  { pageKey: 'support_mes_demandes', defaultTitle: 'Mes Demandes', defaultSubtitle: 'Créer et suivre vos demandes de support', route: ROUTES.support.userTickets },
  { pageKey: 'support_console', defaultTitle: 'Console Support', defaultSubtitle: 'Traiter les demandes de support', route: ROUTES.support.console },
  
  // Réseau Franchiseur
  { pageKey: 'reseau_index', defaultTitle: 'Réseau Franchiseur', defaultSubtitle: 'Pilotage du réseau HelpConfort', route: ROUTES.reseau.index },
  { pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau', defaultSubtitle: 'Vue d\'ensemble du réseau', route: ROUTES.reseau.dashboard },
  { pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau', defaultSubtitle: 'Gestion des agences franchisées', route: ROUTES.reseau.agences },
  { pageKey: 'reseau_animateurs', defaultTitle: 'Gestion Animateurs', defaultSubtitle: 'Équipe d\'animation réseau', route: ROUTES.reseau.animateurs },
  { pageKey: 'reseau_stats', defaultTitle: 'Statistiques Réseau', defaultSubtitle: 'KPI consolidés du réseau', route: ROUTES.reseau.stats },
  { pageKey: 'reseau_comparatifs', defaultTitle: 'Comparatifs', defaultSubtitle: 'Comparaison entre agences', route: ROUTES.reseau.comparatifs },
  { pageKey: 'reseau_redevances', defaultTitle: 'Redevances', defaultSubtitle: 'Calcul et suivi des redevances', route: ROUTES.reseau.redevances },
  
  // Administration
  { pageKey: 'admin_index', defaultTitle: 'Administration', defaultSubtitle: 'Configuration du système', route: ROUTES.admin.index },
  { pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs', defaultSubtitle: 'Comptes et permissions', route: ROUTES.admin.users },
  { pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences', defaultSubtitle: 'Configuration des agences', route: ROUTES.admin.agencies },
  { pageKey: 'admin_backup', defaultTitle: 'Sauvegardes', defaultSubtitle: 'Export et import des données', route: ROUTES.admin.backup },
  { pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages', defaultSubtitle: 'Gérez les titres, descriptions et labels de menu de toutes les pages', route: ROUTES.admin.pageMetadata },
];

/**
 * Map pour accès rapide par pageKey
 */
export const PAGE_DEFAULTS_BY_KEY = new Map(
  PAGE_DEFAULTS.map(p => [p.pageKey, p])
);

/**
 * Map pour accès rapide par route
 */
export const PAGE_DEFAULTS_BY_ROUTE = new Map(
  PAGE_DEFAULTS.map(p => [p.route, p])
);

/**
 * Obtenir la config par défaut d'une page via son pageKey
 */
export function getPageDefaultByKey(pageKey: string): PageDefaultConfig | undefined {
  return PAGE_DEFAULTS_BY_KEY.get(pageKey);
}

/**
 * Obtenir la config par défaut d'une page via sa route
 */
export function getPageDefaultByRoute(route: string): PageDefaultConfig | undefined {
  return PAGE_DEFAULTS_BY_ROUTE.get(route);
}

/**
 * Configuration pour le header unifié avec matchers de route
 */
export interface PageHeaderConfig {
  match: (path: string) => boolean;
  pageKey: string;
  defaultTitle: string;
  defaultSubtitle?: string;
  icon?: string; // Nom de l'icône Lucide
}

/**
 * Configuration de matching pour UnifiedHeader.
 * L'ordre est important : les routes plus spécifiques doivent être en premier.
 */
export const PAGE_HEADER_MATCHERS: PageHeaderConfig[] = [
  // Pilotage - Indicateurs (sous-routes d'abord)
  { match: (path) => path === '/hc-agency/indicateurs' || path.startsWith('/hc-agency/indicateurs/'), pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux', defaultSubtitle: 'Suivez vos principaux KPI agence', icon: 'BarChart3' },
  { match: (path) => path === '/hc-agency/actions', pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener', defaultSubtitle: 'Suivi des actions et tâches en cours', icon: 'CheckSquare' },
  { match: (path) => path === '/hc-agency/diffusion', pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion', defaultSubtitle: 'Affichage TV pour l\'agence', icon: 'Tv' },
  { match: (path) => path === '/hc-agency/rh-tech', pageKey: 'pilotage_rh_tech', defaultTitle: 'RH Tech', defaultSubtitle: 'Planning hebdomadaire des techniciens', icon: 'CalendarDays' },
  { match: (path) => path === '/hc-agency/equipe', pageKey: 'pilotage_equipe', defaultTitle: 'Mon équipe', defaultSubtitle: 'Gestion des collaborateurs de l\'agence', icon: 'Users' },
  { match: (path) => path === '/hc-agency', pageKey: 'pilotage_index', defaultTitle: 'Pilotage Agence', defaultSubtitle: 'Gérez votre activité au quotidien', icon: 'Gauge' },
  
  // Help Academy
  { match: (path) => path.startsWith('/academy/apogee'), pageKey: 'academy_apogee', defaultTitle: 'Guide Apogée', defaultSubtitle: 'Tout ce que vous devez savoir sur l\'utilisation d\'Apogée', icon: 'BookOpen' },
  { match: (path) => path.startsWith('/academy/apporteurs'), pageKey: 'academy_apporteurs', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Ressources pour les apporteurs d\'affaires', icon: 'Handshake' },
  { match: (path) => path.startsWith('/academy/hc-base'), pageKey: 'academy_documents', defaultTitle: 'Base Documentaire', defaultSubtitle: 'Documents et ressources HelpConfort', icon: 'FolderOpen' },
  { match: (path) => path === '/academy', pageKey: 'academy_index', defaultTitle: 'Help! Academy', defaultSubtitle: 'Accédez à tous les guides et ressources', icon: 'GraduationCap' },
  
  // Support
  { match: (path) => path === '/support/mes-demandes', pageKey: 'support_mes_demandes', defaultTitle: 'Mes Demandes', defaultSubtitle: 'Créer et suivre vos demandes de support', icon: 'MessageSquare' },
  { match: (path) => path === '/support/console', pageKey: 'support_console', defaultTitle: 'Console Support', defaultSubtitle: 'Traiter les demandes de support', icon: 'Headset' },
  { match: (path) => path === '/support', pageKey: 'support_index', defaultTitle: 'Support', defaultSubtitle: 'Assistance et demandes', icon: 'LifeBuoy' },
  
  // Réseau Franchiseur
  { match: (path) => path === '/hc-reseau/dashboard', pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau', defaultSubtitle: 'Vue d\'ensemble du réseau', icon: 'LayoutDashboard' },
  { match: (path) => path === '/hc-reseau/agences', pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau', defaultSubtitle: 'Gestion des agences franchisées', icon: 'Building2' },
  { match: (path) => path === '/hc-reseau/animateurs', pageKey: 'reseau_animateurs', defaultTitle: 'Gestion Animateurs', defaultSubtitle: 'Équipe d\'animation réseau', icon: 'UserCog' },
  { match: (path) => path === '/hc-reseau/stats', pageKey: 'reseau_stats', defaultTitle: 'Statistiques Réseau', defaultSubtitle: 'KPI consolidés du réseau', icon: 'PieChart' },
  { match: (path) => path === '/hc-reseau/comparatifs', pageKey: 'reseau_comparatifs', defaultTitle: 'Comparatifs', defaultSubtitle: 'Comparaison entre agences', icon: 'GitCompare' },
  { match: (path) => path === '/hc-reseau/redevances', pageKey: 'reseau_redevances', defaultTitle: 'Redevances', defaultSubtitle: 'Calcul et suivi des redevances', icon: 'Calculator' },
  { match: (path) => path === '/hc-reseau', pageKey: 'reseau_index', defaultTitle: 'Réseau Franchiseur', defaultSubtitle: 'Pilotage du réseau HelpConfort', icon: 'Network' },
  
  // Admin
  { match: (path) => path === '/admin/users', pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs', defaultSubtitle: 'Comptes et permissions', icon: 'Users' },
  { match: (path) => path === '/admin/agencies', pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences', defaultSubtitle: 'Configuration des agences', icon: 'Building' },
  { match: (path) => path === '/admin/backup', pageKey: 'admin_backup', defaultTitle: 'Sauvegarde & Restauration', defaultSubtitle: 'Export et import des données', icon: 'Database' },
  { match: (path) => path === '/admin/page-metadata', pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages', defaultSubtitle: 'Gérez les titres, descriptions et labels de menu de toutes les pages', icon: 'FileText' },
  { match: (path) => path === '/admin', pageKey: 'admin_index', defaultTitle: 'Administration', defaultSubtitle: 'Configuration du système', icon: 'Settings' },
  
  // Home
  { match: (path) => path === '/', pageKey: 'home', defaultTitle: 'Tableau de bord', icon: 'Home' },
];

/**
 * Obtenir la config de page pour un chemin donné
 */
export function getPageConfigByPath(pathname: string): PageHeaderConfig | null {
  return PAGE_HEADER_MATCHERS.find(config => config.match(pathname)) || null;
}
