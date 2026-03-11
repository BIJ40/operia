/**
 * Modules System V3.0 - Aligné avec les onglets UI
 * 
 * Chaque onglet du workspace = 1 module (sauf DIVERS qui contient 4 sous-modules)
 * Les modules sont gérés au niveau plan (Basique/Pro) puis override par utilisateur
 */

import { GlobalRole, GLOBAL_ROLES } from './globalRoles';

// Définition des modules alignés avec les onglets UI
export const MODULES = {
  // Modules V3 legacy (onglets existants)
  agence: 'agence',
  stats: 'stats',
  rh: 'rh',
  parc: 'parc',
  divers_apporteurs: 'divers_apporteurs',
  divers_plannings: 'divers_plannings',
  divers_reunions: 'divers_reunions',
  divers_documents: 'divers_documents',
  guides: 'guides',
  ticketing: 'ticketing',
  aide: 'aide',
  prospection: 'prospection',
  planning_augmente: 'planning_augmente',
  realisations: 'realisations',
  reseau_franchiseur: 'reseau_franchiseur',
  admin_plateforme: 'admin_plateforme',
  unified_search: 'unified_search',

  // ── Phase 3 — Nouvelles clés fonctionnelles (sans racines) ──
  // Pilotage
  'pilotage.statistiques': 'pilotage.statistiques',
  'pilotage.statistiques.general': 'pilotage.statistiques.general',
  'pilotage.statistiques.apporteurs': 'pilotage.statistiques.apporteurs',
  'pilotage.statistiques.techniciens': 'pilotage.statistiques.techniciens',
  'pilotage.statistiques.univers': 'pilotage.statistiques.univers',
  'pilotage.statistiques.sav': 'pilotage.statistiques.sav',
  'pilotage.statistiques.previsionnel': 'pilotage.statistiques.previsionnel',
  'pilotage.statistiques.exports': 'pilotage.statistiques.exports',
  'pilotage.performance': 'pilotage.performance',
  'pilotage.actions_a_mener': 'pilotage.actions_a_mener',
  'pilotage.devis_acceptes': 'pilotage.devis_acceptes',
  'pilotage.incoherences': 'pilotage.incoherences',
  // Commercial
  'commercial.suivi_client': 'commercial.suivi_client',
  'commercial.comparateur': 'commercial.comparateur',
  'commercial.veille': 'commercial.veille',
  'commercial.prospects': 'commercial.prospects',
  'commercial.realisations': 'commercial.realisations',
  // Organisation
  'organisation.salaries': 'organisation.salaries',
  'organisation.apporteurs': 'organisation.apporteurs',
  'organisation.plannings': 'organisation.plannings',
  'organisation.reunions': 'organisation.reunions',
  'organisation.parc': 'organisation.parc',
  'organisation.documents_legaux': 'organisation.documents_legaux',
  // Médiathèque
  'mediatheque.consulter': 'mediatheque.consulter',
  'mediatheque.gerer': 'mediatheque.gerer',
  'mediatheque.corbeille': 'mediatheque.corbeille',
  // Support
  'support.aide_en_ligne': 'support.aide_en_ligne',
  'support.guides': 'support.guides',
  'support.faq': 'support.faq',
  'support.ticketing': 'support.ticketing',
  // Admin
  'admin.gestion': 'admin.gestion',
  'admin.franchiseur': 'admin.franchiseur',
  'admin.ia': 'admin.ia',
  'admin.contenu': 'admin.contenu',
  'admin.ops': 'admin.ops',
  'admin.plateforme': 'admin.plateforme',
} as const;

export type ModuleKey = keyof typeof MODULES;


