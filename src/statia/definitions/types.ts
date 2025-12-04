/**
 * StatIA V1 - Types de base pour les définitions de métriques
 */

export type StatCategory = 
  | 'ca' 
  | 'devis' 
  | 'univers' 
  | 'apporteur' 
  | 'technicien' 
  | 'sav' 
  | 'recouvrement';

export type DataSource = 'factures' | 'devis' | 'interventions' | 'projects' | 'users' | 'clients';

export type Dimension = 'univers' | 'apporteur' | 'technicien' | 'mois' | 'agence';

export type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'ratio';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface StatParams {
  dateRange: DateRange;
  agencySlug?: string;
  agencyId?: string;
  groupBy?: Dimension[];
  filters?: Record<string, any>;
}

export interface LoadedData {
  factures: any[];
  devis: any[];
  interventions: any[];
  projects: any[];
  users: any[];
  clients: any[];
}

export interface StatResult {
  value: number | Record<string, number>;
  breakdown?: Record<string, any>;
  metadata?: {
    computedAt: Date;
    source: DataSource;
    recordCount: number;
  };
}

export interface StatDefinition {
  id: string;
  label: string;
  description?: string;
  category: StatCategory;
  source: DataSource | DataSource[];
  dimensions?: Dimension[];
  aggregation: AggregationType;
  unit?: string;
  compute: (data: LoadedData, params: StatParams) => StatResult;
}

export interface StatDefinitionRegistry {
  [id: string]: StatDefinition;
}
