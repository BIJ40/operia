/**
 * Default modules configuration by global role
 * Used in create-user edge function to assign initial modules
 */

export interface ModuleOptions {
  [key: string]: boolean | string | number;
}

export interface EnabledModule {
  enabled: boolean;
  options: ModuleOptions;
}

export interface EnabledModules {
  [moduleKey: string]: EnabledModule;
}

type GlobalRole = 'base_user' | 'franchisee_user' | 'franchisee_admin' | 'franchisor_user' | 'franchisor_admin' | 'platform_admin' | 'superadmin';

const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  base_user: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    rh: { enabled: true, options: { coffre: true, rh_viewer: false, rh_admin: false } },
  },
  franchisee_user: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    pilotage_agence: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: false, rh_admin: false } },
  },
  franchisee_admin: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    pilotage_agence: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
  },
  franchisor_user: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    reseau_franchiseur: { enabled: true, options: {} },
    apogee_tickets: { enabled: true, options: { kanban: true, manage: false, import: false } },
  },
  franchisor_admin: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    reseau_franchiseur: { enabled: true, options: {} },
    apogee_tickets: { enabled: true, options: { kanban: true, manage: true, import: false } },
    admin_plateforme: { enabled: true, options: {} },
  },
  platform_admin: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: true } },
    pilotage_agence: { enabled: true, options: {} },
    reseau_franchiseur: { enabled: true, options: {} },
    apogee_tickets: { enabled: true, options: { kanban: true, manage: true, import: true } },
    admin_plateforme: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
  },
  superadmin: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: true } },
    pilotage_agence: { enabled: true, options: {} },
    reseau_franchiseur: { enabled: true, options: {} },
    apogee_tickets: { enabled: true, options: { kanban: true, manage: true, import: true } },
    admin_plateforme: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
    admin_faq: { enabled: true, options: {} },
  },
};

export function getDefaultModulesForRole(role: string): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role as GlobalRole] || DEFAULT_MODULES_BY_ROLE.base_user;
}