// Sous-options par module
export const MODULE_OPTIONS = {
  agence: {
    indicateurs: 'agence.indicateurs',
    actions_a_mener: 'agence.actions_a_mener',
    diffusion: 'agence.diffusion',
    devis_acceptes: 'agence.devis_acceptes',
  },
  stats: {
    stats_hub: 'stats.stats_hub',
    exports: 'stats.exports',
  },
  rh: {
    rh_viewer: 'rh.rh_viewer',
    rh_admin: 'rh.rh_admin',
  },
  parc: {
    vehicules: 'parc.vehicules',
    epi: 'parc.epi',
    equipements: 'parc.equipements',
  },
  divers_apporteurs: {
    consulter: 'divers_apporteurs.consulter',
    gerer: 'divers_apporteurs.gerer',
  },
  divers_plannings: {},
  divers_reunions: {},
  divers_documents: {
    consulter: 'divers_documents.consulter',
    gerer: 'divers_documents.gerer',
    corbeille_vider: 'divers_documents.corbeille_vider',
  },
  guides: {
    apogee: 'guides.apogee',
    apporteurs: 'guides.apporteurs',
    helpconfort: 'guides.helpconfort',
    faq: 'guides.faq',
  },
  ticketing: {
    kanban: 'ticketing.kanban',
    create: 'ticketing.create',
    manage: 'ticketing.manage',
    import: 'ticketing.import',
  },
  aide: {
    user: 'aide.user',
    agent: 'aide.agent',
  },
  prospection: {
    dashboard: 'prospection.dashboard',
    comparateur: 'prospection.comparateur',
    veille: 'prospection.veille',
    prospects: 'prospection.prospects',
  },
  planning_augmente: {
    suggest: 'planning_augmente.suggest',
    optimize: 'planning_augmente.optimize',
    admin: 'planning_augmente.admin',
  },
  realisations: {
    view: 'realisations.view',
    create: 'realisations.create',
    edit: 'realisations.edit',
    validate: 'realisations.validate',
    publish_prepare: 'realisations.publish_prepare',
    export: 'realisations.export',
  },
  reseau_franchiseur: {
    dashboard: 'reseau_franchiseur.dashboard',
    stats: 'reseau_franchiseur.stats',
    agences: 'reseau_franchiseur.agences',
    redevances: 'reseau_franchiseur.redevances',
    comparatifs: 'reseau_franchiseur.comparatifs',
  },
  admin_plateforme: {
    users: 'admin_plateforme.users',
    agencies: 'admin_plateforme.agencies',
    permissions: 'admin_plateforme.permissions',
  },
  unified_search: {
    stats: 'unified_search.stats',
    docs: 'unified_search.docs',
  },
} as const;

export type ModuleOptionPath = typeof MODULE_OPTIONS[ModuleKey][keyof typeof MODULE_OPTIONS[ModuleKey]];

// Métadonnées des modules pour l'UI
// Les catégories correspondent EXACTEMENT aux onglets de niveau 1 du workspace
export type ModuleCategory = 
  | 'pilotage'      // Onglet "Pilotage" (Stats, Performance, Actions)
  | 'commercial'    // Onglet "Commercial" (Prospection, Devis acceptés, Incohérences)
  | 'organisation'  // Onglet "Organisation" (Collaborateurs, Apporteurs, Plannings, Réunions, Parc, Conformité)
  | 'documents'     // Onglet "Documents" (Médiathèque)
  | 'support'       // Onglet "Support" (Aide en ligne, Guides, FAQ, Ticketing)
  | 'reseau'        // Onglet "Franchiseur" (visible N3+)
  | 'admin';        // Onglet "Admin" (visible N5+)

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  /** Catégorie UI = onglet de niveau 1 du workspace */
  category: ModuleCategory;
  /** Sous-onglet de niveau 2 dans l'onglet parent (ex: 'parc' dans Outils) */
  uiSubTab?: string;
  defaultForRoles: GlobalRole[];
  minRole: GlobalRole;
  options: ModuleOptionDefinition[];
  /** Si true, ce module n'apparaît pas dans la gestion des plans */
  adminOnly?: boolean;
  /** Si false, ce module est en développement et masqué des permissions/plans */
  deployed?: boolean;
}

export interface ModuleOptionDefinition {
  key: string;
  path: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
  routes?: string[];
}

