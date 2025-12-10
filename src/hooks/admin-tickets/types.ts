/**
 * Types pour la gestion des tickets admin
 */
export interface SupportUser {
  id: string;
  first_name: string;
  last_name: string;
  global_role: string | null;
  enabled_modules: any;
  franchiseur_role?: string;
}

export interface TicketFilters {
  status: string;
  category: string;
  source: string;
  agency: string;
  heatPriorityMin: number;
  heatPriorityMax: number;
  assignment: 'all' | 'mine' | 'unassigned';
}

export const DEFAULT_PAGE_SIZE = 50;

export const DEFAULT_FILTERS: TicketFilters = {
  status: 'all',
  category: 'all',
  source: 'all',
  agency: 'all',
  heatPriorityMin: 0,
  heatPriorityMax: 12,
  assignment: 'all',
};
