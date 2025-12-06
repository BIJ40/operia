/**
 * StatIA AI Search - Types centraux
 * Architecture hybride : LLM + Déterministe
 */

// ═══════════════════════════════════════════════════════════════
// TYPES DE REQUÊTES
// ═══════════════════════════════════════════════════════════════

export type QueryType = 
  | 'stats_query'      // Statistiques métier
  | 'documentary_query' // Recherche documentaire RAG
  | 'pedagogic_query'   // Définitions, règles métier
  | 'action_query'      // Navigation rapide
  | 'unknown';          // Non classifié

export type DimensionType = 
  | 'global'
  | 'technicien'
  | 'apporteur'
  | 'univers'
  | 'agence'
  | 'site'
  | 'client_type';

export type IntentType = 
  | 'top'       // Classement
  | 'moyenne'   // Moyenne
  | 'volume'    // Comptage
  | 'taux'      // Pourcentage
  | 'delay'     // Délai
  | 'compare'   // Comparaison
  | 'valeur';   // Valeur brute

// ═══════════════════════════════════════════════════════════════
// PÉRIODE
// ═══════════════════════════════════════════════════════════════

export interface ParsedPeriod {
  from: string;       // ISO date
  to: string;         // ISO date
  label: string;      // "Cette année", "12 derniers mois"
  isDefault: boolean; // True si fallback appliqué
}

// ═══════════════════════════════════════════════════════════════
// KEYWORDS & SCORING
// ═══════════════════════════════════════════════════════════════

export interface Keyword {
  word: string;
  category: KeywordCategory;
  weight: number;      // 0.0 - 1.0
  aliases?: string[];  // Variantes orthographiques
}

export type KeywordCategory = 
  | 'metric'           // CA, recouvrement, SAV
  | 'dimension'        // technicien, apporteur, univers
  | 'intent'           // top, moyenne, taux
  | 'period'           // mois, année, semaine
  | 'univers'          // plomberie, électricité
  | 'action'           // ouvrir, voir, afficher
  | 'doc'              // comment, pourquoi, aide
  | 'filter';          // client, zone

export interface KeywordMatch {
  keyword: Keyword;
  position: number;
  matchedText: string;
}

// ═══════════════════════════════════════════════════════════════
// LLM EXTRACTION (CANDIDAT - NON VALIDÉ)
// ═══════════════════════════════════════════════════════════════

export interface LLMDraftIntent {
  intent: QueryType | null;
  metric: string | null;
  dimension: DimensionType | null;
  intentType: IntentType | null;
  limit: number | null;
  period: {
    from: string | null;
    to: string | null;
    label: string | null;
  } | null;
  filters: Record<string, unknown>;
  confidence: number;  // 0.0 - 1.0
  rawResponse?: string; // Debug
}

// ═══════════════════════════════════════════════════════════════
// INTENT FINAL VALIDÉ (POST-CORRECTION)
// ═══════════════════════════════════════════════════════════════

export interface ValidatedIntent {
  type: QueryType;
  metricId?: string;
  metricLabel?: string;
  dimension?: DimensionType;
  intentType?: IntentType;
  limit?: number;
  period?: ParsedPeriod;
  filters?: Record<string, unknown>;
  
  // Sécurité
  agencyScope: 'single' | 'network';
  allowedAgencyIds?: string[];
  userRoleLevel: number;
  
  // Traçabilité
  validation: {
    corrections: ValidationCorrection[];
    llmConfidence: number;
    finalConfidence: number;
    source: 'llm' | 'heuristic' | 'hybrid';
  };
}

export interface ValidationCorrection {
  field: string;
  original: unknown;
  corrected: unknown;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════
// AMBIGUÏTÉ
// ═══════════════════════════════════════════════════════════════

export interface AmbiguousResult {
  type: 'ambiguous';
  candidates: MetricCandidate[];
  message: string;
  originalQuery: string;
}

export interface MetricCandidate {
  metricId: string;
  label: string;
  score: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════
// RÉSULTATS D'EXÉCUTION
// ═══════════════════════════════════════════════════════════════

export interface StatsResult {
  type: 'stats';
  metricId: string;
  metricLabel: string;
  period: ParsedPeriod;
  filters: Record<string, unknown>;
  result: {
    value: number | string;
    unit?: string;
    ranking?: RankingItem[];
    topItem?: RankingItem;
    evolution?: {
      previous: number;
      change: number;
      changePercent: number;
    };
  };
  agencySlug: string;
  agencyName?: string;
  computedAt: string;
  debug?: IntentDebugInfo;
}

export interface RankingItem {
  rank: number;
  id: string | number;
  name: string;
  value: number;
}

export interface DocResult {
  type: 'doc';
  results: DocSearchItem[];
  totalCount: number;
  query: string;
}

export interface DocSearchItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: 'apogee' | 'helpconfort' | 'apporteurs' | 'faq' | 'academy';
  similarity: number;
  category?: string;
}

export interface ActionResult {
  type: 'action';
  action: string;
  targetUrl: string;
  params?: Record<string, string>;
  label: string;
}

export interface ErrorResult {
  type: 'error';
  code: ErrorCode;
  message: string;
  details?: string;
}

export type ErrorCode = 
  | 'ACCESS_DENIED'
  | 'METRIC_NOT_FOUND'
  | 'PERIOD_INVALID'
  | 'AGENCY_SCOPE_VIOLATION'
  | 'LLM_TIMEOUT'
  | 'UNKNOWN_QUERY'
  | 'INTERNAL_ERROR';

export type SearchResult = 
  | StatsResult 
  | DocResult 
  | ActionResult 
  | AmbiguousResult 
  | ErrorResult;

// ═══════════════════════════════════════════════════════════════
// DEBUG & EXPLICABILITÉ
// ═══════════════════════════════════════════════════════════════

export interface IntentDebugInfo {
  normalizedQuery: string;
  detectedQueryType: QueryType;
  keywordMatches: KeywordMatch[];
  llmDraft: LLMDraftIntent | null;
  corrections: ValidationCorrection[];
  finalIntent: ValidatedIntent;
  executionTimeMs: number;
  cacheHit: boolean;
}

// ═══════════════════════════════════════════════════════════════
// CONTEXTE UTILISATEUR
// ═══════════════════════════════════════════════════════════════

export interface UserContext {
  userId: string;
  globalRole: string;
  roleLevel: number;
  agencyId: string | null;
  agencySlug: string | null;
  allowedAgencyIds?: string[];
  enabledModules: string[];
}
