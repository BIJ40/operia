/**
 * Configuration des modules par défaut selon le rôle global V3.0
 * Phase 8: Migré vers clés hiérarchiques
 */

import { GlobalRole } from '@/types/globalRoles';
import { EnabledModules, ModuleOptionsState } from '@/types/modules';

export const DEFAULT_MODULES_BY_ROLE: Record<GlobalRole, EnabledModules> = {
  base_user: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: false, apporteurs: false }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: false }
    },
  },
  
  franchisee_user: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: false, apporteurs: true }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: false }
    },
    'organisation.salaries': {
      enabled: true,
      options: { rh_viewer: false, rh_admin: false }
    },
  },
  
  franchisee_admin: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true }
    },
    'pilotage.agence': {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: false }
    },
    'organisation.salaries': {
      enabled: true,
      options: { rh_viewer: true, rh_admin: true }
    },
  },
  
  franchisor_user: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: false, comparatifs: true }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: true }
    },
  },
  
  franchisor_admin: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: true }
    },
  },
  
  platform_admin: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    'pilotage.agence': {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    'support.aide_en_ligne': {
      enabled: true,
      options: { user: true, agent: true }
    },
    admin_plateforme: {
      enabled: true,
      options: { users: true, agencies: true, permissions: true }
    },
  },
  
  superadmin: {
    'support.guides': {
      enabled: true,
      options: { apogee: true, helpconfort: true, apporteurs: true, edition: true }
    },
    'pilotage.agence': {
      enabled: true,
      options: { indicateurs: true, actions_a_mener: true, diffusion: true }
    },
    reseau_franchiseur: {
      enabled: true,
      options: { dashboard: true, stats: true, agences: true, redevances: true, comparatifs: true }
    },
    'support.aide_en_ligne': {
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
