/**
 * Types pour la recherche unifiée (Stats + Docs)
 */

export type SearchIntentType = 'stats' | 'docs' | 'fallback';

// Parsed query debug info
export interface ParsedQueryDebug {
  detectedDimension: string;
  detectedIntent: string;
  detectedUnivers: string | null;
  detectedPeriod: string | null;
  routingPath: string;
}

// Parsed stat query from NL parser
export interface ParsedStatQueryInfo {
  metricId: string;
  metricLabel: string;
  dimension: string;
  intentType: string;
  univers?: string;
  period?: {
    start: string;
    end: string;
    label: string;
    isDefault: boolean;
  };
  topN?: number;
  technicienName?: string;
  confidence: number;
  minRole: number;
  isRanking: boolean;
  debug: ParsedQueryDebug;
}

// Résultat d'une recherche statistique
export interface StatSearchResult {
  type: 'stat';
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { 
      start: string; 
      end: string; 
      label?: string;
      isDefault?: boolean;
    };
    technicien?: string;
  };
  result: {
    value: number | string;
    topItem?: {
      id: string | number;
      name: string;
      value: number;
    };
    ranking?: Array<{
      rank: number;
      id: string | number;
      name: string;
      value: number;
    }>;
    unit?: string;
  };
  agencySlug: string;
  agencyName?: string;
  computedAt: string;
  // Parsed query info from NL parser
  parsed?: ParsedStatQueryInfo;
  // Access control
  accessDenied?: boolean;
  accessMessage?: string;
}

// Résultat d'une recherche documentaire
export interface DocSearchResult {
  type: 'doc';
  results: Array<{
    id: string;
    title: string;
    snippet: string;
    url: string;
    source: 'apogee' | 'helpconfort' | 'apporteurs' | 'faq';
    similarity?: number;
  }>;
}

// Résultat fallback
export interface FallbackSearchResult {
  type: 'fallback';
  message: string;
}

export type UnifiedSearchResult = StatSearchResult | DocSearchResult | FallbackSearchResult;

// Search state
export interface UnifiedSearchState {
  isOpen: boolean;
  isLoading: boolean;
  query: string;
  result: UnifiedSearchResult | null;
  error: string | null;
}