// Configuration complète des modules
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'agence',
    label: 'Mon agence',
    description: 'Tableau de bord, KPIs et actions',
    icon: 'Building2',
    category: 'pilotage',
    uiSubTab: 'actions',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'indicateurs', path: 'agence.indicateurs', label: 'Indicateurs', description: 'KPIs principaux', defaultEnabled: true, routes: ['/'] },
      { key: 'actions_a_mener', path: 'agence.actions_a_mener', label: 'Actions à mener', description: 'Liste des actions', defaultEnabled: true, routes: ['/'] },
      { key: 'diffusion', path: 'agence.diffusion', label: 'Diffusion', description: 'Écran TV', defaultEnabled: true, routes: ['/diffusion'] },
      { key: 'devis_acceptes', path: 'agence.devis_acceptes', label: 'Devis acceptés', description: 'Visualisation des dossiers avec devis acceptés', defaultEnabled: true, routes: ['/?tab=commercial'] },
    ],
  },
  {
    key: 'stats',
    label: 'Stats',
    description: 'Statistiques et tableaux de bord',
    icon: 'BarChart3',
    category: 'pilotage',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'stats_hub', path: 'stats.stats_hub', label: 'Stats Hub', description: 'Tableaux avancés', defaultEnabled: true, routes: ['/?tab=pilotage'] },
      { key: 'exports', path: 'stats.exports', label: 'Exports', description: 'Export des données', defaultEnabled: false, routes: ['/?tab=pilotage'] },
    ],
  },
  {
    key: 'rh',
    label: 'Salariés',
    description: 'Gestion des ressources humaines',
    icon: 'Users',
    category: 'organisation',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'rh_viewer', path: 'rh.rh_viewer', label: 'Gestionnaire', description: 'Vue équipe', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'rh_admin', path: 'rh.rh_admin', label: 'Admin RH', description: 'Gestion complète', defaultEnabled: false, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'parc',
    label: 'Parc',
    description: 'Véhicules et équipements',
    icon: 'Truck',
    category: 'organisation',
    uiSubTab: 'parc',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'vehicules', path: 'parc.vehicules', label: 'Véhicules', description: 'Flotte véhicules', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'epi', path: 'parc.epi', label: 'EPI', description: 'Équipements protection', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'equipements', path: 'parc.equipements', label: 'Équipements', description: 'Autres équipements', defaultEnabled: true, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'divers_apporteurs',
    label: 'Apporteurs',
    description: 'Gestion des apporteurs',
    icon: 'Handshake',
    category: 'organisation',
    uiSubTab: 'apporteurs',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'consulter', path: 'divers_apporteurs.consulter', label: 'Consulter', description: 'Voir les apporteurs', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'gerer', path: 'divers_apporteurs.gerer', label: 'Gérer', description: 'Créer/modifier', defaultEnabled: true, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'divers_plannings',
    label: 'Plannings',
    description: 'Gestion des plannings',
    icon: 'Calendar',
    category: 'organisation',
    uiSubTab: 'administratif',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [],
  },
  {
    key: 'divers_reunions',
    label: 'Réunions',
    description: 'Gestion des réunions',
    icon: 'Video',
    category: 'organisation',
    uiSubTab: 'administratif',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [],
  },
  {
    key: 'divers_documents',
    label: 'Documents',
    description: 'Médiathèque centralisée style Finder',
    icon: 'FolderOpen',
    category: 'documents',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'consulter', path: 'divers_documents.consulter', label: 'Consulter', description: 'Voir les documents', defaultEnabled: true, routes: ['/?tab=documents'] },
      { key: 'gerer', path: 'divers_documents.gerer', label: 'Gérer', description: 'Créer, modifier, déplacer', defaultEnabled: true, routes: ['/?tab=documents'] },
      { key: 'corbeille_vider', path: 'divers_documents.corbeille_vider', label: 'Vider corbeille', description: 'Suppression définitive', defaultEnabled: false, routes: ['/?tab=documents'] },
    ],
  },
  {
    key: 'guides',
    label: 'Guides',
    description: 'Documentation et guides',
    icon: 'BookOpen',
    category: 'support',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'apogee', path: 'guides.apogee', label: 'Apogée', description: 'Guide Apogée', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'apporteurs', path: 'guides.apporteurs', label: 'Apporteurs', description: 'Guide apporteurs', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'helpconfort', path: 'guides.helpconfort', label: 'HelpConfort', description: 'Guide HelpConfort', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'faq', path: 'guides.faq', label: 'FAQ', description: 'Questions fréquentes', defaultEnabled: true, routes: ['/?tab=support'] },
    ],
  },
  {
    key: 'ticketing',
    label: 'Ticketing',
    description: 'Suivi des développements',
    icon: 'Kanban',
    category: 'support',
    defaultForRoles: ['platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'kanban', path: 'ticketing.kanban', label: 'Kanban', description: 'Vue tableau', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'create', path: 'ticketing.create', label: 'Créer', description: 'Créer tickets', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'manage', path: 'ticketing.manage', label: 'Gérer', description: 'Modifier tickets', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'import', path: 'ticketing.import', label: 'Import', description: 'Import Excel', defaultEnabled: false, routes: ['/?tab=support'] },
    ],
  },
  {
    key: 'aide',
    label: 'Aide',
    description: 'Support et assistance',
    icon: 'HelpCircle',
    category: 'support',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'user', path: 'aide.user', label: 'Utilisateur', description: 'Créer demandes', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'agent', path: 'aide.agent', label: 'Agent', description: 'Répondre demandes', defaultEnabled: false, routes: ['/?tab=support'] },
    ],
  },
  {
    key: 'prospection',
    label: 'Commercial',
    description: 'Suivi commercial et prospection',
    icon: 'Target',
    category: 'commercial',
    uiSubTab: 'prospection',
    deployed: true,
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [
      { key: 'dashboard', path: 'prospection.dashboard', label: 'Suivi client', description: 'Fiche apporteur', defaultEnabled: true, routes: ['/?tab=commercial'] },
      { key: 'comparateur', path: 'prospection.comparateur', label: 'Comparateur', description: 'Comparer apporteurs', defaultEnabled: true, routes: ['/?tab=commercial'] },
      { key: 'veille', path: 'prospection.veille', label: 'Veille', description: 'Monitoring apporteurs', defaultEnabled: true, routes: ['/?tab=commercial'] },
      { key: 'prospects', path: 'prospection.prospects', label: 'Prospects', description: 'Gestion prospects', defaultEnabled: true, routes: ['/?tab=commercial'] },
    ],
  },
  {
    key: 'planning_augmente',
    label: 'Planification Augmentée',
    description: 'Optimisation intelligente du planning techniciens',
    icon: 'Brain',
    category: 'organisation',
    deployed: false, // En cours de développement, pas dans les permissions/plans
    defaultForRoles: [],
    minRole: 'franchisee_admin',
    adminOnly: true,
    options: [
      { key: 'suggest', path: 'planning_augmente.suggest', label: 'Suggestion', description: 'Suggérer un créneau', defaultEnabled: true, routes: [] },
      { key: 'optimize', path: 'planning_augmente.optimize', label: 'Optimisation', description: 'Scanner & optimiser', defaultEnabled: true, routes: [] },
      { key: 'admin', path: 'planning_augmente.admin', label: 'Admin', description: 'Configuration pondérations', defaultEnabled: false, routes: [] },
    ],
  },
  // Module premium Réalisations
  {
    key: 'realisations',
    label: 'Réalisations',
    description: 'Gestion des réalisations terrain, photos avant/après, SEO',
    icon: 'Camera',
    category: 'commercial',
    uiSubTab: 'realisations',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [
      { key: 'view', path: 'realisations.view', label: 'Consulter', description: 'Voir les réalisations', defaultEnabled: true, routes: ['/realisations'] },
      { key: 'create', path: 'realisations.create', label: 'Créer', description: 'Créer des réalisations', defaultEnabled: true, routes: ['/realisations/new'] },
      { key: 'edit', path: 'realisations.edit', label: 'Modifier', description: 'Modifier les réalisations', defaultEnabled: true, routes: ['/realisations'] },
      { key: 'validate', path: 'realisations.validate', label: 'Valider', description: 'Valider / refuser', defaultEnabled: false, routes: ['/realisations'] },
      { key: 'publish_prepare', path: 'realisations.publish_prepare', label: 'Publier', description: 'Préparer publication web', defaultEnabled: false, routes: ['/realisations'] },
      { key: 'export', path: 'realisations.export', label: 'Exporter', description: 'Export des données', defaultEnabled: false, routes: ['/realisations'] },
    ],
  },
  // Modules admin (non visibles dans les plans)
  {
    key: 'reseau_franchiseur',
    label: 'Réseau Franchiseur',
    description: 'Vision multi-agences',
    icon: 'Network',
    category: 'reseau',
    defaultForRoles: ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisor_user',
    adminOnly: true,
    options: [
      { key: 'dashboard', path: 'reseau_franchiseur.dashboard', label: 'Dashboard', description: 'Vue réseau', defaultEnabled: true, routes: ['/?tab=hc-reseau'] },
      { key: 'stats', path: 'reseau_franchiseur.stats', label: 'Stats', description: 'KPIs réseau', defaultEnabled: true, routes: ['/?tab=hc-reseau'] },
      { key: 'agences', path: 'reseau_franchiseur.agences', label: 'Agences', description: 'Gestion agences', defaultEnabled: true, routes: ['/?tab=hc-reseau'] },
      { key: 'redevances', path: 'reseau_franchiseur.redevances', label: 'Redevances', description: 'Calcul redevances', defaultEnabled: false, routes: ['/?tab=hc-reseau'] },
      { key: 'comparatifs', path: 'reseau_franchiseur.comparatifs', label: 'Comparatifs', description: 'Inter-agences', defaultEnabled: true, routes: ['/?tab=hc-reseau'] },
    ],
  },
  {
    key: 'admin_plateforme',
    label: 'Administration',
    description: 'Gestion plateforme',
    icon: 'Settings',
    category: 'admin',
    defaultForRoles: ['platform_admin', 'superadmin'],
    minRole: 'platform_admin',
    adminOnly: true,
    options: [
      { key: 'users', path: 'admin_plateforme.users', label: 'Utilisateurs', description: 'Gestion comptes', defaultEnabled: true, routes: ['/?tab=admin'] },
      { key: 'agencies', path: 'admin_plateforme.agencies', label: 'Agences', description: 'Config agences', defaultEnabled: true, routes: ['/?tab=admin'] },
      { key: 'permissions', path: 'admin_plateforme.permissions', label: 'Permissions', description: 'Droits accès', defaultEnabled: true, routes: ['/?tab=admin'] },
      { key: 'faq_admin', path: 'admin_plateforme.faq_admin', label: 'FAQ Admin', description: 'Gestion FAQ', defaultEnabled: true, routes: ['/?tab=admin'] },
    ],
  },
];

