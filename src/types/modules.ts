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
  rh: 'rh',     // Module RH séparé
  parc: 'parc', // Module Parc séparé
  messaging: 'messaging', // Chat interne
  unified_search: 'unified_search', // Barre de recherche unifiée (Stats + Docs)
} as const;

export type ModuleKey = keyof typeof MODULES;

// Sous-options par module
export const MODULE_OPTIONS = {
  help_academy: {
    apogee: 'help_academy.apogee',
    helpconfort: 'help_academy.helpconfort',
    apporteurs: 'help_academy.apporteurs',
    edition: 'help_academy.edition',
  },
  pilotage_agence: {
    indicateurs: 'pilotage_agence.indicateurs',
    stats_hub: 'pilotage_agence.stats_hub',
    actions_a_mener: 'pilotage_agence.actions_a_mener',
    diffusion: 'pilotage_agence.diffusion',
    exports: 'pilotage_agence.exports',
    veille_apporteurs: 'pilotage_agence.veille_apporteurs',
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
    faq_admin: 'admin_plateforme.faq_admin', // Admin FAQ sans accès /admin complet
  },
  apogee_tickets: {
    kanban: 'apogee_tickets.kanban',
    import: 'apogee_tickets.import',
    manage: 'apogee_tickets.manage',
  },
  rh: {
    coffre: 'rh.coffre',           // Coffre-fort salarié (accès perso uniquement)
    mon_planning: 'rh.mon_planning', // Accès à son planning personnel
    mon_vehicule: 'rh.mon_vehicule', // Accès à son véhicule assigné
    mon_materiel: 'rh.mon_materiel', // Accès à son matériel assigné
    rh_viewer: 'rh.rh_viewer',     // Gestion RH opérationnelle (sans paie)
    rh_admin: 'rh.rh_admin',       // Administration RH complète (paie incluse)
  },
  parc: {
    vehicules: 'parc.vehicules',     // Gestion flotte véhicules
    epi: 'parc.epi',                 // Gestion EPI
    equipements: 'parc.equipements', // Autres équipements
  },
  messaging: {
    dm: 'messaging.dm',       // Messages directs
    groups: 'messaging.groups', // Groupes de discussion
  },
  unified_search: {
    stats: 'unified_search.stats',  // Recherche statistiques
    docs: 'unified_search.docs',    // Recherche documentaire
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
  routes?: string[]; // Pages/routes concernées par cette option
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
      { key: 'apogee', path: 'help_academy.apogee', label: 'Apogée', description: 'Guide du logiciel Apogée', defaultEnabled: true, routes: ['/apogee'] },
      { key: 'helpconfort', path: 'help_academy.helpconfort', label: 'HelpConfort', description: 'Guide des procédures HelpConfort', defaultEnabled: false, routes: ['/helpconfort'] },
      { key: 'apporteurs', path: 'help_academy.apporteurs', label: 'Apporteurs', description: 'Guide des prescripteurs', defaultEnabled: true, routes: ['/apporteurs'] },
      { key: 'edition', path: 'help_academy.edition', label: 'Mode édition', description: 'Modifier le contenu des guides', defaultEnabled: false, routes: [] },
    ],
  },
  {
    key: 'pilotage_agence',
    label: 'Pilotage Agence',
    description: 'Statistiques, actions à mener et diffusion',
    icon: 'BarChart3',
    // N3/N4 exclus : ils n'ont pas d'agence propre, ils utilisent reseau_franchiseur
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_user',
    options: [
      { key: 'indicateurs', path: 'pilotage_agence.indicateurs', label: 'Vue d\'ensemble', description: 'Page d\'accueil avec KPIs principaux', defaultEnabled: true, routes: ['/hc-agency'] },
      { key: 'stats_hub', path: 'pilotage_agence.stats_hub', label: 'Stats Hub', description: 'Tableaux de bord avancés', defaultEnabled: false, routes: ['/hc-agency/stats-hub'] },
      { key: 'veille_apporteurs', path: 'pilotage_agence.veille_apporteurs', label: 'Veille Apporteurs', description: 'Surveillance des apporteurs', defaultEnabled: false, routes: ['/hc-agency/veille-apporteurs'] },
      { key: 'actions_a_mener', path: 'pilotage_agence.actions_a_mener', label: 'Actions à mener', description: 'Liste des actions prioritaires', defaultEnabled: true, routes: ['/hc-agency/actions'] },
      { key: 'diffusion', path: 'pilotage_agence.diffusion', label: 'Écran diffusion', description: 'Affichage sur écran TV', defaultEnabled: true, routes: ['/hc-agency/diffusion'] },
      { key: 'exports', path: 'pilotage_agence.exports', label: 'Exports', description: 'Export des données', defaultEnabled: false, routes: ['/hc-agency/exports'] },
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
      { key: 'dashboard', path: 'reseau_franchiseur.dashboard', label: 'Dashboard', description: 'Vue d\'ensemble réseau', defaultEnabled: true, routes: ['/hc-reseau'] },
      { key: 'stats', path: 'reseau_franchiseur.stats', label: 'Statistiques', description: 'KPIs consolidés réseau', defaultEnabled: true, routes: ['/hc-reseau/tableaux'] },
      { key: 'agences', path: 'reseau_franchiseur.agences', label: 'Gestion agences', description: 'Fiches et paramètres agences', defaultEnabled: true, routes: ['/hc-reseau/agences'] },
      { key: 'redevances', path: 'reseau_franchiseur.redevances', label: 'Redevances', description: 'Calcul et suivi des redevances', defaultEnabled: false, routes: ['/hc-reseau/redevances'] },
      { key: 'comparatifs', path: 'reseau_franchiseur.comparatifs', label: 'Comparatifs', description: 'Comparaison inter-agences', defaultEnabled: true, routes: ['/hc-reseau/comparatif'] },
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
      { key: 'user', path: 'support.user', label: 'Créer tickets', description: 'Créer et suivre ses propres tickets', defaultEnabled: true, routes: ['/support', '/support/mes-demandes'] },
      { key: 'agent', path: 'support.agent', label: 'Agent support', description: 'Répondre aux tickets des utilisateurs', defaultEnabled: false, routes: ['/admin/support'] },
      { key: 'admin', path: 'support.admin', label: 'Admin support', description: 'Gérer l\'équipe et les escalades', defaultEnabled: false, routes: ['/admin/support/team'] },
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
      { key: 'users', path: 'admin_plateforme.users', label: 'Utilisateurs', description: 'Gestion des comptes utilisateurs', defaultEnabled: true, routes: ['/admin/utilisateurs'] },
      { key: 'agencies', path: 'admin_plateforme.agencies', label: 'Agences', description: 'Configuration des agences', defaultEnabled: true, routes: ['/admin/agences'] },
      { key: 'permissions', path: 'admin_plateforme.permissions', label: 'Permissions', description: 'Rôles et droits d\'accès', defaultEnabled: true, routes: ['/admin/droits'] },
      { key: 'backup', path: 'admin_plateforme.backup', label: 'Sauvegardes', description: 'Import/export de données', defaultEnabled: true, routes: ['/admin/backup'] },
      { key: 'logs', path: 'admin_plateforme.logs', label: 'Logs', description: 'Journaux d\'activité', defaultEnabled: false, routes: ['/admin/logs'] },
      { key: 'faq_admin', path: 'admin_plateforme.faq_admin', label: 'Admin FAQ', description: 'Gestion de la FAQ', defaultEnabled: false, routes: ['/admin/faq'] },
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
      { key: 'kanban', path: 'apogee_tickets.kanban', label: 'Kanban', description: 'Accès au tableau Kanban et création de tickets', defaultEnabled: true, routes: ['/gestion-projet'] },
      { key: 'import', path: 'apogee_tickets.import', label: 'Import', description: 'Import depuis fichiers Excel', defaultEnabled: false, routes: ['/gestion-projet/import'] },
      { key: 'manage', path: 'apogee_tickets.manage', label: 'Modifier tickets', description: 'Modifier priorité, statut, contenu des tickets existants (désactiver = lecture + création seules)', defaultEnabled: true, routes: ['/gestion-projet'] },
    ],
  },
  {
    key: 'rh',
    label: 'RH',
    description: 'Gestion des ressources humaines',
    icon: 'Briefcase',
    // N3/N4 exclus : ils ne gèrent pas de collaborateurs, c'est un module agence
    // N1 inclus pour l'option coffre (accès perso uniquement)
    defaultForRoles: ['franchisee_user', 'franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'base_user',
    options: [
      { key: 'coffre', path: 'rh.coffre', label: 'Mon Coffre RH', description: 'Accès à ses propres documents RH', defaultEnabled: false, routes: ['/rh/coffre'] },
      { key: 'mon_planning', path: 'rh.mon_planning', label: 'Mon Planning', description: 'Accès à son planning personnel', defaultEnabled: false, routes: ['/rh/mon-planning'] },
      { key: 'mon_vehicule', path: 'rh.mon_vehicule', label: 'Mon Véhicule', description: 'Accès à son véhicule assigné', defaultEnabled: false, routes: ['/rh/mon-vehicule'] },
      { key: 'mon_materiel', path: 'rh.mon_materiel', label: 'Mon Matériel', description: 'Accès à son matériel assigné', defaultEnabled: false, routes: ['/rh/mon-materiel'] },
      { key: 'rh_viewer', path: 'rh.rh_viewer', label: 'Gestionnaire RH', description: 'Documents et demandes équipe', defaultEnabled: false, routes: ['/rh/equipe'] },
      { key: 'rh_admin', path: 'rh.rh_admin', label: 'Admin RH', description: 'Gestion complète : salaires, contrats', defaultEnabled: false, routes: ['/rh/suivi'] },
    ],
  },
  {
    key: 'parc',
    label: 'Parc',
    description: 'Gestion flotte véhicules et équipements',
    icon: 'Truck',
    // N3/N4 exclus : ils ne gèrent pas de flotte, c'est un module agence
    defaultForRoles: ['franchisee_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_user',
    options: [
      { key: 'vehicules', path: 'parc.vehicules', label: 'Véhicules', description: 'Gestion flotte véhicules', defaultEnabled: true, routes: ['/parc/vehicules'] },
      { key: 'epi', path: 'parc.epi', label: 'EPI', description: 'Équipements de protection', defaultEnabled: true, routes: ['/parc/epi'] },
      { key: 'equipements', path: 'parc.equipements', label: 'Équipements', description: 'Autres équipements', defaultEnabled: true, routes: ['/parc/equipements'] },
    ],
  },
  {
    key: 'messaging',
    label: 'Messagerie interne',
    description: 'Chat interne entre utilisateurs',
    icon: 'MessageCircle',
    defaultForRoles: ['franchisee_user', 'franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_user',
    options: [
      { key: 'dm', path: 'messaging.dm', label: 'Messages directs', description: 'Conversations privées', defaultEnabled: true, routes: ['/messages'] },
      { key: 'groups', path: 'messaging.groups', label: 'Groupes', description: 'Groupes de discussion', defaultEnabled: true, routes: ['/messages/groups'] },
    ],
  },
  {
    key: 'unified_search',
    label: 'Recherche unifiée',
    description: 'Barre de recherche intelligente (stats + docs)',
    icon: 'Sparkles',
    defaultForRoles: ['franchisee_admin', 'franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'],
    minRole: 'franchisee_user',
    options: [
      { key: 'stats', path: 'unified_search.stats', label: 'Recherche Stats', description: 'Questions sur les statistiques', defaultEnabled: true, routes: [] },
      { key: 'docs', path: 'unified_search.docs', label: 'Recherche Docs', description: 'Recherche documentation', defaultEnabled: true, routes: [] },
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
  rh?: boolean | ModuleOptionsState;
  parc?: boolean | ModuleOptionsState;
  messaging?: boolean | ModuleOptionsState;
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
  const roleLevel = GLOBAL_ROLES[role];
  
  for (const moduleDef of MODULE_DEFINITIONS) {
    if (moduleDef.defaultForRoles.includes(role)) {
      // Activer le module avec ses options par défaut
      const options: Record<string, boolean> = {};
      for (const opt of moduleDef.options) {
        // Cas spécial pour le module RH
        if (moduleDef.key === 'rh') {
          // N2+ (franchisee_admin+): rh_viewer et rh_admin activés, mais PAS coffre
          if (roleLevel >= GLOBAL_ROLES.franchisee_admin) {
            options[opt.key] = opt.key === 'coffre' ? false : true;
          } else {
            // N0/N1: coffre activé, rh_viewer/rh_admin désactivés
            options[opt.key] = opt.key === 'coffre' ? true : false;
          }
        } else {
          options[opt.key] = opt.defaultEnabled;
        }
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
