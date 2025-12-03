/**
 * Modules System V2.0
 * 
 * Chaque module peut être activé/désactivé par utilisateur.
 * Les sous-options permettent un contrôle granulaire au sein d'un module.
 */

import { GlobalRole, GLOBAL_ROLES } from './globalRoles';

// Définition des modules principaux
export const MODULES = {
  help_academy: 'help_academy',
  pilotage_agence: 'pilotage_agence',
  reseau_franchiseur: 'reseau_franchiseur',
  support: 'support',
  admin_plateforme: 'admin_plateforme',
  apogee_tickets: 'apogee_tickets',
  rh_parc: 'rh_parc',
} as const;

export type ModuleKey = keyof typeof MODULES;

// Sous-options par module
export const MODULE_OPTIONS = {
  help_academy: {
    apogee: 'help_academy.apogee',
    apporteurs: 'help_academy.apporteurs',
    helpconfort: 'help_academy.helpconfort',
    base_documentaire: 'help_academy.base_documentaire',
    edition: 'help_academy.edition',
  },
  pilotage_agence: {
    indicateurs: 'pilotage_agence.indicateurs',
    actions_a_mener: 'pilotage_agence.actions_a_mener',
    diffusion: 'pilotage_agence.diffusion',
    exports: 'pilotage_agence.exports',
  },
  reseau_franchiseur: {
    dashboard: 'reseau_franchiseur.dashboard',
    stats: 'reseau_franchiseur.stats',
    agences: 'reseau_franchiseur.agences',
    redevances: 'reseau_franchiseur.redevances',
    comparatifs: 'reseau_franchiseur.comparatifs',
  },
  support: {
    user: 'support.user',      // Créer des tickets utilisateur
    agent: 'support.agent',    // Répondre aux tickets (support N1-N3)
    admin: 'support.admin',    // Gérer l'équipe support
  },
  admin_plateforme: {
    users: 'admin_plateforme.users',
    agencies: 'admin_plateforme.agencies',
    permissions: 'admin_plateforme.permissions',
    backup: 'admin_plateforme.backup',
    logs: 'admin_plateforme.logs',
  },
  apogee_tickets: {
    kanban: 'apogee_tickets.kanban',
    import: 'apogee_tickets.import',
    manage: 'apogee_tickets.manage',
  },
  rh_parc: {
    rh: 'rh_parc.rh',           // Documents RH, salaires, contrats
    parc: 'rh_parc.parc',       // Flotte, EPI, équipements
    coffre: 'rh_parc.coffre',   // Coffre-fort salarié (mon coffre RH)
  },
} as const;

export type ModuleOptionPath = typeof MODULE_OPTIONS[ModuleKey][keyof typeof MODULE_OPTIONS[ModuleKey]];

// Métadonnées des modules pour l'UI
export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  defaultForRoles: GlobalRole[]; // Rôles qui ont ce module par défaut
  minRole: GlobalRole;           // Rôle minimum pour pouvoir activer ce module
  options: ModuleOptionDefinition[];
}