// ============================================================================
// MODULES DÉPLOYÉS (filtre les modules en cours de développement)
// ============================================================================

/** Modules effectivement déployés (deployed !== false) */
export const DEPLOYED_MODULES: ModuleDefinition[] = MODULE_DEFINITIONS.filter(m => m.deployed !== false);

// Modules visibles dans la gestion des plans (auto-dérivé de MODULE_DEFINITIONS)
// Exclut les modules adminOnly et non déployés
const INTERNAL_ONLY_KEYS: ModuleKey[] = ['unified_search'];

export const PLAN_VISIBLE_MODULES: ModuleKey[] = MODULE_DEFINITIONS
  .filter(m => !m.adminOnly && !INTERNAL_ONLY_KEYS.includes(m.key) && m.deployed !== false)
  .map(m => m.key);


export interface EnabledModules {
  agence?: boolean | ModuleOptionsState;
  stats?: boolean | ModuleOptionsState;
  rh?: boolean | ModuleOptionsState;
  parc?: boolean | ModuleOptionsState;
  divers_apporteurs?: boolean | ModuleOptionsState;
  divers_plannings?: boolean | ModuleOptionsState;
  divers_reunions?: boolean | ModuleOptionsState;
  divers_documents?: boolean | ModuleOptionsState;
  guides?: boolean | ModuleOptionsState;
  ticketing?: boolean | ModuleOptionsState;
  aide?: boolean | ModuleOptionsState;
  prospection?: boolean | ModuleOptionsState;
  planning_augmente?: boolean | ModuleOptionsState;
  realisations?: boolean | ModuleOptionsState;
  reseau_franchiseur?: boolean | ModuleOptionsState;
  admin_plateforme?: boolean | ModuleOptionsState;
  unified_search?: boolean | ModuleOptionsState;
}

