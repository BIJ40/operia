/**
 * Contrat API V2 — get-apporteur-stats
 * Source de vérité des types pour la réponse enrichie.
 */

// ── Request ──────────────────────────────────────────────
export interface ApporteurStatsV2Request {
  period: 'month' | 'quarter' | '6months' | 'year' | '12months' | 'custom';
  from?: string; // YYYY-MM-DD (requis si custom)
  to?: string;   // YYYY-MM-DD (requis si custom)
  tz?: string;   // default "Europe/Paris"
}

// ── Response root ────────────────────────────────────────
export interface ApporteurStatsV2Response {
  period: { mode: string; from: string; to: string };
  kpis: ApporteurKpisV2;
  trends: Record<string, TrendValue | null>;
  repartition_univers: UniversEntry[];
  collaboration: CollaborationScore;
  alertes: AlerteEntry[];
  series_12m: Series12m;
}

// ── KPIs ─────────────────────────────────────────────────
export interface FactureCountAmount {
  count: number;
  amount: number;
}

export interface ApporteurKpisV2 {
  dossiers_en_cours: number;
  devis_envoyes: number;
  devis_valides: number;
  devis_refuses: number;
  factures_en_attente: FactureCountAmount;
  factures_reglees: FactureCountAmount;
  ca_genere: number;
  panier_moyen: number;
  taux_transformation: number; // 0–100
  avg_rdv_delay_days: number;
  avg_devis_validation_delay_days: number;
  coverage_rdv_delay: number;             // 0–100 (% dossiers avec RDV)
  coverage_devis_validation_delay: number; // 0–100 (% devis validés avec dates)
}

// ── Trends ───────────────────────────────────────────────
export interface TrendValue {
  delta: number;
  pct: number;
}

// ── Répartition Univers ──────────────────────────────────
export interface UniversEntry {
  code: string;
  label: string;
  count: number;
  percentage: number;
}

// ── Collaboration ────────────────────────────────────────
export type CollaborationLevel = 'bronze' | 'silver' | 'gold';

export interface CollaborationDetails {
  volume_score: number;
  regularite_score: number;
  transfo_score: number;
  delay_score: number;
}

export interface CollaborationScore {
  score: number; // 0–100
  level: CollaborationLevel;
  details: CollaborationDetails;
}

// ── Alertes ──────────────────────────────────────────────
export type AlerteType =
  | 'factures_retard_30j'
  | 'devis_non_valide_15j'
  | 'dossier_sans_rdv'
  | 'dossier_sans_action_7j'
  | 'rdv_annule'
  | 'devis_refuse';

export type AlerteSeverity = 'low' | 'medium' | 'high';

export interface AlerteSampleDetail {
  ref: string;
  label?: string;
  date?: string;       // ISO date (e.g. date facture)
  amount?: number;     // montant HT du document
  days?: number;       // jours de retard
}

export interface AlerteEntry {
  type: AlerteType;
  severity: AlerteSeverity;
  count: number;
  amount?: number;
  risk_blockage: number; // 0–100
  sample_refs: string[];
  sample_labels?: string[]; // Noms clients associés aux refs
  sample_details?: AlerteSampleDetail[]; // Détails enrichis par dossier
}

// ── Series 12 mois ───────────────────────────────────────
export interface MonthlyValue {
  month: string; // YYYY-MM
  value: number;
}

export interface MonthlyDelays {
  month: string;
  rdv: number;
  devis_validation: number;
  paiement: number;
}

export interface Series12m {
  ca_ht: MonthlyValue[];
  dossiers: MonthlyValue[];
  taux_transformation: MonthlyValue[];
  avg_delays_days: MonthlyDelays[];
}
