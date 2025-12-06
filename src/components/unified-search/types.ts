/**
 * Types pour la recherche unifiée (Stats + Docs)
 */

export type SearchIntentType = 'stats' | 'docs' | 'fallback';

// Résultat d'une recherche statistique
export interface StatSearchResult {
  type: 'stat';
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { start: string; end: string };
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

// Parsed stat query from NL
export interface ParsedStatQuery {
  metricId: string;
  metricLabel: string;
  filters: {
    univers?: string;
    periode?: { start: Date; end: Date };
    technicien?: string;
  };
  confidence: number; // 0-1
}

// NL Mapping entry
export interface StatNLMapping {
  id: string;
  label: string;
  keywords: string[];
  examples: string[];
  supportedFilters: ('univers' | 'periode' | 'technicien')[];
  dimensions?: string[];
}

// Search state
export interface UnifiedSearchState {
  isOpen: boolean;
  isLoading: boolean;
  query: string;
  result: UnifiedSearchResult | null;
  error: string | null;
}
