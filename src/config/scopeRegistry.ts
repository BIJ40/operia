/**
 * P3.1 - Centralized Scope Registry
 * Single source of truth for all scopes in the application
 * 
 * IMPORTANT: Ces slugs doivent correspondre EXACTEMENT aux valeurs utilisées
 * dans dashboardTiles.ts, roleMatrix.ts, et partout dans l'app
 */

export const SCOPE_SLUGS = {
  // Help Academy
  APOGEE: 'apogee',
  APPORTEURS: 'apporteurs',
  BASE_DOCUMENTAIRE: 'base_documentaire',

  // Pilotage Agence
  MES_INDICATEURS: 'mes_indicateurs',
  ACTIONS_A_MENER: 'actions_a_mener',
  DIFFUSION: 'diffusion',
  RH_TECH: 'rh_tech',
  MON_EQUIPE: 'mon_equipe',
  MON_COFFRE_RH: 'mon_coffre_rh',
  DEMANDES_RH: 'demandes_rh',

  // Support
  MES_DEMANDES: 'mes_demandes',
  SUPPORT_TICKETS: 'support_tickets',

  // Réseau Franchiseur
  FRANCHISEUR_DASHBOARD: 'franchiseur_dashboard',
  FRANCHISEUR_AGENCIES: 'franchiseur_agencies',
  FRANCHISEUR_KPI: 'franchiseur_kpi',
  FRANCHISEUR_ROYALTIES: 'franchiseur_royalties',

  // Administration
  ADMIN_USERS: 'admin_users',
  ADMIN_BACKUP: 'admin_backup',
  ADMIN_SETTINGS: 'admin_settings',

  // Apogée Ticketing
  APOGEE_TICKETS: 'apogee_tickets',
} as const;

export type ScopeSlug = typeof SCOPE_SLUGS[keyof typeof SCOPE_SLUGS];

/**
 * All valid scope slugs as array
 */
export const ALL_SCOPES = Object.values(SCOPE_SLUGS);

/**
 * Validate if a string is a valid scope slug
 */
export function isValidScope(slug: string): slug is ScopeSlug {
  return ALL_SCOPES.includes(slug as ScopeSlug);
}
