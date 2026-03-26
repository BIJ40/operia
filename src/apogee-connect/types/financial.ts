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
  paymentStatus: InvoicePaymentStatus;
  agingDays: number;
  agingBucket: AgingBucket;
  entityType: EntityType;
  entityId: string;
  entityLabel: string;
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
  delaiMoyenPaiement: number | null;
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
  delaiMoyenPaiement: number | null;
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
  totalFacturesAnalysees: number;
  totalFacturesExclues: number;
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
}

/** Filter state for the financial tab */
export interface FinancialFilters {
  entityType: 'all' | 'apporteur' | 'client_direct';
  paymentStatus: 'all' | 'paid' | 'partial' | 'unpaid' | 'overdue';
  agingBucket: 'all' | AgingBucket;
  searchQuery: string;
  minAmount: number | null;
}
