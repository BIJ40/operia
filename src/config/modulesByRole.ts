/**
 * Configuration des modules par défaut selon le rôle global V3.0
 * Utilisé lors de la création d'un utilisateur pour pré-remplir les modules
 */

import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, ModuleOptionsState } from '@/types/modules';

export const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  base_user: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: false, apporteurs: false }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: false }
    },
  },
  
  franchisee_user: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: false, apporteurs: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: false }
    },
    rh: {
      enabled: true,
      options: { rh_viewer: false, rh_admin: false }
    },
  },
  
  franchisee_admin: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true }
    },
    agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: false }
    },
    rh: {
      enabled: true,
      options: { rh_viewer: true, rh_admin: true }
    },
  },
  
  franchisor_user: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: false, comparatifs: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: true }
    },
  },
  
  franchisor_admin: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: true }
    },
  },
  
  platform_admin: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: true }
    },
    admin_plateforme: {
      enabled: true,
      options: { users: true, agencies: true, permissions: true }
    },
  },
  
  superadmin: {
    guides: {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    aide: {
      enabled: true,
      options: { user: true, agent: true }
    },
    admin_plateforme: {
      enabled: true,
      options: { users: true, agencies: true, permissions: true }
    },
  },
};

export function getDefaultModulesForGlobalRole(role: GlobalRole): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role] || DEFAULT_MODULES_BY_ROLE.base_user;
}
