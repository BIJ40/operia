/**
 * Edge Function: unified-search
 * Pipeline IA Hybride 5 étapes:
 * 1. detectQueryType → stats / doc / action
 * 2. extractIntentLLM → Appel Gemini 2.5 Flash via ai-search-extract
 * 3. validateAndRoute → Validation déterministe (metricsRegistry, permissions)
 * 4. Exécution → StatIA / RAG / Actions
 * 5. Réponse structurée avec interpretation + debug
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { computeMetric, getRequiredSources, hasMetric, StatParams, StatResult } from './statiaService.ts';

// ============= TYPES =============
type QueryType = 'stats' | 'doc' | 'action' | 'pedagogic' | 'unknown';
type DimensionType = 'technicien' | 'apporteur' | 'univers' | 'agence' | 'site' | 'client_type' | 'global';
type IntentType = 'top' | 'moyenne' | 'volume' | 'taux' | 'delay' | 'compare' | 'valeur';

interface ParsedPeriod {
  start: Date;
  end: Date;
  label: string;
  isDefault: boolean;
}

interface LLMDraftIntent {
  queryType: QueryType;
  metric: string | null;
  dimension: DimensionType | null;
  intentType: IntentType | null;
  limit: number | null;
  period: { from: string; to: string; label: string } | null;
  filters: Record<string, string | string[]>;
  confidence: number;
}

interface ValidatedIntent {
  type: QueryType;
  metricId: string | null;
  metricLabel: string | null;
  dimension: DimensionType;
  intentType: IntentType;
  period: ParsedPeriod;
  limit: number | null;
  filters: {
    univers?: string;
    apporteur?: string;
    technicien?: string;
    agencyScope?: 'single' | 'multi';
    allowedAgencyIds?: string[];
  };
  confidence: number;
  minRole: number;
  isRanking: boolean;
  corrections: string[];
}

interface InterpretationBlock {
  metricId: string | null;
  metricLabel: string | null;
  dimension: string;
  intentType: string;
  period: { start: string; end: string; label: string };
  filters: Record<string, unknown>;
  confidence: number;
  enginePath: string;
}

interface DebugBlock {
  llmDraft: LLMDraftIntent | null;
  validatedIntent: ValidatedIntent | null;
  corrections: string[];
  normalizedQuery: string;
  statsScore: number;
  detectedCategories: string[];
  executionTimeMs: number;
}

interface SearchResponse {
  type: 'stat' | 'doc' | 'action' | 'ambiguous' | 'fallback' | 'access_denied';
  result: StatResult | DocResult | ActionResult | AmbiguousResult | null;
  interpretation: InterpretationBlock;
  debug?: DebugBlock; // Only for N6 superadmin
  computedAt: string;
  agencySlug: string;
  accessDenied?: boolean;
  accessMessage?: string;
}

interface DocResult {
  results: Array<{ id: string; title: string; snippet: string; url: string; source: string; similarity?: number }>;
}

interface ActionResult {
  action: string;
  targetUrl: string;
  label: string;
}

interface AmbiguousResult {
  message: string;
  candidates: Array<{ metricId: string; label: string; description?: string }>;
}

// ============= CONSTANTS =============
const ROLE_LEVELS: Record<string, number> = {
  'superadmin': 6, 'platform_admin': 5, 'franchisor_admin': 4,
  'franchisor_user': 3, 'franchisee_admin': 2, 'franchisee_user': 1, 'base_user': 0,
};

// ============= OFFICIAL METRICS REGISTRY =============
const METRICS_REGISTRY: Map<string, { label: string; minRole: number; isRanking: boolean; defaultTopN?: number; unit: string }> = new Map([
  ['ca_global_ht', { label: 'CA global HT', minRole: 0, isRanking: false, unit: '€' }],
  ['ca_par_apporteur', { label: 'CA par apporteur', minRole: 2, isRanking: true, defaultTopN: 5, unit: '€' }],
  ['ca_par_univers', { label: 'CA par univers', minRole: 0, isRanking: true, defaultTopN: 5, unit: '€' }],
  ['ca_par_technicien', { label: 'CA par technicien', minRole: 2, isRanking: true, defaultTopN: 5, unit: '€' }],
  ['top_techniciens_ca', { label: 'Top techniciens CA', minRole: 2, isRanking: true, defaultTopN: 5, unit: '€' }],
  ['taux_sav_global', { label: 'Taux de SAV', minRole: 0, isRanking: false, unit: '%' }],
  ['sav_par_univers', { label: 'SAV par univers', minRole: 0, isRanking: true, unit: '%' }],
  ['sav_par_apporteur', { label: 'SAV par apporteur', minRole: 2, isRanking: true, unit: '%' }],
  ['panier_moyen', { label: 'Panier moyen', minRole: 0, isRanking: false, unit: '€' }],
  ['nb_dossiers_crees', { label: 'Nombre de dossiers', minRole: 0, isRanking: false, unit: '' }],
  ['ca_moyen_par_tech', { label: 'CA moyen par technicien', minRole: 2, isRanking: false, unit: '€' }],
  ['nb_dossiers_par_univers', { label: 'Dossiers par univers', minRole: 0, isRanking: true, unit: 'dossiers' }],
  ['dossiers_par_apporteur', { label: 'Dossiers par apporteur', minRole: 2, isRanking: true, unit: 'dossiers' }],
  ['taux_transformation_devis', { label: 'Taux transformation devis', minRole: 0, isRanking: false, unit: '%' }],
  ['delai_premier_devis', { label: 'Délai premier devis', minRole: 0, isRanking: false, unit: 'jours' }],
  ['delai_moyen_facture', { label: 'Délai moyen facture', minRole: 0, isRanking: false, unit: 'jours' }],
  ['ca_moyen_par_jour', { label: 'CA moyen par jour', minRole: 0, isRanking: false, unit: '€/jour' }],
  ['taux_recouvrement', { label: 'Taux de recouvrement', minRole: 2, isRanking: false, unit: '%' }],
  ['reste_a_encaisser', { label: 'Reste à encaisser', minRole: 2, isRanking: false, unit: '€' }],
  ['ca_mensuel', { label: 'CA mensuel', minRole: 0, isRanking: true, unit: '€' }],
]);

// ============= STATS KEYWORDS FOR DETECTION =============
const STATS_KEYWORDS = new Set([
  'combien', 'ca', 'chiffre', "chiffre d'affaires", 'dossiers', 'en moyenne', 'moyenne', 
  'top', 'le plus', 'panier moyen', 'taux', 'nombre', 'nb', 'meilleur', 'meilleurs', 
  'premier', 'premiers', 'technicien', 'apporteur', 'univers', 'sav', 'transformation', 
  'devis', 'stat', 'statistique', 'kpi', 'indicateur', 'délai', 'delai', 'temps moyen', 
  'rapporte', 'recouvrement', 'recouv', 'encours', 'encaissé', 'encaisse', 'impayé', 
  'impayés', 'reste à encaisser', 'dû client', 'créance',
]);

const ACTION_KEYWORDS = new Set([
  'ouvrir', 'ouvre', 'afficher', 'affiche', 'voir', 'aller', 'accéder', 'montre', 
  'montrer', 'naviguer',
]);

const UNIVERS_ALIASES: Record<string, string> = {
  'électricité': 'ELECTRICITE', 'electricite': 'ELECTRICITE', 'elec': 'ELECTRICITE',
  'plomberie': 'PLOMBERIE', 'plombier': 'PLOMBERIE', 'fuite': 'PLOMBERIE',
  'serrurerie': 'SERRURERIE', 'serrurier': 'SERRURERIE',
  'vitrerie': 'VITRERIE', 'vitrier': 'VITRERIE', 'vitre': 'VITRERIE',
  'volet': 'VOLET', 'volets': 'VOLET', 'store': 'VOLET',
  'menuiserie': 'MENUISERIE', 'peinture': 'PEINTURE', 'carrelage': 'CARRELAGE',
  'maçonnerie': 'MACONNERIE', 'maconnerie': 'MACONNERIE',
  'dépannage': 'DEPANNAGE', 'depannage': 'DEPANNAGE',
};

const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'fevrier': 1, 'février': 1, 'fev': 1, 'mars': 2, 
  'avril': 3, 'avr': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'juil': 6,
  'aout': 7, 'août': 7, 'septembre': 8, 'sept': 8, 'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10, 'decembre': 11, 'décembre': 11, 'dec': 11,
};

// ============= STEP 1: NORMALIZE QUERY =============
function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============= STEP 2: DETECT QUERY TYPE (Heuristic) =============
function detectQueryType(normalized: string): { type: QueryType; confidence: number; categories: string[] } {
  const categories: string[] = [];
  let statsScore = 0;
  let actionScore = 0;
  let docScore = 0;

  // Check stats keywords
  for (const kw of STATS_KEYWORDS) {
    if (normalized.includes(kw)) {
      statsScore += 1;
      categories.push(`stats:${kw}`);
    }
  }

  // Check action keywords
  for (const kw of ACTION_KEYWORDS) {
    if (normalized.includes(kw)) {
      actionScore += 2;
      categories.push(`action:${kw}`);
    }
  }

  // Default doc signals
  const docKeywords = ['comment', 'pourquoi', 'qu\'est-ce', 'expliquer', 'definition', 'c\'est quoi'];
  for (const kw of docKeywords) {
    if (normalized.includes(kw)) {
      docScore += 1;
      categories.push(`doc:${kw}`);
    }
  }

  // Determine type
  if (actionScore > statsScore && actionScore > docScore) {
    return { type: 'action', confidence: 0.7, categories };
  }
  if (statsScore > 0 && statsScore >= docScore) {
    return { type: 'stats', confidence: Math.min(0.5 + statsScore * 0.1, 0.9), categories };
  }
  if (docScore > 0) {
    return { type: 'doc', confidence: 0.6, categories };
  }
  return { type: 'unknown', confidence: 0.3, categories };
}

// ============= STEP 3: CALL LLM FOR INTENT EXTRACTION =============
async function extractIntentWithLLM(
  query: string, 
  supabaseUrl: string, 
  authHeader: string
): Promise<LLMDraftIntent | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-search-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('[unified-search] LLM extraction failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data as LLMDraftIntent;
  } catch (error) {
    console.error('[unified-search] LLM extraction error:', error);
    return null;
  }
}

// ============= STEP 4: VALIDATE AND ROUTE (Deterministic) =============
function validateAndRoute(
  llmDraft: LLMDraftIntent | null,
  normalized: string,
  originalQuery: string,
  userRoleLevel: number,
  agencySlug: string,
  allowedAgencyIds: string[]
): ValidatedIntent {
  const now = new Date();
  const corrections: string[] = [];

  // 1. Determine query type (trust heuristic over LLM if confidence low)
  const heuristic = detectQueryType(normalized);
  let queryType = llmDraft?.queryType || heuristic.type;
  
  if (llmDraft && llmDraft.confidence < 0.5 && heuristic.confidence > 0.5) {
    queryType = heuristic.type;
    corrections.push(`type_corrected:${llmDraft.queryType}→${heuristic.type}`);
  }

  // 2. Validate/find metric
  let metricId: string | null = llmDraft?.metric || null;
  let metricInfo = metricId ? METRICS_REGISTRY.get(metricId) : null;

  if (metricId && !metricInfo) {
    // LLM invented a metric - reject and find via keywords
    corrections.push(`metric_rejected:${metricId}`);
    metricId = findMetricFromKeywords(normalized);
    metricInfo = metricId ? METRICS_REGISTRY.get(metricId) : null;
  }

  if (!metricId && queryType === 'stats') {
    metricId = findMetricFromKeywords(normalized);
    metricInfo = metricId ? METRICS_REGISTRY.get(metricId) : null;
    if (!metricId) {
      metricId = 'ca_global_ht'; // Default fallback
      metricInfo = METRICS_REGISTRY.get(metricId);
      corrections.push('metric_default:ca_global_ht');
    }
  }

  // 3. Validate dimension
  let dimension: DimensionType = llmDraft?.dimension || detectDimension(normalized);
  if (dimension && !isValidDimension(dimension)) {
    corrections.push(`dimension_corrected:${dimension}→global`);
    dimension = 'global';
  }

  // 4. Validate intentType
  let intentType: IntentType = llmDraft?.intentType || detectIntent(normalized);
  if (!isValidIntent(intentType)) {
    corrections.push(`intent_corrected:${intentType}→valeur`);
    intentType = 'valeur';
  }

  // 5. Parse/validate period
  let period: ParsedPeriod;
  if (llmDraft?.period?.from && llmDraft?.period?.to) {
    try {
      period = {
        start: new Date(llmDraft.period.from),
        end: new Date(llmDraft.period.to),
        label: llmDraft.period.label || 'Période personnalisée',
        isDefault: false,
      };
    } catch {
      corrections.push('period_parse_error');
      period = extractPeriodFromQuery(originalQuery, now);
    }
  } else {
    period = extractPeriodFromQuery(originalQuery, now);
    if (period.isDefault) {
      corrections.push('period_default:12_mois');
    }
  }

  // 6. Validate filters
  const filters: ValidatedIntent['filters'] = {};
  
  // Univers
  const univers = extractUnivers(originalQuery);
  if (univers) {
    filters.univers = univers;
  } else if (llmDraft?.filters?.univers) {
    // Validate LLM univers
    const llmUnivers = String(llmDraft.filters.univers).toUpperCase();
    const validUniverses = ['ELECTRICITE', 'PLOMBERIE', 'SERRURERIE', 'VITRERIE', 'VOLET', 'MENUISERIE', 'PEINTURE', 'CARRELAGE', 'MACONNERIE', 'DEPANNAGE'];
    if (validUniverses.includes(llmUnivers)) {
      filters.univers = llmUnivers;
    } else {
      corrections.push(`univers_rejected:${llmUnivers}`);
    }
  }

  // Agency scope based on role
  if (userRoleLevel >= 3) {
    filters.agencyScope = 'multi';
    filters.allowedAgencyIds = allowedAgencyIds;
  } else {
    filters.agencyScope = 'single';
    filters.allowedAgencyIds = agencySlug ? [agencySlug] : [];
  }

  // 7. Validate limit
  let limit = llmDraft?.limit || extractTopN(originalQuery) || metricInfo?.defaultTopN || null;
  if (limit && (limit < 1 || limit > 20)) {
    corrections.push(`limit_corrected:${limit}→10`);
    limit = 10;
  }

  // 8. Access control check
  const minRole = metricInfo?.minRole || 0;

  // 9. Compute final confidence
  let confidence = llmDraft?.confidence || heuristic.confidence;
  if (corrections.length > 0) {
    confidence = Math.max(0.3, confidence - corrections.length * 0.1);
  }

  return {
    type: queryType,
    metricId,
    metricLabel: metricInfo?.label || null,
    dimension,
    intentType,
    period,
    limit,
    filters,
    confidence,
    minRole,
    isRanking: metricInfo?.isRanking || false,
    corrections,
  };
}

// ============= HELPER FUNCTIONS =============
function findMetricFromKeywords(normalized: string): string | null {
  // Specialized patterns (ordered by priority)
  const patterns: Array<{ keywords: string[]; metricId: string }> = [
    { keywords: ['taux recouvrement', 'taux de recouvrement'], metricId: 'taux_recouvrement' },
    { keywords: ['reste à encaisser', 'reste encaisser', 'impayé', 'encours', 'dû client'], metricId: 'reste_a_encaisser' },
    { keywords: ['sav par univers', 'sav univers'], metricId: 'sav_par_univers' },
    { keywords: ['sav par apporteur', 'sav apporteur'], metricId: 'sav_par_apporteur' },
    { keywords: ['taux sav', 'sav'], metricId: 'taux_sav_global' },
    { keywords: ['transformation devis', 'taux devis', 'devis transformé'], metricId: 'taux_transformation_devis' },
    { keywords: ['délai premier devis', 'delai premier devis', 'temps devis'], metricId: 'delai_premier_devis' },
    { keywords: ['délai facture', 'delai facture'], metricId: 'delai_moyen_facture' },
    { keywords: ['panier moyen', 'panier'], metricId: 'panier_moyen' },
    { keywords: ['ca moyen jour', 'ca par jour', 'moyenne jour'], metricId: 'ca_moyen_par_jour' },
    { keywords: ['ca moyen tech', 'ca moyen technicien'], metricId: 'ca_moyen_par_tech' },
    { keywords: ['ca mensuel', 'ca par mois', 'evolution ca'], metricId: 'ca_mensuel' },
    { keywords: ['dossiers par univers', 'nb dossiers univers'], metricId: 'nb_dossiers_par_univers' },
    { keywords: ['dossiers par apporteur', 'nb dossiers apporteur'], metricId: 'dossiers_par_apporteur' },
    { keywords: ['nombre dossiers', 'nb dossiers', 'combien dossiers'], metricId: 'nb_dossiers_crees' },
    { keywords: ['top technicien', 'meilleur technicien', 'technicien'], metricId: 'ca_par_technicien' },
    { keywords: ['top apporteur', 'meilleur apporteur', 'apporteur'], metricId: 'ca_par_apporteur' },
    { keywords: ['top univers', 'meilleur univers', 'univers'], metricId: 'ca_par_univers' },
  ];

  for (const { keywords, metricId } of patterns) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return metricId;
    }
  }

  // Default to CA global if "ca" or "chiffre" mentioned
  if (normalized.includes('ca') || normalized.includes('chiffre')) {
    return 'ca_global_ht';
  }

  return null;
}

function detectDimension(normalized: string): DimensionType {
  const dimensionKeywords: Record<DimensionType, string[]> = {
    technicien: ['technicien', 'tech', 'ouvrier', 'intervenant'],
    apporteur: ['apporteur', 'commanditaire', 'prescripteur', 'partenaire', 'assureur'],
    univers: ['univers', 'métier', 'metier', 'domaine'],
    agence: ['agence', 'agences'],
    site: ['site', 'sites'],
    client_type: ['client pro', 'professionnel', 'particulier'],
    global: [],
  };

  for (const [dim, keywords] of Object.entries(dimensionKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return dim as DimensionType;
    }
  }

  // Check for univers alias
  if (extractUnivers(normalized)) return 'univers';

  return 'global';
}

function detectIntent(normalized: string): IntentType {
  const intentKeywords: Record<IntentType, string[]> = {
    top: ['top', 'meilleur', 'meilleurs', 'premier', 'premiers', 'le plus', 'qui a fait'],
    moyenne: ['en moyenne', 'moyenne', 'moyen', 'rapporte', 'panier moyen'],
    volume: ['combien', 'nombre de', 'nb de', 'volume', 'quantité'],
    taux: ['taux', 'pourcentage', '%', 'ratio'],
    delay: ['délai', 'delai', 'temps moyen', 'durée'],
    compare: ['par rapport à', 'vs', 'comparé', 'évolution', 'progression'],
    valeur: ['total', 'global', 'fait', 'montant'],
  };

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return intent as IntentType;
    }
  }

  return 'valeur';
}

function extractUnivers(query: string): string | undefined {
  const normalized = normalizeQuery(query);
  const sorted = Object.entries(UNIVERS_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, univers] of sorted) {
    const normalizedAlias = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(normalizedAlias)) return univers;
  }
  return undefined;
}

function extractTopN(query: string): number | undefined {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i, /les\s*(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) return 3;
  return undefined;
}

function extractPeriodFromQuery(query: string, now: Date): ParsedPeriod {
  const normalized = normalizeQuery(query);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Year patterns
  if (normalized.includes('cette annee')) {
    return { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31), label: `Année ${currentYear}`, isDefault: false };
  }
  if (normalized.includes('annee derniere') || normalized.includes("l'annee derniere")) {
    return { start: new Date(currentYear - 1, 0, 1), end: new Date(currentYear - 1, 11, 31), label: `Année ${currentYear - 1}`, isDefault: false };
  }
  
  const exerciceMatch = normalized.match(/exercice\s*(20\d{2})/);
  if (exerciceMatch) {
    const year = parseInt(exerciceMatch[1]);
    return { start: new Date(year, 0, 1), end: new Date(year, 11, 31), label: `Exercice ${year}`, isDefault: false };
  }

  // Month patterns
  if (normalized.includes('ce mois')) {
    return { 
      start: new Date(currentYear, currentMonth, 1), 
      end: new Date(currentYear, currentMonth + 1, 0), 
      label: `${getMonthName(currentMonth)} ${currentYear}`, 
      isDefault: false 
    };
  }
  if (normalized.includes('mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return { 
      start: new Date(year, lastMonth, 1), 
      end: new Date(year, lastMonth + 1, 0), 
      label: `${getMonthName(lastMonth)} ${year}`, 
      isDefault: false 
    };
  }

  // Specific month matching
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    const patterns = [new RegExp(`en ${moisName}\\b`, 'i'), new RegExp(`sur ${moisName}\\b`, 'i'), new RegExp(`\\b${moisName}\\s+20\\d{2}\\b`, 'i')];
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        const yearMatch = normalized.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        return { 
          start: new Date(year, moisIndex, 1), 
          end: new Date(year, moisIndex + 1, 0), 
          label: `${getMonthName(moisIndex)} ${year}`, 
          isDefault: false 
        };
      }
    }
  }

  // Default: 12 derniers mois
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);
  return { 
    start, 
    end: new Date(currentYear, currentMonth + 1, 0), 
    label: '12 derniers mois', 
    isDefault: true 
  };
}

function getMonthName(monthIndex: number): string {
  return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][monthIndex] || '';
}

function isValidDimension(dim: string): dim is DimensionType {
  return ['technicien', 'apporteur', 'univers', 'agence', 'site', 'client_type', 'global'].includes(dim);
}

function isValidIntent(intent: string): intent is IntentType {
  return ['top', 'moyenne', 'volume', 'taux', 'delay', 'compare', 'valeur'].includes(intent);
}

function getRoleLevel(globalRole: string | null | undefined): number {
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}

// ============= DATA LOADING =============
async function loadApogeeData(
  proxyUrl: string,
  authHeader: string,
  agencySlug: string,
  period: ParsedPeriod,
  requiredSources: string[]
): Promise<{ factures: any[]; projects: any[]; clients: any[]; interventions: any[]; users: any[] }> {
  const data = { factures: [], projects: [], clients: [], interventions: [], users: [] } as any;
  const requests: Promise<void>[] = [];
  
  if (requiredSources.includes('factures')) {
    requests.push(
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          endpoint: 'apiGetFactures',
          agencySlug,
          filters: { dateDebut: period.start.toISOString().split('T')[0], dateFin: period.end.toISOString().split('T')[0] },
        }),
      }).then(async res => {
        if (res.ok) {
          const json = await res.json();
          data.factures = (json.data || []).filter((f: any) => {
            const factureDate = f.dateReelle || f.date;
            if (!factureDate) return true;
            const d = new Date(factureDate);
            return d >= period.start && d <= period.end;
          });
        }
      }).catch(e => console.error('[unified-search] Factures load error:', e))
    );
  }
  
  if (requiredSources.includes('projects')) {
    requests.push(
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ endpoint: 'apiGetProjects', agencySlug }),
      }).then(async res => {
        if (res.ok) data.projects = (await res.json()).data || [];
      }).catch(e => console.error('[unified-search] Projects load error:', e))
    );
  }
  
  if (requiredSources.includes('clients')) {
    requests.push(
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }),
      }).then(async res => {
        if (res.ok) data.clients = (await res.json()).data || [];
      }).catch(e => console.error('[unified-search] Clients load error:', e))
    );
  }
  
  await Promise.all(requests);
  return data;
}

// ============= DOCS SEARCH =============
async function searchDocs(supabase: any, query: string): Promise<DocResult> {
  const results: DocResult['results'] = [];

  const { data: chunks } = await supabase
    .from('guide_chunks')
    .select('id, title, content, block_type, slug')
    .textSearch('content', query.split(' ').join(' & '))
    .limit(5);

  const { data: faqItems } = await supabase
    .from('faq_items')
    .select('id, question, answer, context_type')
    .textSearch('question', query.split(' ').join(' | '))
    .eq('is_published', true)
    .limit(3);

  if (chunks) {
    for (const chunk of chunks) {
      results.push({
        id: chunk.id,
        title: chunk.title || 'Document',
        snippet: chunk.content?.substring(0, 200) + '...',
        url: chunk.slug ? `/academy/apogee/category/${chunk.slug}` : '/academy',
        source: chunk.block_type || 'apogee',
      });
    }
  }

  if (faqItems) {
    for (const faq of faqItems) {
      results.push({
        id: faq.id,
        title: faq.question,
        snippet: faq.answer?.substring(0, 200) + '...',
        url: '/support/helpcenter',
        source: 'faq',
      });
    }
  }

  return { results };
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  const startTime = Date.now();
  
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`unified-search:${user.id}`, { limit: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('agence, enabled_modules, global_role, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const globalRole = profile?.global_role || 'base_user';
    const userRoleLevel = getRoleLevel(globalRole);
    const agencySlug = profile?.agence || '';
    
    console.log(`[unified-search] User id=${user.id}, role=${globalRole} (level=${userRoleLevel}), agence=${agencySlug || 'none'}`);

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      }));
    }

    // ========== STEP 1: NORMALIZE ==========
    const normalized = normalizeQuery(query);
    console.log(`[unified-search] Query: "${query}" → normalized: "${normalized}"`);

    // ========== STEP 2: DETECT QUERY TYPE (Heuristic) ==========
    const heuristicResult = detectQueryType(normalized);
    console.log(`[unified-search] Heuristic: type=${heuristicResult.type}, confidence=${heuristicResult.confidence}`);

    // ========== STEP 3: EXTRACT INTENT WITH LLM ==========
    let llmDraft: LLMDraftIntent | null = null;
    if (heuristicResult.type === 'stats' || heuristicResult.type === 'unknown') {
      llmDraft = await extractIntentWithLLM(query, supabaseUrl, authHeader);
      console.log(`[unified-search] LLM draft: ${llmDraft ? JSON.stringify(llmDraft) : 'null'}`);
    }

    // ========== STEP 4: VALIDATE AND ROUTE ==========
    const allowedAgencyIds = agencySlug ? [agencySlug] : [];
    const validatedIntent = validateAndRoute(llmDraft, normalized, query, userRoleLevel, agencySlug, allowedAgencyIds);
    console.log(`[unified-search] Validated: type=${validatedIntent.type}, metric=${validatedIntent.metricId}, corrections=${validatedIntent.corrections.join(', ')}`);

    // ========== ACCESS CONTROL ==========
    // N0/N1: No stats access
    if (validatedIntent.type === 'stats' && userRoleLevel < 1) {
      console.log('[unified-search] N0/N1 denied stats, fallback to docs');
      validatedIntent.type = 'doc';
      validatedIntent.corrections.push('stats_denied_role_fallback_doc');
    }

    // N2: Only own agency
    if (validatedIntent.type === 'stats' && userRoleLevel === 2 && !agencySlug) {
      console.log('[unified-search] N2 without agency denied');
      const response: SearchResponse = {
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(validatedIntent),
        computedAt: new Date().toISOString(),
        agencySlug: '',
        accessDenied: true,
        accessMessage: 'Vous devez être rattaché à une agence pour accéder aux statistiques.',
      };
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // Metric access level check
    if (validatedIntent.type === 'stats' && validatedIntent.minRole > userRoleLevel) {
      console.log(`[unified-search] Metric access denied: user level ${userRoleLevel} < required ${validatedIntent.minRole}`);
      const response: SearchResponse = {
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(validatedIntent),
        computedAt: new Date().toISOString(),
        agencySlug,
        accessDenied: true,
        accessMessage: 'Vous n\'avez pas accès à cette statistique. Contactez votre responsable.',
      };
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ========== STEP 5: EXECUTE ==========
    let result: StatResult | DocResult | ActionResult | null = null;

    if (validatedIntent.type === 'stats' && validatedIntent.metricId) {
      // Validate metric exists in statiaService
      if (!hasMetric(validatedIntent.metricId)) {
        console.error(`[unified-search] Metric ${validatedIntent.metricId} not in statiaService`);
        validatedIntent.metricId = 'ca_global_ht';
        validatedIntent.corrections.push(`metric_not_in_service_fallback`);
      }

      const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
      const requiredSources = getRequiredSources(validatedIntent.metricId);
      
      console.log(`[unified-search] Loading sources: ${requiredSources.join(', ')}`);
      
      const apogeeData = await loadApogeeData(proxyUrl, authHeader, agencySlug, validatedIntent.period, requiredSources);
      
      console.log(`[unified-search] Data loaded: ${apogeeData.factures.length} factures, ${apogeeData.projects.length} projects`);

      const params: StatParams = {
        dateRange: { start: validatedIntent.period.start, end: validatedIntent.period.end },
        agencySlug,
        topN: validatedIntent.limit || undefined,
      };

      result = computeMetric(validatedIntent.metricId, apogeeData, params);
      
      console.log(`[unified-search] Computed: ${(result as StatResult).value}${(result as StatResult).unit}`);
    } else if (validatedIntent.type === 'doc' || validatedIntent.type === 'unknown' || validatedIntent.type === 'pedagogic') {
      result = await searchDocs(supabase, query);
    } else if (validatedIntent.type === 'action') {
      // TODO: Implement action routing
      result = { action: 'navigate', targetUrl: '/', label: 'Accueil' };
    }

    // ========== BUILD RESPONSE ==========
    const interpretation = buildInterpretation(validatedIntent);
    
    const response: SearchResponse = {
      type: validatedIntent.type === 'stats' ? 'stat' : 
            validatedIntent.type === 'doc' || validatedIntent.type === 'pedagogic' ? 'doc' : 
            validatedIntent.type === 'action' ? 'action' : 'fallback',
      result,
      interpretation,
      computedAt: new Date().toISOString(),
      agencySlug,
    };

    // Add debug block for N6 superadmin only
    if (userRoleLevel >= 6) {
      response.debug = {
        llmDraft,
        validatedIntent,
        corrections: validatedIntent.corrections,
        normalizedQuery: normalized,
        statsScore: heuristicResult.categories.filter(c => c.startsWith('stats:')).length,
        detectedCategories: heuristicResult.categories,
        executionTimeMs: Date.now() - startTime,
      };
    }

    return withCors(req, new Response(JSON.stringify(response), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    }));
  }
});

function buildInterpretation(intent: ValidatedIntent): InterpretationBlock {
  return {
    metricId: intent.metricId,
    metricLabel: intent.metricLabel,
    dimension: intent.dimension,
    intentType: intent.intentType,
    period: {
      start: intent.period.start.toISOString(),
      end: intent.period.end.toISOString(),
      label: intent.period.label,
    },
    filters: intent.filters,
    confidence: intent.confidence,
    enginePath: `heuristic→LLM→validateAndRoute→${intent.type === 'stats' ? 'StatIA' : intent.type}`,
  };
}
