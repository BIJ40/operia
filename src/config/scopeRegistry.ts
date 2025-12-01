/**
 * P3.1 - Centralized Scope Registry
 * Single source of truth for all scopes in the application
 */

export const SCOPE_SLUGS = {
  // Help Academy
  HELP_ACADEMY_APOGEE: 'help_academy_apogee',
  HELP_ACADEMY_APPORTEURS: 'help_academy_apporteurs',
  HELP_ACADEMY_HELPCONFORT: 'help_academy_helpconfort',
  HELP_ACADEMY_DOCUMENTS: 'help_academy_documents',

  // Pilotage Agence
  PILOTAGE_MES_INDICATEURS: 'pilotage_mes_indicateurs',
  PILOTAGE_ACTIONS_A_MENER: 'pilotage_actions_a_mener',
  PILOTAGE_DIFFUSION: 'pilotage_diffusion',

  // Support
  SUPPORT_MES_DEMANDES: 'support_mes_demandes',
  SUPPORT_CONSOLE: 'support_console',

  // Réseau Franchiseur
  FRANCHISEUR_DASHBOARD: 'franchiseur_dashboard',
  FRANCHISEUR_KPI: 'franchiseur_kpi',
  FRANCHISEUR_AGENCIES: 'franchiseur_agencies',
  FRANCHISEUR_ROYALTIES: 'franchiseur_royalties',

  // Administration
  ADMIN_USERS: 'admin_users',
  ADMIN_ROLES: 'admin_roles',
  ADMIN_BACKUP: 'admin_backup',
  ADMIN_SYSTEM: 'admin_system',
  ADMIN_CHATBOT_RAG: 'admin_chatbot_rag',
  ADMIN_AGENCIES: 'admin_agencies',
  ADMIN_ANNOUNCEMENTS: 'admin_announcements',

  // Apogée Ticketing
  APOGEE_TICKETS_KANBAN: 'apogee_tickets_kanban',
  APOGEE_TICKETS_MANAGE: 'apogee_tickets_manage',
  APOGEE_TICKETS_IMPORT: 'apogee_tickets_import',
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
