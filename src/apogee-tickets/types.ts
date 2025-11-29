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

export interface ApogeeImpactTag {
  id: string;
  label: string;
  display_order: number;
  color: string;
  created_at: string;
}

export interface ApogeeOwnerSide {
  id: string;
  label: string;
  display_order: number;
  color: string;
  created_at: string;
}

// Qui porte le sujet (contrainte DB: HC, APOGEE, PARTAGE uniquement)
export type OwnerSide = 'HC' | 'APOGEE' | 'PARTAGE';
// Qui a rapporté/identifié le ticket
export type ReportedBy = 'JEROME' | 'FLORIAN' | 'ERIC' | 'APOGEE' | 'AUTRE';
export type Severity = 'CRITIQUE' | 'MAJEUR' | 'CONFORT';
export type CreatedFrom = 'IMPORT' | 'MANUAL';
// Types d'auteurs pour les commentaires (HC ou Apogée uniquement)
export type AuthorType = 'HC' | 'APOGEE';

// Types pour la qualification IA
export type TicketTheme = 
  | 'Dossiers & Projets'
  | 'Devis & Barèmes'
  | 'Facturation & Règlements / Compta'
  | 'Planning & Interventions'
  | 'Commandes & Fournisseurs'
  | 'Application Technicien & Mobile'
  | 'Notifications & Communication'
  | 'Statistiques & BI'
  | 'Workflow & Règles métier'
  | 'Paramétrage / Infra / Divers';

export type TicketType = 'bug' | 'evolution' | 'ergonomie' | 'data' | 'process';
export type PriorityNormalized = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
export type QualifStatus = 'a_qualifier' | 'reproduit' | 'spec_ok' | 'pret_dev' | 'en_dev' | 'en_test' | 'deploye' | 'obsolete';
export type ImpactTag = 'impact_facturation' | 'impact_terrain' | 'impact_rel_client' | 'impact_pilotage' | 'impact_process';

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
  // Champs qualification IA
  theme: TicketTheme | null;
  ticket_type: TicketType | null;
  impact_tags: ImpactTag[] | null;
  priority_normalized: PriorityNormalized | null;
  qualif_status: QualifStatus | null;
  notes_internes: string | null;
  is_qualified: boolean;
  qualified_at: string | null;
  qualified_by: string | null;
  // Priorité (0-12)
  heat_priority: number | null;
  // Historique qualification (textes originaux avant IA)
  original_title: string | null;
  original_description: string | null;
  // Qui a rapporté le ticket
  reported_by: ReportedBy | null;
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
  needs_completion?: boolean;
  heat_priority?: number | null;
}

export interface ApogeeTicketCommentInsert {
  ticket_id: string;
  author_type: AuthorType;
  author_name?: string | null;
  source_field?: string | null;
  body: string;
  is_internal?: boolean;
  created_by_user_id?: string | null;
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

// Filters - missing_field permet de filtrer sur les champs manquants
export type MissingFieldFilter = 'complete' | 'incomplete' | 'no_module' | 'no_heat' | 'no_hours' | 'no_description';

export interface TicketFilters {
  module?: string;
  priority?: string;
  owner_side?: OwnerSide;
  reported_by?: ReportedBy;
  search?: string;
  needs_completion?: boolean;
  is_qualified?: boolean;
  impact_tag?: string;
  heat_priority_min?: number;
  heat_priority_max?: number;
  heat_priority_exact?: number; // For clicking on a specific dot
  missing_field?: MissingFieldFilter; // Filtre sur complétude des champs
}
