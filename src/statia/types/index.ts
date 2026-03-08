/**
 * STATiA-BY-BIJ - Types centraux du moteur de métriques
 */

// ============================================
// TYPES DU DSL DE FORMULE
// ============================================

export type AggregationType = 'sum' | 'avg' | 'count' | 'distinct_count' | 'ratio' | 'min' | 'max';

export interface FilterCondition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'exists';
  value: unknown;
}

export interface FormulaDefinition {
  type: AggregationType;
  field?: string; // champ à agréger (optionnel pour count)
  numerator?: FormulaDefinition; // pour ratio
  denominator?: FormulaDefinition; // pour ratio
  groupBy?: string[]; // ex: ['tech_id', 'univers']
  filters?: FilterCondition[];
  transform?: 'abs' | 'round' | 'floor' | 'ceil'; // transformation post-calcul
  unit?: string; // 'euros' | 'hours' | 'minutes' | 'count' | 'percent'
}

// ============================================
// TYPES DES SOURCES DE DONNÉES
// ============================================

export type ApogeeSourceName = 
  | 'interventions'
  | 'projects'
  | 'factures'
  | 'devis'
  | 'users'
  | 'clients';

export interface InputSource {
  source: ApogeeSourceName;
  alias?: string; // pour référencer dans la formule
  filters?: FilterCondition[]; // filtres au niveau source
  joinOn?: string; // clé de jointure avec la source précédente
  fields?: string[]; // champs à extraire (optimisation)
}

// ============================================
// TYPES DE DÉFINITION DE MÉTRIQUE
// ============================================

export type MetricScope = 'agency' | 'franchiseur' | 'apporteur' | 'tech' | 'mix';
export type ValidationStatus = 'draft' | 'test' | 'validated';
export type ComputeHint = 'auto' | 'frontend' | 'edge';
export type VisibilityTarget = 'agency' | 'franchiseur' | 'apporteur' | 'admin';

export interface MetricDefinition {
  id: string;
  label: string;
  description_agence?: string;
  description_franchiseur?: string;
  scope: MetricScope;
  input_sources: InputSource[];
  formula: FormulaDefinition;
  compute_hint: ComputeHint;
  validation_status: ValidationStatus;
  visibility: VisibilityTarget[];
  cache_ttl_seconds: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// ============================================
// TYPES DE PARAMÈTRES ET RÉSULTATS
// ============================================

export interface MetricParams {
  agency_id?: string;
  agency_slug?: string;
  agency_slugs?: string[]; // pour multi-agences franchiseur
  date_from?: Date;
  date_to?: Date;
  apporteur_id?: string;
  tech_id?: string | number;
  univers?: string;
  // Paramètres additionnels dynamiques
  [key: string]: unknown;
}

export interface LoadDebugInfo {
  apiUrl: string;
  apiKeyPresent: boolean;
  rawCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  appliedFilters: Record<string, FilterCondition[]>;
  aggregationStats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
    numeratorCount?: number;
    denominatorCount?: number;
  };
}

export interface MetricResult<T = number> {
  value: T;
  breakdown?: Record<string, T>; // si groupBy
  metadata?: {
    computed_at: string;
    cache_hit: boolean;
    compute_time_ms: number;
    data_points: number;
  };
  _loadDebug?: LoadDebugInfo;
}

export interface MetricError {
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'COMPUTE_ERROR' | 'PERMISSION_DENIED' | 'DATA_UNAVAILABLE';
  message: string;
  details?: unknown;
}

// ============================================
// TYPES DU ROUTAGE COMPUTE
// ============================================

export interface ComputeContext {
  metric: MetricDefinition;
  params: MetricParams;
  complexity: ComputeComplexity;
  executionTarget: 'frontend' | 'edge';
}

export interface ComputeComplexity {
  score: number; // 0-100
  factors: {
    multiAgency: boolean;
    multiSource: boolean;
    heavyJoins: boolean;
    largeTimeRange: boolean;
    complexGroupBy: boolean;
  };
}

// ============================================
// HELPERS TYPE GUARDS
// ============================================

export function isValidAggregationType(type: string): type is AggregationType {
  return ['sum', 'avg', 'count', 'distinct_count', 'ratio', 'min', 'max'].includes(type);
}

export function isValidScope(scope: string): scope is MetricScope {
  return ['agency', 'franchiseur', 'apporteur', 'tech', 'mix'].includes(scope);
}
