/**
 * Types pour le module Rentabilité Dossier.
 * Phase 1 — Fondations + corrections robustesse.
 */

// ─── Enums (miroir SQL) ─────────────────────────────────────

export type CostSourceType = 'manual' | 'bulletin' | 'computed';
export type ExtractionStatus = 'pending' | 'parsed' | 'error';
export type ValidationStatus = 'pending' | 'validated' | 'rejected';
export type CostValidation = 'draft' | 'validated';
export type ProjectCostType = 'purchase' | 'subcontract' | 'travel' | 'rental' | 'misc';
export type CostInputSource = 'manual' | 'invoice_upload';
export type OverheadCostType = 'rent' | 'vehicle' | 'fuel' | 'admin' | 'software' | 'insurance' | 'other';
export type OverheadAllocationMode = 'per_project' | 'percentage_ca' | 'per_hour' | 'fixed';
export type ReliabilityLevel = 'insufficient' | 'low' | 'medium' | 'good' | 'excellent';
export type ActionabilityLevel = 'exploitable' | 'partial' | 'not_exploitable';

// ─── Table rows ──────────────────────────────────────────────

export interface EmployeeCostProfile {
  id: string;
  agency_id: string;
  collaborator_id: string;
  /** Apogée user ID — resolved via collaborators join, used for technician mapping */
  apogee_user_id: number | null;
  salary_gross_monthly: number | null;
  employer_charges_rate: number | null;
  employer_monthly_cost: number | null;
  monthly_paid_hours: number | null;
  monthly_productive_hours: number | null;
  vehicle_monthly_cost: number | null;
  fuel_monthly_cost: number | null;
  equipment_monthly_cost: number | null;
  other_monthly_costs: number | null;
  loaded_hourly_cost: number | null;
  cost_source: CostSourceType;
  effective_from: string;
  effective_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalaryDocument {
  id: string;
  agency_id: string;
  collaborator_id: string;
  file_path: string;
  period_month: string | null;
  extracted_gross_salary: number | null;
  extracted_net_salary: number | null;
  extracted_employer_cost: number | null;
  extracted_hours: number | null;
  extracted_data_json: Record<string, unknown> | null;
  extraction_status: ExtractionStatus;
  validation_status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProjectCost {
  id: string;
  agency_id: string;
  project_id: string;
  cost_type: ProjectCostType;
  description: string | null;
  cost_date: string | null;
  amount_ht: number;
  vat_rate: number | null;
  amount_ttc: number;
  source: CostInputSource;
  document_path: string | null;
  extracted_data_json: Record<string, unknown> | null;
  validation_status: CostValidation;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectCostDocument {
  id: string;
  agency_id: string;
  project_id: string;
  file_path: string;
  extracted_ht: number | null;
  extracted_vat: number | null;
  extracted_ttc: number | null;
  extracted_date: string | null;
  extracted_supplier: string | null;
  extracted_data_json: Record<string, unknown> | null;
  extraction_status: ExtractionStatus;
  validation_status: ValidationStatus;
  linked_cost_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AgencyOverheadRule {
  id: string;
  agency_id: string;
  cost_type: OverheadCostType;
  period_month: string | null;
  amount_ht: number;
  allocation_mode: OverheadAllocationMode;
  allocation_value: number;
  validation_status: CostValidation;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfitabilitySnapshot {
  id: string;
  agency_id: string;
  project_id: string;
  computed_at: string;
  ca_invoiced_ht: number;
  ca_collected_ttc: number;
  cost_labor: number;
  cost_purchases: number;
  cost_subcontracting: number;
  cost_other: number;
  cost_overhead: number;
  cost_total: number;
  gross_margin: number;
  net_margin: number;
  margin_pct: number | null;
  hours_total: number;
  completeness_score: number;
  reliability_level: ReliabilityLevel;
  flags_json: string[];
  validation_status: CostValidation;
  created_by: string | null;
  created_at: string;
  /** Hash of Apogée input data (factures + interventions) for staleness detection */
  apogee_data_hash: string | null;
  /** Timestamp of the Apogée data used for this snapshot */
  apogee_last_sync_at: string | null;
  /** Snapshot version number (incremented on each computation) */
  version: number;
  /** Link to the previous version of this snapshot */
  previous_snapshot_id: string | null;
  /** User who validated this snapshot */
  validated_by: string | null;
  /** When the snapshot was validated */
  validated_at: string | null;
}

// ─── Engine I/O ──────────────────────────────────────────────

/** Input bundle for the profitability engine */
export interface ProfitabilityInputs {
  projectId: string;
  /** Factures from Apogée API */
  factures: ProfitabilityFacture[];
  /** Interventions from Apogée API */
  interventions: ProfitabilityIntervention[];
  /** Cost profiles for technicians involved (enriched with apogee_user_id) */
  costProfiles: EmployeeCostProfile[];
  /** Manual/uploaded project costs */
  projectCosts: ProjectCost[];
  /** Agency overhead rules */
  overheadRules: AgencyOverheadRule[];
  /** Is the project considered closed/invoiced? */
  isProjectClosed: boolean;
}

/** Minimal facture shape consumed by the engine */
export interface ProfitabilityFacture {
  id: string;
  totalHT: number;
  totalTTC: number;
  typeFacture: string | null;
  paidTTC: number;
  /** Last modification timestamp for hash computation */
  updatedAt?: string | null;
}

/** Minimal intervention shape consumed by the engine */
export interface ProfitabilityIntervention {
  id: string;
  /** Apogée user IDs of assigned technicians */
  technicianIds: string[];
  hours: number;
  /** Last modification timestamp for hash computation */
  updatedAt?: string | null;
}

/** Full result output from the engine */
export interface ProfitabilityResult {
  projectId: string;

  // Revenue (actuals only)
  caInvoicedHT: number;
  caCollectedTTC: number;

  // Costs breakdown (validated only — used for margin)
  costLabor: number;
  costPurchases: number;
  costSubcontracting: number;
  costOther: number;
  costOverhead: number;
  costTotal: number;

  // Costs breakdown (all entered — for transparency)
  costPurchasesAll: number;
  costSubcontractingAll: number;
  costOtherAll: number;

  // Margins
  grossMargin: number;
  netMargin: number;
  marginPct: number | null;

  // Hours
  hoursTotal: number;

  // Reliability
  completenessScore: number;
  reliabilityLevel: ReliabilityLevel;

  // Actionability (base level — UI may downgrade further)
  actionabilityLevel: ActionabilityLevel;

  // Flags / alerts
  flags: string[];

  // Labor detail for transparency
  laborDetail: {
    technicianId: string;
    hours: number;
    hourlyRate: number;
    cost: number;
    isEstimated: boolean;
  }[];

  /** Hash of Apogée input data for staleness detection */
  apogeeDataHash: string;
  /** Timestamp of computation */
  computedAt: string;
}
