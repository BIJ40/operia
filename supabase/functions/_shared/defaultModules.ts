/**
 * Default modules configuration by global role
 * Used in create-user edge function to assign initial modules
 * 
 * IMPORTANT: franchisee_admin modules are for DIRIGEANTS only.
 * Commercial, assistante, etc. employees use franchisee_employee defaults.
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

/**
 * Roles agence considérés comme "dirigeant" (accès complet N2)
 * Tout autre role_agence est un employé avec accès restreint
 */
const DIRIGEANT_ROLES = ['dirigeant', 'gérant', 'gerant', 'associé', 'associe'];

/**
 * Modules par défaut pour les EMPLOYÉS d'agence (commercial, assistante, etc.)
 * Accès minimal : uniquement médiathèque et support utilisateur
 */
const AGENCY_EMPLOYEE_MODULES: EnabledModules = {
  help_academy: { enabled: true, options: {} },
  support: { enabled: true, options: { agent: false } },
  guides: { enabled: true, options: { apogee: true } },
};

const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  base_user: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
  },
  franchisee_user: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    guides: { enabled: true, options: { apogee: true } },
  },
  // ATTENTION: Ces modules sont pour les DIRIGEANTS uniquement
  // Pour les employés (commercial, assistante), utiliser getDefaultModulesForCreation()
  franchisee_admin: {
    help_academy: { enabled: true, options: {} },
    support: { enabled: true, options: { agent: false } },
    pilotage_agence: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
    guides: { enabled: true, options: { apogee: true } },
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

/**
 * Legacy: modules par défaut basés uniquement sur le rôle global
 */
export function getDefaultModulesForRole(role: string): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role as GlobalRole] || DEFAULT_MODULES_BY_ROLE.base_user;
}

/**
 * NEW: modules par défaut tenant compte du role_agence
 * Un commercial N2 ne doit PAS avoir les mêmes modules qu'un dirigeant N2
 */
export function getDefaultModulesForCreation(globalRole: string, roleAgence: string | null): EnabledModules {
  // Pour N2 (franchisee_admin), distinguer dirigeant vs employé
  if (globalRole === 'franchisee_admin' && roleAgence) {
    const normalizedRole = roleAgence.toLowerCase().trim();
    if (!DIRIGEANT_ROLES.includes(normalizedRole)) {
      // Employé d'agence (commercial, assistante, etc.) = accès minimal
      console.log(`[defaultModules] Employé agence détecté (${roleAgence}), modules restreints`);
      return AGENCY_EMPLOYEE_MODULES;
    }
  }
  
  return DEFAULT_MODULES_BY_ROLE[globalRole as GlobalRole] || DEFAULT_MODULES_BY_ROLE.base_user;
}