export interface ModuleOptionsState {
  enabled: boolean;
  options?: Record<string, boolean>;
}

/**
 * Vérifie si un module est activé pour un utilisateur
 */
export function isModuleEnabled(enabledModules: EnabledModules | null, moduleKey: ModuleKey): boolean {
  if (!enabledModules) return false;
  
  const moduleState = enabledModules[moduleKey];
  if (typeof moduleState === 'boolean') return moduleState;
  if (typeof moduleState === 'object') return moduleState.enabled;
  
  return false;
}

/**
 * Vérifie si une option de module est activée
 */
export function isModuleOptionEnabled(
  enabledModules: EnabledModules | null, 
  moduleKey: ModuleKey, 
  optionKey: string
): boolean {
  if (!enabledModules) return false;
  
  const moduleState = enabledModules[moduleKey];
  if (typeof moduleState === 'boolean') return moduleState;
  if (typeof moduleState === 'object') {
    if (!moduleState.enabled) return false;
    if (!moduleState.options) {
      const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
      const optionDef = moduleDef?.options.find(o => o.key === optionKey);
      return optionDef?.defaultEnabled ?? false;
    }
    return moduleState.options[optionKey] ?? false;
  }
  
  return false;
}

/**
 * Obtient les modules par défaut pour un rôle donné
 */
