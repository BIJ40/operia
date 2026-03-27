/**
 * Default modules configuration by global role
 * Used in create-user edge function to assign initial modules
 * 
 * IMPORTANT: franchisee_admin modules are for DIRIGEANTS only.
 * Commercial, administratif, etc. employees use franchisee_employee defaults.
 * 
 * V2: Clés canoniques (guides, aide, agence, ticketing)
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
 * Presets de modules par poste pour les N1 (franchisee_user)
 * Appliqués automatiquement à la création du compte
 */
const N1_ROLE_PRESETS: Record<string, string[]> = {
  commercial: [
    'commercial.suivi_client', 'commercial.comparateur',
    'commercial.prospects', 'commercial.realisations',
    'support.guides', 'support.aide_en_ligne',
  ],
  administratif: [
    'organisation.salaries', 'organisation.plannings',
    'organisation.documents_legaux',
    'mediatheque.consulter', 'mediatheque.documents',
    'support.guides', 'support.aide_en_ligne',
  ],
  technicien: [
    'support.guides', 'support.aide_en_ligne',
  ],
};

/**
 * Convertit une liste de clés modules en EnabledModules
 */
function presetToEnabledModules(keys: string[]): EnabledModules {
  const result: EnabledModules = {};
  for (const key of keys) {
    result[key] = { enabled: true, options: {} };
  }
  return result;
}

/**
 * Modules par défaut pour les EMPLOYÉS d'agence (commercial, administratif, etc.)
 * Accès minimal : uniquement guides et support utilisateur
 */
const AGENCY_EMPLOYEE_MODULES: EnabledModules = {
  guides: { enabled: true, options: { apogee: true } },
  aide: { enabled: true, options: { agent: false } },
};

const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  base_user: {
    guides: { enabled: true, options: {} },
    aide: { enabled: true, options: { agent: false } },
  },
  // N1 = zéro module par défaut. Tout accès piloté par le N2 via droits équipe.
  franchisee_user: {},
  // ATTENTION: Ces modules sont pour les DIRIGEANTS uniquement
  franchisee_admin: {
    guides: { enabled: true, options: { apogee: true } },
    aide: { enabled: true, options: { agent: false } },
    agence: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
  },
  franchisor_user: {
    guides: { enabled: true, options: {} },
    aide: { enabled: true, options: { agent: false } },
    // reseau_franchiseur retiré — interface de rôle (N3+), pas un module standard
  },
  franchisor_admin: {
    guides: { enabled: true, options: {} },
    aide: { enabled: true, options: { agent: false } },
    // reseau_franchiseur retiré — interface de rôle (N3+), pas un module standard
    admin_plateforme: { enabled: true, options: {} },
  },
  platform_admin: {
    guides: { enabled: true, options: {} },
    aide: { enabled: true, options: { agent: true } },
    agence: { enabled: true, options: {} },
    // reseau_franchiseur retiré — interface de rôle (N3+), pas un module standard
    admin_plateforme: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
  },
  superadmin: {
    guides: { enabled: true, options: {} },
    aide: { enabled: true, options: { agent: true } },
    agence: { enabled: true, options: {} },
    // reseau_franchiseur retiré — interface de rôle (N3+), pas un module standard
    admin_plateforme: { enabled: true, options: {} },
    rh: { enabled: true, options: { coffre: true, rh_viewer: true, rh_admin: true } },
    parc: { enabled: true, options: {} },
  },
};

/**
 * Modules par défaut basés sur le rôle global
 */
export function getDefaultModulesForRole(role: string): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role as GlobalRole] || DEFAULT_MODULES_BY_ROLE.base_user;
}

/**
 * Modules par défaut tenant compte du role_agence
 * Un commercial N2 ne doit PAS avoir les mêmes modules qu'un dirigeant N2
 */
export function getDefaultModulesForCreation(globalRole: string, roleAgence: string | null): EnabledModules {
  // N1 avec poste connu → preset par poste
  if (globalRole === 'franchisee_user' && roleAgence) {
    const normalizedRole = roleAgence.toLowerCase().trim();
    const preset = N1_ROLE_PRESETS[normalizedRole];
    if (preset) {
      console.log(`[defaultModules] N1 avec poste "${roleAgence}" → preset spécifique (${preset.length} modules)`);
      return presetToEnabledModules(preset);
    }
  }

  // N2 : dirigeant vs employé agence
  if (globalRole === 'franchisee_admin' && roleAgence) {
    const normalizedRole = roleAgence.toLowerCase().trim();
    if (!DIRIGEANT_ROLES.includes(normalizedRole)) {
      console.log(`[defaultModules] Employé agence détecté (${roleAgence}), modules restreints`);
      return AGENCY_EMPLOYEE_MODULES;
    }
  }
  
  return DEFAULT_MODULES_BY_ROLE[globalRole as GlobalRole] || DEFAULT_MODULES_BY_ROLE.base_user;
}
