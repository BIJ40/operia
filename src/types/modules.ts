/**
 * Modules System V3.0 - Aligné avec les onglets UI
 * 
 * Chaque onglet du workspace = 1 module (sauf DIVERS qui contient 4 sous-modules)
 * Les modules sont gérés au niveau plan (Basique/Pro) puis override par utilisateur
 */

import { GlobalRole, GLOBAL_ROLES } from './globalRoles';

// Définition des modules alignés avec les onglets UI
export const MODULES = {
  // Non-migrated legacy modules (still canonical)
  ticketing: 'ticketing',
  prospection: 'prospection',
  planning_augmente: 'planning_augmente',
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
  
  'pilotage.incoherences': 'pilotage.incoherences',
  'pilotage.resultat': 'pilotage.resultat',
  'pilotage.rentabilite': 'pilotage.rentabilite',
  // (pilotage.dashboard removed — merged into pilotage.statistiques)
  'pilotage.agence': 'pilotage.agence',
  // Commercial
  'commercial.suivi_client': 'commercial.suivi_client',
  'commercial.comparateur': 'commercial.comparateur',
  'commercial.veille': 'commercial.veille',
  'commercial.prospects': 'commercial.prospects',
  'commercial.realisations': 'commercial.realisations',
  'commercial.social': 'commercial.social',
  
  'commercial.signature': 'commercial.signature',
  'commercial.realisations.photos': 'commercial.realisations.photos',
  'commercial.realisations.generer_avap': 'commercial.realisations.generer_avap',
  'commercial.realisations.onglet_avap': 'commercial.realisations.onglet_avap',
  'commercial.realisations.valider_envoyer': 'commercial.realisations.valider_envoyer',
  // Organisation
  'organisation.salaries': 'organisation.salaries',
  'organisation.apporteurs': 'organisation.apporteurs',
  'organisation.plannings': 'organisation.plannings',
  'organisation.reunions': 'organisation.reunions',
  'organisation.parc': 'organisation.parc',
  'organisation.zones': 'organisation.zones',
  'organisation.documents_legaux': 'organisation.documents_legaux',
  // Médiathèque
  'mediatheque.consulter': 'mediatheque.consulter',
  'mediatheque.gerer': 'mediatheque.gerer',
  'mediatheque.corbeille': 'mediatheque.corbeille',
  'mediatheque.documents': 'mediatheque.documents',
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
  'pilotage.agence': {
    indicateurs: 'pilotage.agence.indicateurs',
    actions_a_mener: 'pilotage.agence.actions_a_mener',
    diffusion: 'pilotage.agence.diffusion',
  },
  // pilotage.dashboard options removed — merged into pilotage.statistiques
  'organisation.salaries': {
    rh_viewer: 'organisation.salaries.rh_viewer',
    rh_admin: 'organisation.salaries.rh_admin',
  },
  'organisation.parc': {
    vehicules: 'organisation.parc.vehicules',
    epi: 'organisation.parc.epi',
    equipements: 'organisation.parc.equipements',
  },
  'organisation.apporteurs': {
    consulter: 'organisation.apporteurs.consulter',
    gerer: 'organisation.apporteurs.gerer',
  },
  'organisation.plannings': {},
  'organisation.reunions': {},
  'organisation.zones': {},
  'mediatheque.documents': {
    consulter: 'mediatheque.documents.consulter',
    gerer: 'mediatheque.documents.gerer',
    corbeille_vider: 'mediatheque.documents.corbeille_vider',
  },
  'support.guides': {
    apogee: 'support.guides.apogee',
    apporteurs: 'support.guides.apporteurs',
    helpconfort: 'support.guides.helpconfort',
    faq: 'support.guides.faq',
    edition: 'support.guides.edition',
  },
  ticketing: {
    kanban: 'ticketing.kanban',
    create: 'ticketing.create',
    manage: 'ticketing.manage',
    import: 'ticketing.import',
  },
  'support.aide_en_ligne': {
    user: 'support.aide_en_ligne.user',
    agent: 'support.aide_en_ligne.agent',
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
  'commercial.realisations': {
    view: 'commercial.realisations.view',
    create: 'commercial.realisations.create',
    edit: 'commercial.realisations.edit',
    validate: 'commercial.realisations.validate',
    publish_prepare: 'commercial.realisations.publish_prepare',
    export: 'commercial.realisations.export',
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

/** Legacy module keys (those with entries in MODULE_OPTIONS) */
type LegacyModuleKey = keyof typeof MODULE_OPTIONS;
export type ModuleOptionPath = typeof MODULE_OPTIONS[LegacyModuleKey][keyof typeof MODULE_OPTIONS[LegacyModuleKey]];

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
  /** Si true, ce module n'est activé que par overwrite utilisateur (user_modules), jamais par plan ou rôle */
  overwriteOnly?: boolean;
  /** Si true, ce "module" est en réalité une interface de rôle, pas un module standard administrable.
   *  L'accès est piloté par le rôle global, pas par plan/overwrite. */
  roleInterface?: boolean;
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
    key: 'pilotage.agence',
    label: 'Mon agence',
    description: 'Tableau de bord, KPIs et actions',
    icon: 'Building2',
    category: 'pilotage',
    uiSubTab: 'actions',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'indicateurs', path: 'pilotage.agence.indicateurs', label: 'Indicateurs', description: 'KPIs principaux', defaultEnabled: true, routes: ['/'] },
      { key: 'actions_a_mener', path: 'pilotage.agence.actions_a_mener', label: 'Actions à mener', description: 'Liste des actions', defaultEnabled: true, routes: ['/'] },
      { key: 'diffusion', path: 'pilotage.agence.diffusion', label: 'Diffusion', description: 'Écran TV', defaultEnabled: true, routes: ['/diffusion'] },
      
    ],
  },
  // pilotage.dashboard definition removed — merged into pilotage.statistiques in module_registry
  {
    key: 'organisation.salaries',
    label: 'Salariés',
    description: 'Gestion des ressources humaines',
    icon: 'Users',
    category: 'organisation',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'rh_viewer', path: 'organisation.salaries.rh_viewer', label: 'Gestionnaire', description: 'Vue équipe', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'rh_admin', path: 'organisation.salaries.rh_admin', label: 'Admin RH', description: 'Gestion complète', defaultEnabled: false, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'organisation.parc',
    label: 'Parc',
    description: 'Véhicules et équipements',
    icon: 'Truck',
    category: 'organisation',
    uiSubTab: 'parc',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'vehicules', path: 'organisation.parc.vehicules', label: 'Véhicules', description: 'Flotte véhicules', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'epi', path: 'organisation.parc.epi', label: 'EPI', description: 'Équipements protection', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'equipements', path: 'organisation.parc.equipements', label: 'Équipements', description: 'Autres équipements', defaultEnabled: true, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'organisation.apporteurs',
    label: 'Apporteurs',
    description: 'Gestion des apporteurs',
    icon: 'Handshake',
    category: 'organisation',
    uiSubTab: 'apporteurs',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'consulter', path: 'organisation.apporteurs.consulter', label: 'Consulter', description: 'Voir les apporteurs', defaultEnabled: true, routes: ['/?tab=organisation'] },
      { key: 'gerer', path: 'organisation.apporteurs.gerer', label: 'Gérer', description: 'Créer/modifier', defaultEnabled: true, routes: ['/?tab=organisation'] },
    ],
  },
  {
    key: 'organisation.plannings',
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
    key: 'organisation.reunions',
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
    key: 'organisation.zones',
    label: 'Zones',
    description: 'Récapitulatif mensuel des zones BTP par technicien',
    icon: 'MapPin',
    category: 'organisation',
    uiSubTab: 'administratif',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [],
  },
  {
    key: 'mediatheque.documents',
    label: 'Documents',
    description: 'Médiathèque centralisée style Finder',
    icon: 'FolderOpen',
    category: 'documents',
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'consulter', path: 'mediatheque.documents.consulter', label: 'Consulter', description: 'Voir les documents', defaultEnabled: true, routes: ['/?tab=documents'] },
      { key: 'gerer', path: 'mediatheque.documents.gerer', label: 'Gérer', description: 'Créer, modifier, déplacer', defaultEnabled: true, routes: ['/?tab=documents'] },
      { key: 'corbeille_vider', path: 'mediatheque.documents.corbeille_vider', label: 'Vider corbeille', description: 'Suppression définitive', defaultEnabled: false, routes: ['/?tab=documents'] },
    ],
  },
  {
    key: 'support.guides',
    label: 'Guides',
    description: 'Documentation et guides',
    icon: 'BookOpen',
    category: 'support',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_admin',
    options: [
      { key: 'apogee', path: 'support.guides.apogee', label: 'Apogée', description: 'Guide Apogée', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'apporteurs', path: 'support.guides.apporteurs', label: 'Apporteurs', description: 'Guide apporteurs', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'helpconfort', path: 'support.guides.helpconfort', label: 'HelpConfort', description: 'Guide HelpConfort', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'faq', path: 'support.guides.faq', label: 'FAQ', description: 'Questions fréquentes', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'edition', path: 'support.guides.edition', label: 'Édition contenu', description: 'Modifier le contenu des guides', defaultEnabled: false, routes: ['/?tab=support'] },
    ],
  },
  {
    key: 'ticketing',
    label: 'Ticketing',
    description: 'Suivi des développements',
    icon: 'Kanban',
    category: 'support',
    defaultForRoles: [],
    minRole: 'base_user',
    overwriteOnly: true,
    options: [
      { key: 'kanban', path: 'ticketing.kanban', label: 'Kanban', description: 'Vue tableau', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'create', path: 'ticketing.create', label: 'Créer', description: 'Créer tickets', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'manage', path: 'ticketing.manage', label: 'Gérer', description: 'Modifier tickets', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'import', path: 'ticketing.import', label: 'Import', description: 'Import Excel', defaultEnabled: false, routes: ['/?tab=support'] },
    ],
  },
  {
    key: 'support.aide_en_ligne',
    label: 'Aide',
    description: 'Support et assistance',
    icon: 'HelpCircle',
    category: 'support',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'user', path: 'support.aide_en_ligne.user', label: 'Utilisateur', description: 'Créer demandes', defaultEnabled: true, routes: ['/?tab=support'] },
      { key: 'agent', path: 'support.aide_en_ligne.agent', label: 'Agent', description: 'Répondre demandes', defaultEnabled: false, routes: ['/?tab=support'] },
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
    deployed: false,
    defaultForRoles: [],
    minRole: 'franchisee_admin',
    adminOnly: true,
    options: [
      { key: 'suggest', path: 'planning_augmente.suggest', label: 'Suggestion', description: 'Suggérer un créneau', defaultEnabled: true, routes: [] },
      { key: 'optimize', path: 'planning_augmente.optimize', label: 'Optimisation', description: 'Scanner & optimiser', defaultEnabled: true, routes: [] },
      { key: 'admin', path: 'planning_augmente.admin', label: 'Admin', description: 'Configuration pondérations', defaultEnabled: false, routes: [] },
    ],
  },
  // Commercial sub-modules (promoted from prospection options)
  {
    key: 'commercial.suivi_client',
    label: 'Suivi client',
    description: 'Fiche apporteur et suivi',
    icon: 'Users',
    category: 'commercial',
    uiSubTab: 'apporteurs',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [],
  },
  {
    key: 'commercial.comparateur',
    label: 'Comparateur',
    description: 'Comparer apporteurs',
    icon: 'GitCompare',
    category: 'commercial',
    uiSubTab: 'comparateur',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [],
  },
  {
    key: 'commercial.veille',
    label: 'Veille',
    description: 'Monitoring apporteurs',
    icon: 'Radar',
    category: 'commercial',
    uiSubTab: 'veille',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [],
  },
  {
    key: 'commercial.prospects',
    label: 'Prospects',
    description: 'Gestion prospects',
    icon: 'UserSearch',
    category: 'commercial',
    uiSubTab: 'prospects',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [],
  },
  // Module premium Réalisations
  {
    key: 'commercial.realisations',
    label: 'Réalisations',
    description: 'Gestion des réalisations terrain, photos avant/après, SEO',
    icon: 'Camera',
    category: 'commercial',
    uiSubTab: 'realisations',
    defaultForRoles: [],
    minRole: 'franchisee_user',
    options: [
      { key: 'view', path: 'commercial.realisations.view', label: 'Consulter', description: 'Voir les réalisations', defaultEnabled: true, routes: ['/realisations'] },
      { key: 'create', path: 'commercial.realisations.create', label: 'Créer', description: 'Créer des réalisations', defaultEnabled: true, routes: ['/realisations/new'] },
      { key: 'edit', path: 'commercial.realisations.edit', label: 'Modifier', description: 'Modifier les réalisations', defaultEnabled: true, routes: ['/realisations'] },
      { key: 'validate', path: 'commercial.realisations.validate', label: 'Valider', description: 'Valider / refuser', defaultEnabled: false, routes: ['/realisations'] },
      { key: 'publish_prepare', path: 'commercial.realisations.publish_prepare', label: 'Publier', description: 'Préparer publication web', defaultEnabled: false, routes: ['/realisations'] },
      { key: 'export', path: 'commercial.realisations.export', label: 'Exporter', description: 'Export des données', defaultEnabled: false, routes: ['/realisations'] },
    ],
  },
  // Module Social Hub
  {
    key: 'commercial.social',
    label: 'Social',
    description: 'Calendrier éditorial social media intelligent avec génération IA',
    icon: 'Share2',
    category: 'commercial',
    uiSubTab: 'social',
    defaultForRoles: [],
    minRole: 'franchisee_admin',
    options: [
      { key: 'view', path: 'commercial.social.view', label: 'Consulter', description: 'Voir les suggestions', defaultEnabled: true, routes: [] },
      { key: 'generate', path: 'commercial.social.generate', label: 'Générer', description: 'Générer des suggestions IA', defaultEnabled: true, routes: [] },
      { key: 'publish', path: 'commercial.social.publish', label: 'Publier', description: 'Planifier et publier', defaultEnabled: true, routes: [] },
    ],
  },
  // reseau_franchiseur — INTERFACE DE RÔLE (N3+), pas un module standard.
  // Conservé dans MODULE_DEFINITIONS pour compatibilité technique (EnabledModules, user_modules legacy)
  // mais l'accès réel est piloté par src/permissions/franchisorAccess.ts
  {
    key: 'reseau_franchiseur',
    label: 'Réseau Franchiseur',
    description: 'Interface de rôle — accès piloté par rôle global N3+, pas par module',
    icon: 'Network',
    category: 'reseau',
    defaultForRoles: [], // VIDÉ — l'accès n'est plus piloté par module
    minRole: 'franchisor_user',
    adminOnly: true,
    /** Interface de rôle, pas un module administrable */
    roleInterface: true,
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


/**
 * EnabledModules interface.
 * 
 * TRANSITIONAL (Phase 8): Named properties for legacy keys are KEPT because:
 * 1. The RPC still returns legacy keys alongside hierarchical ones
 * 2. AuthContext.tsx PRO enrichment reads .parc, .agence, .reseau_franchiseur directly
 * 3. Removing them would require migrating all direct property access patterns
 * 4. The index signature handles hierarchical keys (`enabledModules['pilotage.agence']`)
 * 
 * These named props will be removed when:
 * - The RPC stops returning legacy keys
 * - All consumers migrate to bracket notation
 */
export interface EnabledModules {
  // Legacy named props (transitional — see comment above)
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
  /** Index signature for hierarchical keys and dynamic access */
  [key: string]: boolean | ModuleOptionsState | undefined;
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
export const MODULE_SHORT_LABELS: Partial<Record<ModuleKey, string>> = {
  // Non-migrated legacy modules
  ticketing: 'Ticketing',
  prospection: 'Commercial',
  planning_augmente: 'Planif. IA',
  reseau_franchiseur: 'Réseau',
  admin_plateforme: 'Admin',
  unified_search: 'Recherche',
  // Pilotage
  'pilotage.agence': 'Agence',
  // pilotage.dashboard removed
  'pilotage.statistiques': 'Statistiques',
  'pilotage.performance': 'Performance',
  'pilotage.actions_a_mener': 'Actions',
  
  'pilotage.incoherences': 'Incohérences',
  'pilotage.resultat': 'Résultat',
  'pilotage.rentabilite': 'Rentabilité',
  // Commercial
  'commercial.suivi_client': 'Suivi client',
  'commercial.comparateur': 'Comparateur',
  'commercial.veille': 'Veille',
  'commercial.prospects': 'Prospects',
  'commercial.realisations': 'Réalisations',
  // Organisation
  'organisation.salaries': 'Salariés',
  'organisation.apporteurs': 'Apporteurs',
  'organisation.plannings': 'Plannings',
  'organisation.reunions': 'Réunions',
  'organisation.parc': 'Parc',
  'organisation.documents_legaux': 'Documents légaux',
  // Médiathèque
  'mediatheque.documents': 'Documents',
  'mediatheque.consulter': 'Consulter',
  'mediatheque.gerer': 'Gérer',
  'mediatheque.corbeille': 'Corbeille',
  // Support
  'support.aide_en_ligne': 'Aide',
  'support.guides': 'Guides',
  'support.faq': 'FAQ',
  'support.ticketing': 'Ticketing',
  // Admin
  'admin.gestion': 'Gestion',
  'admin.franchiseur': 'Franchiseur',
  'admin.ia': 'IA',
  'admin.contenu': 'Contenu',
  'admin.ops': 'Ops',
  'admin.plateforme': 'Plateforme',
};