export function getDefaultModulesForRole(role: GlobalRole): EnabledModules {
  const modules: EnabledModules = {};
  
  for (const moduleDef of MODULE_DEFINITIONS) {
    if (moduleDef.defaultForRoles.includes(role)) {
      const options: Record<string, boolean> = {};
      for (const opt of moduleDef.options) {
        options[opt.key] = opt.defaultEnabled;
      }
      modules[moduleDef.key] = { enabled: true, options };
    }
  }
  
  return modules;
}

/**
 * Vérifie si un utilisateur peut avoir accès à un module selon son rôle
 */
export function canAccessModule(role: GlobalRole | null, moduleKey: ModuleKey): boolean {
  if (!role) return false;
  
  const moduleDef = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
  if (!moduleDef) return false;
  
  return GLOBAL_ROLES[role] >= GLOBAL_ROLES[moduleDef.minRole];
}

/**
 * Labels courts pour les modules (utilisés dans les badges)
 */
export const MODULE_SHORT_LABELS: Record<ModuleKey, string> = {
  agence: 'Agence',
  stats: 'Stats',
  rh: 'RH',
  parc: 'Parc',
  divers_apporteurs: 'Apporteurs',
  divers_plannings: 'Plannings',
  divers_reunions: 'Réunions',
  divers_documents: 'Documents',
  guides: 'Guides',
  ticketing: 'Ticketing',
  aide: 'Aide',
  prospection: 'Commercial',
  planning_augmente: 'Planif. IA',
  realisations: 'Réalisations',
  reseau_franchiseur: 'Réseau',
  admin_plateforme: 'Admin',
  unified_search: 'Recherche',
};
