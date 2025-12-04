/**
 * Configuration des modules par défaut selon le rôle global V2.0
 * Utilisé lors de la création d'un utilisateur pour pré-remplir enabled_modules
 */

import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, ModuleOptionsState } from '@/types/modules';

/**
 * Modules par défaut pour chaque rôle global
 * Ces valeurs sont utilisées :
 * 1. Dans le formulaire de création utilisateur (pré-remplissage)
 * 2. Dans l'edge function create-user (fallback si non spécifié)
 * 3. Dans la migration batch V2
 */
export const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  // N0 - Utilisateur de base
  base_user: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: false, helpconfort: false, base_documentaire: true, edition: false }
    },
    support: {
      enabled: true,
      options: { user: true, agent: false, admin: false }
    },
  },
  
  // N1 - Utilisateur franchisé (salarié agence)
  franchisee_user: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: false, base_documentaire: true, edition: false }
    },
    support: {
      enabled: true,
      options: { user: true, agent: false, admin: false }
    },
    rh: {
      enabled: true,
      options: { coffre: true, rh_viewer: false, rh_admin: false }
    },
  },
  
  // N2 - Admin franchisé (dirigeant agence)
  franchisee_admin: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: false }
    },
    pilotage_agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true }
    },
    support: {
      enabled: true,
      options: { user: true, agent: false, admin: false }
    },
    rh: {
      enabled: true,
      options: { coffre: false, rh_viewer: true, rh_admin: true }
    },
  },
  
  // N3 - Utilisateur franchiseur (animateur réseau)
  franchisor_user: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: false }
    },
    pilotage_agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: false, periodes: true }
    },
    support: {
      enabled: true,
      options: { user: true, agent: true, admin: false }
    },
  },
  
  // N4 - Admin franchiseur (directeur réseau)
  franchisor_admin: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true }
    },
    pilotage_agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, periodes: true }
    },
    support: {
      enabled: true,
      options: { user: true, agent: true, admin: true }
    },
  },
  
  // N5 - Admin plateforme
  platform_admin: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true }
    },
    pilotage_agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, periodes: true }
    },
    support: {
      enabled: true,
      options: { user: true, agent: true, admin: true }
    },
    admin_plateforme: {
      enabled: true,
      options: { users: true, agencies: true, permissions: true, backup: true, logs: false }
    },
  },
  
  // N6 - Superadmin
  superadmin: {
    help_academy: {
      enabled: true,
      options: { apogee: true, apporteurs: true, helpconfort: true, base_documentaire: true, edition: true }
    },
    pilotage_agence: {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true, exports: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, periodes: true }
    },
    support: {
      enabled: true,
      options: { user: true, agent: true, admin: true }
    },
    admin_plateforme: {
      enabled: true,
      options: { users: true, agencies: true, permissions: true, backup: true, logs: true }
    },
  },
};

/**
 * Obtient les modules par défaut pour un rôle donné
 */
export function getDefaultModulesForGlobalRole(role: GlobalRole): EnabledModules {
  return DEFAULT_MODULES_BY_ROLE[role] || DEFAULT_MODULES_BY_ROLE.base_user;
}
