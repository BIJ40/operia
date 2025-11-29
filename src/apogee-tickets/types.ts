/**
 * Types pour le module Ticketing Apogée
 */

export interface ApogeeTicketStatus {
  id: string;
  label: string;
  display_order: number;
  is_final: boolean;
  color: string;
  created_at: string;
}

export interface ApogeeModule {
  id: string;
  label: string;
  color: string;
  display_order: number;
  created_at: string;
}

export interface ApogeePriority {
  id: string;
  label: string;
  display_order: number;
  color: string;
  created_at: string;
}

export type OwnerSide = 'HC' | 'APOGEE' | 'PARTAGE';
export type Severity = 'CRITIQUE' | 'MAJEUR' | 'CONFORT';
export type CreatedFrom = 'IMPORT' | 'MANUAL';
export type AuthorType = 'HC' | 'APOGEE' | 'DYN' | 'AUTRE';

export interface ApogeeTicket {
  id: string;
  source_sheet: string | null;
  source_row_index: number | null;
  external_key: string | null;
  element_concerne: string;
  module: string | null;
  priority: string | null;
  action_type: string | null;
  kanban_status: string;
  owner_side: OwnerSide | null;
  h_min: number | null;
  h_max: number | null;
  hca_code: string | null;
  description: string | null;
  apogee_status_raw: string | null;
  hc_status_raw: string | null;
  module_area: string | null;
  severity: Severity | null;
  needs_completion: boolean;
  created_by_user_id: string | null;
  created_from: CreatedFrom;
  created_at: string;
  updated_at: string;
  // Relations
  apogee_modules?: ApogeeModule;
  apogee_priorities?: ApogeePriority;
  apogee_ticket_statuses?: ApogeeTicketStatus;
  _count?: { comments: number };
}

export interface ApogeeTicketComment {
  id: string;
  ticket_id: string;
  author_type: AuthorType;
  author_name: string | null;
  source_field: string | null;
  body: string;
  is_internal: boolean;
  created_by_user_id: string | null;
  created_at: string;
  // Relations
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  };
}

export interface ApogeeTicketInsert {
  element_concerne: string;
  module?: string | null;
  priority?: string | null;
  action_type?: string | null;
  kanban_status?: string;
  owner_side?: OwnerSide | null;
  h_min?: number | null;
  h_max?: number | null;
  hca_code?: string | null;
  description?: string | null;
  source_sheet?: string | null;
  source_row_index?: number | null;
  external_key?: string | null;
  apogee_status_raw?: string | null;
  hc_status_raw?: string | null;
  module_area?: string | null;
  created_from?: CreatedFrom;
}

export interface ApogeeTicketCommentInsert {
  ticket_id: string;
  author_type: AuthorType;
  author_name?: string | null;
  source_field?: string | null;
  body: string;
  is_internal?: boolean;
}

// Import types
export interface ImportedRow {
  sheetName: string;
  rowIndex: number;
  data: Record<string, string | number | null>;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: string[];
}

// Kanban types
export interface KanbanColumn {
  status: ApogeeTicketStatus;
  tickets: ApogeeTicket[];
}

// Filters
export interface TicketFilters {
  module?: string;
  priority?: string;
  owner_side?: OwnerSide;
  search?: string;
  needs_completion?: boolean;
}
