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
  | 'recouvrement'
  | 'qualite'
  | 'dossiers'
  | 'productivite'
  | 'complexite'
  | 'reseau';

export type DataSource = 'factures' | 'devis' | 'interventions' | 'projects' | 'users' | 'clients';

export type Dimension = 'univers' | 'apporteur' | 'type_apporteur' | 'technicien' | 'mois' | 'agence';

export type AggregationType = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'median' | 'ratio';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * P2-05: Filtres typés pour StatIA
 * Permet une meilleure validation et autocomplétion
 */
export interface StatFilters {
  /** Filtrer par univers spécifiques */
  univers?: string[];
  /** Filtrer par apporteur(s) - peut être un ID unique ou plusieurs */
  apporteurs?: (string | number)[];
  /** Alias pour compatibilité - ID apporteur unique */
  apporteurId?: string | number;
  /** Filtrer par technicien(s) */
  techniciens?: (string | number)[];
  /** Filtrer par type d'intervention */
  interventionTypes?: string[];
  /** Exclure les SAV */
  excludeSAV?: boolean;
  /** Exclure les RT */
  excludeRT?: boolean;
  /** Inclure uniquement les factures payées */
  paidOnly?: boolean;
  /** Nombre de résultats pour les Top N */
  topN?: number;
  /** Seuil en jours (ex: apporteurs inactifs) */
  seuilJours?: number;
}

export interface StatParams {
  dateRange: DateRange;
  agencySlug?: string;
  agencyId?: string;
  groupBy?: Dimension[];
  /** P2-05: Filtres typés (remplace Record<string, any>) */
  filters?: StatFilters;
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
  value: number | Record<string, number> | Record<string, any>;
  breakdown?: {
    factureCount?: number;
    avoirCount?: number;
    factureTotal?: number;
    avoirTotal?: number;
    devisCount?: number;
    devisValides?: number;
    dossierCount?: number;
    savCount?: number;
    total?: number;
    monthCount?: number;
    error?: string;
    [key: string]: any;
  };
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
