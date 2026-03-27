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
  
  // Mon Agence
  { pageKey: 'pilotage_index', defaultTitle: 'Mon Agence', defaultSubtitle: 'Gérez votre activité au quotidien', route: ROUTES.agency.index },
  { pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux', defaultSubtitle: 'Suivez vos principaux KPI agence', route: ROUTES.agency.indicateurs },
  { pageKey: 'pilotage_indicateurs_apporteurs', defaultTitle: 'Indicateurs Apporteurs', defaultSubtitle: 'Performance de vos apporteurs d\'affaires', route: ROUTES.agency.indicateursApporteurs },
  { pageKey: 'pilotage_indicateurs_univers', defaultTitle: 'Indicateurs Univers', defaultSubtitle: 'Répartition par univers de métier', route: ROUTES.agency.indicateursUnivers },
  { pageKey: 'pilotage_indicateurs_techniciens', defaultTitle: 'Indicateurs Techniciens', defaultSubtitle: 'Performance de vos techniciens', route: ROUTES.agency.indicateursTechniciens },
  { pageKey: 'pilotage_indicateurs_sav', defaultTitle: 'Indicateurs SAV', defaultSubtitle: 'Suivi du service après-vente', route: ROUTES.agency.indicateursSav },
  { pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener', defaultSubtitle: 'Suivi des actions et tâches en cours', route: ROUTES.agency.actions },
  { pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion', defaultSubtitle: 'Affichage TV pour l\'agence', route: ROUTES.agency.diffusion },
  { pageKey: 'pilotage_rh_tech', defaultTitle: 'RH Tech', defaultSubtitle: 'Planning hebdomadaire des techniciens', route: ROUTES.agency.rhTech },
  // Portail salarié supprimé - lignes rh_coffre, rh_demandes, rh_dashboard, rh_conges retirées
  
  // Support
  { pageKey: 'support_index', defaultTitle: 'Support', defaultSubtitle: 'Assistance et demandes', route: ROUTES.support.index },
  { pageKey: 'support_mes_demandes', defaultTitle: 'Mes demandes', defaultSubtitle: 'Créer et suivre vos demandes de support', route: ROUTES.support.userTickets },
  { pageKey: 'support_console', defaultTitle: 'Console support', defaultSubtitle: 'Traiter les demandes de support', route: ROUTES.support.console },
  
  // Espace Franchiseur
  { pageKey: 'reseau_index', defaultTitle: 'Espace Franchiseur', defaultSubtitle: 'Pilotage du réseau HelpConfort', route: ROUTES.reseau.index },
  { pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau', defaultSubtitle: 'Vue d\'ensemble du réseau', route: ROUTES.reseau.dashboard },
  { pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau', defaultSubtitle: 'Gestion des agences franchisées', route: ROUTES.reseau.agences },
  
  { pageKey: 'reseau_stats', defaultTitle: 'Tableaux Réseau', defaultSubtitle: 'KPI consolidés du réseau', route: ROUTES.reseau.tableaux },
  { pageKey: 'reseau_periodes', defaultTitle: 'Périodes', defaultSubtitle: 'Comparaison entre agences', route: ROUTES.reseau.periodes },
  { pageKey: 'reseau_redevances', defaultTitle: 'Redevances', defaultSubtitle: 'Calcul et suivi des redevances', route: ROUTES.reseau.redevances },
  
  // Administration
  { pageKey: 'admin_index', defaultTitle: 'Administration', defaultSubtitle: 'Configuration du système', route: ROUTES.admin.index },
  { pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs', defaultSubtitle: 'Comptes et permissions', route: ROUTES.admin.users },
  { pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences', defaultSubtitle: 'Configuration des agences', route: ROUTES.admin.agencies },
  { pageKey: 'admin_backup', defaultTitle: 'Sauvegardes', defaultSubtitle: 'Export et import des données', route: ROUTES.admin.backup },
  { pageKey: 'admin_user_activity', defaultTitle: 'Activité Utilisateurs', defaultSubtitle: 'Historique des connexions', route: ROUTES.admin.userActivity },
  { pageKey: 'admin_support_stats', defaultTitle: 'Statistiques Support', defaultSubtitle: 'Métriques et indicateurs du support', route: ROUTES.admin.supportStats },
  { pageKey: 'admin_escalation_history', defaultTitle: 'Historique Escalades', defaultSubtitle: 'Suivi des escalades de tickets', route: ROUTES.admin.escalationHistory },
  { pageKey: 'admin_documents', defaultTitle: 'Documents RAG', defaultSubtitle: 'Base documentaire pour Mme MICHU', route: ROUTES.admin.documents },
  { pageKey: 'admin_storage_quota', defaultTitle: 'Stockage', defaultSubtitle: 'Surveillance des quotas de stockage', route: ROUTES.admin.storageQuota },
  { pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages', defaultSubtitle: 'Gérez les titres, descriptions et labels de menu', route: ROUTES.admin.pageMetadata },
  { pageKey: 'admin_announcements', defaultTitle: 'Annonces Prioritaires', defaultSubtitle: 'Diffusez des informations importantes à vos utilisateurs', route: ROUTES.admin.announcements },
  
  // Gestion de Projet
  { pageKey: 'projects_index', defaultTitle: 'Gestion de Projet', defaultSubtitle: 'Gérez le backlog et le suivi de développement', route: ROUTES.projects.index },
  { pageKey: 'projects_kanban', defaultTitle: 'Kanban Projet', defaultSubtitle: 'Vue Kanban des tickets projet', route: ROUTES.projects.kanban },
  { pageKey: 'projects_incomplete', defaultTitle: 'Tickets Incomplets', defaultSubtitle: 'Tickets nécessitant des informations', route: ROUTES.projects.incomplete },
  { pageKey: 'projects_review', defaultTitle: 'Review', defaultSubtitle: 'Revue des tickets qualifiés', route: ROUTES.projects.review },
  { pageKey: 'projects_permissions', defaultTitle: 'Permissions', defaultSubtitle: 'Gérer les rôles et permissions projet', route: ROUTES.projects.permissions },
  
  // User
  { pageKey: 'profile', defaultTitle: 'Mon Compte', defaultSubtitle: 'Gérez vos informations personnelles', route: ROUTES.profile },
  { pageKey: 'changelog', defaultTitle: 'Historique des versions', defaultSubtitle: 'Nouveautés et améliorations de l\'application', route: ROUTES.changelog },
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
  parentRoute?: string; // Route parent pour le bouton retour
  parentLabel?: string; // Label du bouton retour
}

/**
 * Configuration de matching pour UnifiedHeader.
 * L'ordre est important : les routes plus spécifiques doivent être en premier.
 */
export const PAGE_HEADER_MATCHERS: PageHeaderConfig[] = [
  // ============================================
  // PILOTAGE AGENCE
  // ============================================
  // Statistiques et sous-indicateurs (plus spécifiques d'abord)
  { match: (path) => path === '/agency/statistiques/apporteurs', pageKey: 'pilotage_indicateurs_apporteurs', defaultTitle: 'Indicateurs Apporteurs', defaultSubtitle: 'Performance de vos apporteurs d\'affaires', icon: 'Users', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/statistiques/univers', pageKey: 'pilotage_indicateurs_univers', defaultTitle: 'Indicateurs Univers', defaultSubtitle: 'Répartition par univers de métier', icon: 'Building2', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/statistiques/techniciens', pageKey: 'pilotage_indicateurs_techniciens', defaultTitle: 'Indicateurs Techniciens', defaultSubtitle: 'Performance de vos techniciens', icon: 'CalendarDays', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/statistiques/sav', pageKey: 'pilotage_indicateurs_sav', defaultTitle: 'Indicateurs SAV', defaultSubtitle: 'Suivi du service après-vente', icon: 'LifeBuoy', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/statistiques', pageKey: 'pilotage_statistiques', defaultTitle: 'Statistiques', defaultSubtitle: 'Accédez à l\'ensemble des indicateurs de votre agence', icon: 'PieChart', parentRoute: '/agency', parentLabel: 'Mon Agence' },
  
  // Indicateurs (routes /agency/indicateurs/*)
  { match: (path) => path === '/agency/indicateurs/apporteurs', pageKey: 'pilotage_indicateurs_apporteurs', defaultTitle: 'Indicateurs Apporteurs', defaultSubtitle: 'Performance de vos apporteurs d\'affaires', icon: 'Users', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/indicateurs/univers', pageKey: 'pilotage_indicateurs_univers', defaultTitle: 'Indicateurs Univers', defaultSubtitle: 'Répartition par univers de métier', icon: 'Building2', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/indicateurs/techniciens', pageKey: 'pilotage_indicateurs_techniciens', defaultTitle: 'Indicateurs Techniciens', defaultSubtitle: 'Performance de vos techniciens', icon: 'CalendarDays', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/indicateurs/sav', pageKey: 'pilotage_indicateurs_sav', defaultTitle: 'Indicateurs SAV', defaultSubtitle: 'Suivi du service après-vente', icon: 'LifeBuoy', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency/indicateurs', pageKey: 'pilotage_indicateurs', defaultTitle: 'Indicateurs généraux', defaultSubtitle: 'Suivez vos principaux KPI agence', icon: 'BarChart3', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  
  // Autres pages Pilotage
  { match: (path) => path.startsWith('/agency/actions/category/'), pageKey: 'pilotage_actions_category', defaultTitle: 'Détail Actions', defaultSubtitle: 'Actions par catégorie', icon: 'CheckSquare', parentRoute: '/agency/actions', parentLabel: 'Actions' },
  { match: (path) => path === '/agency/actions', pageKey: 'pilotage_actions', defaultTitle: 'Actions à Mener', defaultSubtitle: 'Suivi des actions et tâches en cours', icon: 'CheckSquare', parentRoute: '/agency', parentLabel: 'Mon Agence' },
  { match: (path) => path === '/agency/diffusion', pageKey: 'pilotage_diffusion', defaultTitle: 'Mode Diffusion', defaultSubtitle: 'Affichage TV pour l\'agence', icon: 'Tv', parentRoute: '/agency/statistiques', parentLabel: 'Statistiques' },
  { match: (path) => path === '/agency', pageKey: 'pilotage_index', defaultTitle: 'Mon Agence', defaultSubtitle: 'Gérez votre activité au quotidien', icon: 'Gauge', parentRoute: '/', parentLabel: 'Accueil' },
  // RH Routes (toutes sous /rh/)
  { match: (path) => path === '/rh/equipe', pageKey: 'rh_equipe_redirect', defaultTitle: 'Suivi RH', defaultSubtitle: 'Redirection vers Suivi RH', icon: 'Users', parentRoute: '/rh', parentLabel: 'RH' },
  { match: (path) => path === '/rh/suivi/plannings', pageKey: 'rh_plannings', defaultTitle: 'Plannings Techniciens', defaultSubtitle: 'Visualisez les plannings hebdomadaires', icon: 'Calendar', parentRoute: '/rh/suivi', parentLabel: 'Suivi RH' },
  { match: (path) => path.startsWith('/rh/suivi/') && path !== '/rh/suivi/plannings' && path !== '/rh/suivi/heures', pageKey: 'rh_collaborateur_profile', defaultTitle: 'Fiche collaborateur', defaultSubtitle: 'Profil 360°', icon: 'User', parentRoute: '/rh/suivi', parentLabel: 'Suivi RH' },
  { match: (path) => path === '/rh/dashboard', pageKey: 'rh_dashboard', defaultTitle: 'Dashboard RH', defaultSubtitle: 'Statistiques et indicateurs RH', icon: 'BarChart3', parentRoute: '/rh', parentLabel: 'RH et Parc' },
  { match: (path) => path === '/rh/parc', pageKey: 'rh_parc', defaultTitle: 'Parc & Véhicules', defaultSubtitle: 'Gestion des véhicules et équipements', icon: 'Car', parentRoute: '/rh', parentLabel: 'RH et Parc' },
  { match: (path) => path === '/rh', pageKey: 'rh_index', defaultTitle: 'RH et Parc', defaultSubtitle: 'Ressources humaines et gestion du parc', icon: 'Users', parentRoute: '/', parentLabel: 'Accueil' },
  
  // ============================================
  // HELP ACADEMY
  // ============================================
  { match: (path) => path.startsWith('/academy/apogee/category/'), pageKey: 'academy_apogee_category', defaultTitle: 'Guide Apogée', defaultSubtitle: 'Détail de la catégorie', icon: 'BookOpen', parentRoute: '/academy/apogee', parentLabel: 'Guide Apogée' },
  { match: (path) => path.startsWith('/academy/apogee'), pageKey: 'academy_apogee', defaultTitle: 'Guide Apogée', defaultSubtitle: 'Tout ce que vous devez savoir sur l\'utilisation d\'Apogée', icon: 'BookOpen', parentRoute: '/academy', parentLabel: 'Academy' },
  { match: (path) => path.includes('/academy/apporteurs/category/') && path.includes('/sub/'), pageKey: 'academy_apporteurs_sub', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Détail sous-catégorie', icon: 'Handshake', parentRoute: '/academy/apporteurs', parentLabel: 'Apporteurs' },
  { match: (path) => path.startsWith('/academy/apporteurs/category/'), pageKey: 'academy_apporteurs_category', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Sous-catégories', icon: 'Handshake', parentRoute: '/academy/apporteurs', parentLabel: 'Apporteurs' },
  { match: (path) => path.startsWith('/academy/apporteurs'), pageKey: 'academy_apporteurs', defaultTitle: 'Guide Apporteurs', defaultSubtitle: 'Ressources pour les apporteurs d\'affaires', icon: 'Handshake', parentRoute: '/academy', parentLabel: 'Academy' },
  { match: (path) => path.startsWith('/academy/hc-base/category/'), pageKey: 'academy_documents_category', defaultTitle: 'Base Documentaire', defaultSubtitle: 'Détail de la catégorie', icon: 'FolderOpen', parentRoute: '/academy/hc-base', parentLabel: 'Base Doc' },
  { match: (path) => path.startsWith('/academy/hc-base'), pageKey: 'academy_documents', defaultTitle: 'Base Documentaire', defaultSubtitle: 'Documents et ressources HelpConfort', icon: 'FolderOpen', parentRoute: '/academy', parentLabel: 'Academy' },
  { match: (path) => path === '/academy', pageKey: 'academy_index', defaultTitle: 'Help! Academy', defaultSubtitle: 'Accédez à tous les guides et ressources', icon: 'GraduationCap', parentRoute: '/', parentLabel: 'Accueil' },
  
  // ============================================
  // SUPPORT
  // ============================================
  { match: (path) => path === '/support', pageKey: 'support_index', defaultTitle: 'Support', defaultSubtitle: 'Chat IA et assistance', icon: 'Headset', parentRoute: '/', parentLabel: 'Accueil' },
  { match: (path) => path === '/support/mes-demandes', pageKey: 'support_mes_demandes', defaultTitle: 'Mes Demandes', defaultSubtitle: 'Créer et suivre vos demandes de support', icon: 'MessageSquare', parentRoute: '/support', parentLabel: 'Support' },
  { match: (path) => path === '/support/faq', pageKey: 'support_faq', defaultTitle: 'FAQ', defaultSubtitle: 'Questions fréquemment posées', icon: 'HelpCircle', parentRoute: '/support', parentLabel: 'Support' },
  { match: (path) => path === '/support/console', pageKey: 'support_console', defaultTitle: 'Console Support', defaultSubtitle: 'Traiter les demandes de support', icon: 'Headset', parentRoute: '/support', parentLabel: 'Support' },
  
  // ============================================
  // ESPACE FRANCHISEUR
  // ============================================
  { match: (path) => path === '/hc-reseau/dashboard', pageKey: 'reseau_dashboard', defaultTitle: 'Dashboard Réseau', defaultSubtitle: 'Vue d\'ensemble du réseau', icon: 'LayoutDashboard', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => /^\/hc-reseau\/agences\/[^/]+$/.test(path), pageKey: 'reseau_agence_profile', defaultTitle: 'Profil Agence', defaultSubtitle: 'Détails et configuration de l\'agence', icon: 'Building2', parentRoute: '/hc-reseau/agences', parentLabel: 'Agences' },
  { match: (path) => path === '/hc-reseau/agences', pageKey: 'reseau_agences', defaultTitle: 'Agences du Réseau', defaultSubtitle: 'Gestion des agences franchisées', icon: 'Building2', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/utilisateurs', pageKey: 'reseau_utilisateurs', defaultTitle: 'Utilisateurs Réseau', defaultSubtitle: 'Gestion des utilisateurs des agences', icon: 'Users', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/tableaux', pageKey: 'reseau_stats', defaultTitle: 'Tableaux Réseau', defaultSubtitle: 'KPI consolidés du réseau', icon: 'PieChart', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/periodes', pageKey: 'reseau_periodes', defaultTitle: 'Périodes', defaultSubtitle: 'Comparaison entre agences', icon: 'GitCompare', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/comparatif', pageKey: 'reseau_comparatif', defaultTitle: 'Comparatif Agences', defaultSubtitle: 'Tableau comparatif des KPI par agence', icon: 'BarChart3', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/graphiques', pageKey: 'reseau_graphiques', defaultTitle: 'Graphiques Réseau', defaultSubtitle: 'Visualisations des KPI réseau', icon: 'BarChart3', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/redevances', pageKey: 'reseau_redevances', defaultTitle: 'Redevances', defaultSubtitle: 'Calcul et suivi des redevances', icon: 'Calculator', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau/parametres', pageKey: 'reseau_parametres', defaultTitle: 'Paramètres Réseau', defaultSubtitle: 'Configuration du réseau franchiseur', icon: 'Settings', parentRoute: '/hc-reseau', parentLabel: 'Espace Franchiseur' },
  { match: (path) => path === '/hc-reseau', pageKey: 'reseau_index', defaultTitle: 'Espace Franchiseur', defaultSubtitle: 'Pilotage du réseau HelpConfort', icon: 'Network', parentRoute: '/', parentLabel: 'Accueil' },
  
  // ============================================
  // ADMINISTRATION
  // ============================================
  // GESTION DE PROJET
  // ============================================
  { match: (path) => path === '/projects/import', pageKey: 'projects_import', defaultTitle: 'Import Tickets', defaultSubtitle: 'Importer des tickets depuis Excel', icon: 'Upload', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/import-priorities', pageKey: 'projects_import_priorities', defaultTitle: 'Import Priorités', defaultSubtitle: 'Importer les priorités', icon: 'Upload', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/import-evaluated', pageKey: 'projects_import_evaluated', defaultTitle: 'Import Évalué', defaultSubtitle: 'Importer tickets évalués', icon: 'Upload', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/import-bugs', pageKey: 'projects_import_bugs', defaultTitle: 'Import Bugs', defaultSubtitle: 'Importer les bugs', icon: 'Bug', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/import-v1', pageKey: 'projects_import_v1', defaultTitle: 'Import V1', defaultSubtitle: 'Importer depuis V1', icon: 'Upload', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/incomplets', pageKey: 'projects_incomplete', defaultTitle: 'Tickets Incomplets', defaultSubtitle: 'Compléter les tickets', icon: 'AlertCircle', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/classifier', pageKey: 'projects_classify', defaultTitle: 'Classifier', defaultSubtitle: 'Classifier et qualifier les tickets', icon: 'Tags', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/review', pageKey: 'projects_review', defaultTitle: 'Review', defaultSubtitle: 'Réviser les tickets', icon: 'Eye', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/permissions', pageKey: 'projects_permissions', defaultTitle: 'Permissions', defaultSubtitle: 'Gérer les rôles et permissions', icon: 'Shield', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects/kanban', pageKey: 'projects_kanban', defaultTitle: 'Kanban Projet', defaultSubtitle: 'Vue Kanban des tickets projet', icon: 'Kanban', parentRoute: '/projects', parentLabel: 'Projet' },
  { match: (path) => path === '/projects', pageKey: 'projects_index', defaultTitle: 'Gestion de Projet', defaultSubtitle: 'Gérez le backlog et le suivi de développement', icon: 'FolderKanban', parentRoute: '/', parentLabel: 'Accueil' },
  
  // Autres pages Admin
  { match: (path) => path === '/admin/users', pageKey: 'admin_users', defaultTitle: 'Gestion Utilisateurs', defaultSubtitle: 'Comptes et permissions', icon: 'Users', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => /^\/admin\/agencies\/[^/]+$/.test(path), pageKey: 'admin_agency_profile', defaultTitle: 'Profil Agence', defaultSubtitle: 'Configuration de l\'agence', icon: 'Building', parentRoute: '/admin/agencies', parentLabel: 'Agences' },
  { match: (path) => path === '/admin/agencies', pageKey: 'admin_agencies', defaultTitle: 'Gestion Agences', defaultSubtitle: 'Configuration des agences', icon: 'Building', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/collaborateurs', pageKey: 'admin_collaborateurs', defaultTitle: 'Collaborateurs non-inscrits', defaultSubtitle: 'Collaborateurs sans compte utilisateur', icon: 'UserMinus', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/backup', pageKey: 'admin_backup', defaultTitle: 'Sauvegarde & Restauration', defaultSubtitle: 'Export et import des données', icon: 'Database', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/helpconfort-backup', pageKey: 'admin_helpconfort_backup', defaultTitle: 'Backup HelpConfort', defaultSubtitle: 'Sauvegarde base documentaire', icon: 'Database', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/cache-backup', pageKey: 'admin_cache_backup', defaultTitle: 'Cache Backup', defaultSubtitle: 'Gestion du cache local', icon: 'HardDrive', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/user-activity', pageKey: 'admin_user_activity', defaultTitle: 'Activité Utilisateurs', defaultSubtitle: 'Historique des connexions', icon: 'Activity', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/support-stats', pageKey: 'admin_support_stats', defaultTitle: 'Statistiques Support', defaultSubtitle: 'Métriques et performance du support', icon: 'BarChart3', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/escalation-history', pageKey: 'admin_escalation_history', defaultTitle: 'Historique Escalades', defaultSubtitle: 'Suivi des escalades de tickets', icon: 'ArrowUpCircle', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/storage-quota', pageKey: 'admin_storage_quota', defaultTitle: 'Stockage', defaultSubtitle: 'Surveillance des quotas', icon: 'HardDrive', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/page-metadata', pageKey: 'admin_page_metadata', defaultTitle: 'Métadonnées des pages', defaultSubtitle: 'Gérez les titres, descriptions et labels de menu', icon: 'FileText', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/apogee-guides', pageKey: 'admin_apogee_guides', defaultTitle: 'Guides Apogée (RAG)', defaultSubtitle: 'Édition des guides pour le chatbot', icon: 'BookOpen', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/helpi', pageKey: 'admin_helpi', defaultTitle: 'Helpi - Moteur de connaissance', defaultSubtitle: 'Indexation RAG et gestion des questions chatbot', icon: 'Brain', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/announcements', pageKey: 'admin_announcements', defaultTitle: 'Annonces Prioritaires', defaultSubtitle: 'Diffusez des informations importantes à vos utilisateurs', icon: 'Bell', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/system-health', pageKey: 'admin_system_health', defaultTitle: 'Santé Système', defaultSubtitle: 'Surveillance en temps réel des services', icon: 'Activity', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin/formation-generator', pageKey: 'admin_formation_generator', defaultTitle: 'Générateur Formation IA', defaultSubtitle: 'Génère des résumés pédagogiques à partir des guides Apogée', icon: 'Sparkles', parentRoute: '/admin', parentLabel: 'Admin' },
  { match: (path) => path === '/admin', pageKey: 'admin_index', defaultTitle: 'Administration', defaultSubtitle: 'Configuration du système', icon: 'Settings', parentRoute: '/', parentLabel: 'Accueil' },
  
  // ============================================
  // USER PAGES
  // ============================================
  
  { match: (path) => path === '/profile', pageKey: 'profile', defaultTitle: 'Mon Compte', defaultSubtitle: 'Gérez vos informations personnelles', icon: 'User', parentRoute: '/', parentLabel: 'Accueil' },
  { match: (path) => path === '/favorites', pageKey: 'favorites', defaultTitle: 'Mes Favoris', defaultSubtitle: 'Accès rapide à vos contenus favoris', icon: 'Star', parentRoute: '/', parentLabel: 'Accueil' },
  { match: (path) => path === '/changelog', pageKey: 'changelog', defaultTitle: 'Historique des versions', defaultSubtitle: 'Nouveautés et améliorations de l\'application', icon: 'History', parentRoute: '/', parentLabel: 'Accueil' },
  
  // ============================================
  // HOME (pas de retour)
  // ============================================
  { match: (path) => path === '/', pageKey: 'home', defaultTitle: 'Tableau de bord', icon: 'Home' },
];

/**
 * Obtenir la config de page pour un chemin donné
 */
export function getPageConfigByPath(pathname: string): PageHeaderConfig | null {
  return PAGE_HEADER_MATCHERS.find(config => config.match(pathname)) || null;
}
