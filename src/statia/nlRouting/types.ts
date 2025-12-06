/**
 * StatIA NL Routing - Types
 * Types structurés pour le pipeline NL → Métrique
 */

export type DimensionType = 
  | 'technicien' 
  | 'apporteur' 
  | 'univers' 
  | 'agence' 
  | 'site' 
  | 'client_type' 
  | 'global';

export type IntentType = 
  | 'top' 
  | 'moyenne' 
  | 'volume' 
  | 'taux' 
  | 'delay' 
  | 'compare' 
  | 'valeur';

export interface ParsedPeriod {
  start: Date;
  end: Date;
  label: string;
  isDefault: boolean;
}

export interface MetricRouting {
  metricId: string;
  label: string;
  isRanking: boolean;
  minRole: number;
  defaultTopN?: number;
}

export interface RoutingRule {
  dimension: DimensionType;
  intentType: IntentType;
  metricId: string;
  label: string;
  isRanking: boolean;
  minRole: number;
  defaultTopN?: number;
}

export interface ParsedStatQuery {
  metricId: string;
  metricLabel: string;
  dimension: DimensionType;
  intentType: IntentType;
  univers?: string;
  period: ParsedPeriod; // Always required - fallback to default
  topN?: number;
  technicienName?: string;
  comparison?: { baseline: 'N-1' | 'previous_period' } | null;
  extraFilters?: Record<string, unknown>;
  confidence: number;
  minRole: number;
  isRanking: boolean;
  debug: {
    detectedDimension: string;
    detectedIntent: string;
    detectedUnivers: string | null;
    detectedPeriod: string;
    routingPath: string;
    normalizedQuery: string;
  };
}

export interface StatSearchResult {
  type: 'stat';
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { start: string; end: string; label: string; isDefault: boolean };
  };
  result: {
    value: number | string;
    topItem?: { id: string | number; name: string; value: number };
    ranking?: Array<{ rank: number; id: string | number; name: string; value: number }>;
    unit?: string;
  };
  agencySlug: string;
  agencyName?: string;
  computedAt: string;
  parsed?: ParsedStatQuery;
  accessDenied?: boolean;
  accessMessage?: string;
}

export interface AmbiguousResult {
  type: 'stat_ambiguous';
  candidates: Array<{ metricId: string; label: string }>;
  message: string;
}

export interface ErrorResult {
  type: 'error';
  reason: 'PERIOD_MISSING' | 'METRIC_NOT_FOUND' | 'ACCESS_DENIED' | 'NO_AGENCY';
  message: string;
}