export interface ModuleOptionDefinition {
  key: string;
  path: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

// Configuration complète des modules
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: 'help_academy',
    label: 'Help! Academy',
    description: 'Accès aux guides Apogée, Apporteurs et HelpConfort',
    icon: 'BookOpen',
    defaultForRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'apogee', path: 'help_academy.apogee', label: 'Guide Apogée', description: 'Accès au guide Apogée', defaultEnabled: true },
      { key: 'apporteurs', path: 'help_academy.apporteurs', label: 'Guide Apporteurs', description: 'Accès au guide Apporteurs', defaultEnabled: true },
      { key: 'helpconfort', path: 'help_academy.helpconfort', label: 'Guide HelpConfort', description: 'Accès au guide HelpConfort', defaultEnabled: false },
      { key: 'base_documentaire', path: 'help_academy.base_documentaire', label: 'Base documentaire', description: 'Accès aux documents téléchargeables', defaultEnabled: true },
      { key: 'edition', path: 'help_academy.edition', label: 'Mode édition', description: 'Modifier le contenu des guides', defaultEnabled: false },
    ],
  },
  {
    key: 'pilotage_agence',
    label: 'Pilotage Agence',
    description: 'Statistiques, actions à mener et diffusion',
    icon: 'BarChart3',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_user',
    options: [
      { key: 'indicateurs', path: 'pilotage_agence.indicateurs', label: 'Mes indicateurs', description: 'KPIs et statistiques agence', defaultEnabled: true },
      { key: 'actions_a_mener', path: 'pilotage_agence.actions_a_mener', label: 'Actions à mener', description: 'Liste des actions prioritaires', defaultEnabled: true },
      { key: 'diffusion', path: 'pilotage_agence.diffusion', label: 'Écran diffusion', description: 'Affichage sur écran TV', defaultEnabled: true },
      { key: 'exports', path: 'pilotage_agence.exports', label: 'Exports', description: 'Export des données', defaultEnabled: false },
    ],
  },
  {
    key: 'reseau_franchiseur',
    label: 'Réseau Franchiseur',
    description: 'Vision multi-agences pour le franchiseur',
    icon: 'Network',
    defaultForRoles: ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisor_user',
    options: [
      { key: 'dashboard', path: 'reseau_franchiseur.dashboard', label: 'Dashboard', description: 'Vue d\'ensemble réseau', defaultEnabled: true },
      { key: 'stats', path: 'reseau_franchiseur.stats', label: 'Statistiques', description: 'KPIs consolidés réseau', defaultEnabled: true },
      { key: 'agences', path: 'reseau_franchiseur.agences', label: 'Gestion agences', description: 'Fiches et paramètres agences', defaultEnabled: true },
      { key: 'redevances', path: 'reseau_franchiseur.redevances', label: 'Redevances', description: 'Calcul et suivi des redevances', defaultEnabled: false },
      { key: 'comparatifs', path: 'reseau_franchiseur.comparatifs', label: 'Comparatifs', description: 'Comparaison inter-agences', defaultEnabled: true },
    ],
  },
  {
    key: 'support',
    label: 'Support',
    description: 'Tickets et assistance utilisateurs',
    icon: 'MessageSquare',
    defaultForRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'user', path: 'support.user', label: 'Créer tickets', description: 'Créer et suivre ses propres tickets', defaultEnabled: true },
      { key: 'agent', path: 'support.agent', label: 'Agent support', description: 'Répondre aux tickets des utilisateurs', defaultEnabled: false },
      { key: 'admin', path: 'support.admin', label: 'Admin support', description: 'Gérer l\'équipe et les escalades', defaultEnabled: false },
    ],
  },
  {
    key: 'admin_plateforme',
    label: 'Administration',
    description: 'Gestion de la plateforme',
    icon: 'Settings',
    defaultForRoles: ['platform_admin', 'superadmin'],
    minRole: 'platform_admin',
    options: [
      { key: 'users', path: 'admin_plateforme.users', label: 'Utilisateurs', description: 'Gestion des comptes utilisateurs', defaultEnabled: true },
      { key: 'agencies', path: 'admin_plateforme.agencies', label: 'Agences', description: 'Configuration des agences', defaultEnabled: true },
      { key: 'permissions', path: 'admin_plateforme.permissions', label: 'Permissions', description: 'Rôles et droits d\'accès', defaultEnabled: true },
      { key: 'backup', path: 'admin_plateforme.backup', label: 'Sauvegardes', description: 'Import/export de données', defaultEnabled: true },
      { key: 'logs', path: 'admin_plateforme.logs', label: 'Logs', description: 'Journaux d\'activité', defaultEnabled: false },
    ],
  },
  {
    key: 'apogee_tickets',
    label: 'Suivi Dev',
    description: 'Suivi du développement Apogée (tickets, Kanban)',
    icon: 'Kanban',
    defaultForRoles: ['platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'kanban', path: 'apogee_tickets.kanban', label: 'Kanban', description: 'Tableau Kanban des tickets', defaultEnabled: true },
      { key: 'import', path: 'apogee_tickets.import', label: 'Import', description: 'Import depuis fichiers Excel', defaultEnabled: true },
      { key: 'manage', path: 'apogee_tickets.manage', label: 'Gestion', description: 'Créer et gérer les tickets', defaultEnabled: true },
    ],
  },
  {
    key: 'rh_parc',
    label: 'RH & Parc',
    description: 'Gestion RH et parc véhicules/équipements',
    icon: 'Briefcase',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'rh', path: 'rh_parc.rh', label: 'Gestion RH', description: 'Documents RH, salaires, contrats', defaultEnabled: true },
      { key: 'parc', path: 'rh_parc.parc', label: 'Parc', description: 'Flotte véhicules, EPI, équipements', defaultEnabled: true },
      { key: 'coffre', path: 'rh_parc.coffre', label: 'Coffre-fort salarié', description: 'Accès aux documents personnels', defaultEnabled: true },
    ],
  },
];

// Structure de stockage des modules activés (JSONB dans profiles)
export interface EnabledModules {
  help_academy?: boolean | ModuleOptionsState;
  pilotage_agence?: boolean | ModuleOptionsState;
  reseau_franchiseur?: boolean | ModuleOptionsState;
  support?: boolean | ModuleOptionsState;
  admin_plateforme?: boolean | ModuleOptionsState;
  apogee_tickets?: boolean | ModuleOptionsState;
  rh_parc?: boolean | ModuleOptionsState;
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
  if (typeof moduleState === 'boolean') return moduleState; // Si module = true, toutes options actives
  if (typeof moduleState === 'object') {
    if (!moduleState.enabled) return false;
    // Si options non définies, utiliser les défauts
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
      // Activer le module avec ses options par défaut
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
