/**
 * Types for the Financier Tab — Cash / Recouvrement / Encours cockpit
 */

/** Risk classification for a debtor entity */
export type DebtRiskLevel = 'healthy' | 'watch' | 'warning' | 'critical';

/** Entity type (apporteur / client direct / unknown) */
export type EntityType = 'apporteur' | 'client_direct' | 'unknown';

/** Payment status of a single invoice */
export type InvoicePaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue_30' | 'overdue_60' | 'overdue_90' | 'critical';

/** Aging bucket keys */
export type AgingBucket = '0_30' | '31_60' | '61_90' | '90_plus';

/** Avoir rapprochement status */
export type AvoirMatchStatus = 'matched' | 'ambiguous' | 'unmatched';

/** Bank reconciliation status (future-ready) */
export type BankMatchStatus = 'matched' | 'partial' | 'unmatched' | 'pending';

/** Single invoice with full financial detail */
export interface FinancialInvoice {
  id: string;
  numeroFacture: string;
  projectId: string;
  projectLabel: string;
  clientId: string;
  clientLabel: string;
  dateEmission: Date | null;
  montantTTC: number;
  montantRegle: number;
  resteDu: number;
  isAvoir: boolean;
  avoirMatchStatus?: AvoirMatchStatus;
  paymentStatus: InvoicePaymentStatus;
  agingDays: number;
  agingBucket: AgingBucket;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
  // Bank-ready fields (V2 — future reconciliation)
  recordedPaidAmount?: number;
  bankMatchedAmount?: number;
  bankMatchStatus?: BankMatchStatus;
  bankMatchConfidence?: number;
  reconciliationStatus?: 'pending' | 'reconciled' | 'disputed';
  lastReconciliationAt?: Date | null;
}

/** Aggregated stats for one entity (apporteur or client) */
export interface FinancialEntityStats {
  entityId: string;
  entityLabel: string;
  entityType: EntityType;
  nbDossiers: number;
  nbFactures: number;
  totalFactureTTC: number;
  totalEncaisse: number;
  resteDu: number;
  tauxRecouvrement: number;
  /** Âge moyen des factures non soldées (jours) — NOT a real payment delay */
  ageMoyenEncours: number | null;
  partDuGlobal: number;
  riskLevel: DebtRiskLevel;
  aging: AgingBreakdown;
  invoices: FinancialInvoice[];
}

/** Aging breakdown by bucket */
export interface AgingBreakdown {
  '0_30': number;
  '31_60': number;
  '61_90': number;
  '90_plus': number;
}

/** Fiability level */
export type FiabiliteLevel = 'forte' | 'moyenne' | 'fragile';

/** Global financial KPIs */
export interface FinancialKPIs {
  duTotal: number;
  duClientsDirects: number;
  duApporteurs: number;
  duUnknown: number;
  totalEncaisse: number;
  totalFacture: number;
  tauxRecouvrement: number;
  nbFacturesAvecSolde: number;
  /** Âge moyen des encours non soldés (jours) — NOT a real payment delay */
  ageMoyenEncours: number | null;
  montantRetard30: number;
  montantRetard60: number;
  montantRetard90: number;
}

/** Alert item for the alerts panel */
export interface FinancialAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  icon: string;
  title: string;
  description: string;
  value?: number;
  entityId?: string;
}

/** Data quality flags */
export interface DataQualityFlags {
  facturesSansDate: number;
  facturesSansMontant: number;
  facturesSansProject: number;
  projectsSansCommanditaire: number;
  avoirsNonRapproches: number;
  montantAvoirsAmbigus: number;
  reglementsViaDonneeReelle: number;
  reglementsViaFallbackStatut: number;
  totalFacturesAnalysees: number;
  totalFacturesExclues: number;
}

/** Fiability score */
export interface FiabiliteScore {
  score: number; // 0-100
  level: FiabiliteLevel;
  details: {
    label: string;
    count: number;
    severity: 'ok' | 'warn' | 'error';
  }[];
}

/** Complete result from financial calculations */
export interface FinancialAnalysis {
  kpis: FinancialKPIs;
  byApporteur: FinancialEntityStats[];
  byClient: FinancialEntityStats[];
  allInvoices: FinancialInvoice[];
  aging: AgingBreakdown;
  alerts: FinancialAlert[];
  dataQuality: DataQualityFlags;
  fiabilite: FiabiliteScore;
}

/** Filter state for the financial tab */
export interface FinancialFilters {
  entityType: 'all' | 'apporteur' | 'client_direct';
  paymentStatus: 'all' | 'paid' | 'partial' | 'unpaid' | 'overdue';
  agingBucket: 'all' | AgingBucket;
  searchQuery: string;
  minAmount: number | null;
}
