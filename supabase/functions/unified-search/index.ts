/**
 * Edge Function: unified-search
 * 
 * ORCHESTRATEUR SIMPLIFIÉ
 * Ce fichier est devenu un orchestrateur léger qui délègue à:
 * - ai-search-extract (LLM Gemini)
 * - statiaService (calcul métrique)
 * - Supabase (recherche documentaire)
 * 
 * La logique métier (détection, validation, routing) est centralisée
 * côté client dans src/services/aiSearch/
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { computeMetric, getRequiredSources, hasMetric, type StatParams, type StatResult } from './statiaService.ts';

// ============= TYPES =============

interface LLMDraftIntent {
  queryType: string;
  metric: string | null;
  dimension: string | null;
  intentType: string | null;
  limit: number | null;
  period: { type?: string; from?: string; to?: string; start?: string; end?: string; label?: string } | null;
  filters: Record<string, string | string[] | null>;
  confidence: number;
  reasoning?: string;
  llmAvailable?: boolean;
  rawQuery?: string;
}

interface ParsedPeriod {
  start: Date;
  end: Date;
  label: string;
  isDefault: boolean;
}

interface ValidatedIntent {
  type: 'stats' | 'doc' | 'action' | 'unknown';
  metricId: string | null;
  metricLabel: string | null;
  dimension: string;
  intentType: string;
  period: ParsedPeriod;
  limit: number | null;
  filters: Record<string, unknown>;
  confidence: number;
  minRole: number;
  isRanking: boolean;
  corrections: string[];
}

interface SearchResponse {
  type: 'stat' | 'doc' | 'action' | 'ambiguous' | 'error' | 'access_denied';
  result: any;
  interpretation: any;
  debug?: any;
  computedAt: string;
  agencySlug: string;
  fromCache?: boolean;
  accessDenied?: boolean;
  accessMessage?: string;
  error?: { code: string; message: string };
}

// ============= CONSTANTS =============

const ROLE_LEVELS: Record<string, number> = {
  'superadmin': 6, 'platform_admin': 5, 'franchisor_admin': 4,
  'franchisor_user': 3, 'franchisee_admin': 2, 'franchisee_user': 1, 'base_user': 0,
};

// Metrics registry simplifié (le complet est côté client)
const METRICS_INFO: Record<string, { label: string; minRole: number; isRanking: boolean; unit: string }> = {
  'ca_global_ht': { label: 'CA global HT', minRole: 0, isRanking: false, unit: '€' },
  'ca_par_apporteur': { label: 'CA par apporteur', minRole: 2, isRanking: true, unit: '€' },
  'ca_par_univers': { label: 'CA par univers', minRole: 0, isRanking: true, unit: '€' },
  'ca_par_technicien': { label: 'CA par technicien', minRole: 2, isRanking: true, unit: '€' },
  'top_techniciens_ca': { label: 'Top techniciens CA', minRole: 2, isRanking: true, unit: '€' },
  'top_apporteurs_ca': { label: 'Top apporteurs CA', minRole: 2, isRanking: true, unit: '€' },
  'taux_sav_global': { label: 'Taux de SAV', minRole: 0, isRanking: false, unit: '%' },
  'sav_par_univers': { label: 'SAV par univers', minRole: 0, isRanking: true, unit: '%' },
  'panier_moyen': { label: 'Panier moyen', minRole: 0, isRanking: false, unit: '€' },
  'nb_dossiers_crees': { label: 'Nombre de dossiers', minRole: 0, isRanking: false, unit: '' },
  'ca_moyen_par_tech': { label: 'CA moyen par technicien', minRole: 2, isRanking: false, unit: '€' },
  'nb_dossiers_par_univers': { label: 'Dossiers par univers', minRole: 0, isRanking: true, unit: 'dossiers' },
  'dossiers_par_apporteur': { label: 'Dossiers par apporteur', minRole: 2, isRanking: true, unit: 'dossiers' },
  'taux_transformation_devis': { label: 'Taux transformation devis', minRole: 0, isRanking: false, unit: '%' },
  'delai_premier_devis': { label: 'Délai premier devis', minRole: 0, isRanking: false, unit: 'jours' },
  'ca_moyen_par_jour': { label: 'CA moyen par jour', minRole: 0, isRanking: false, unit: '€/jour' },
  'ca_mensuel': { label: 'CA mensuel', minRole: 0, isRanking: true, unit: '€' },
};

const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'fevrier': 1, 'février': 1, 'fev': 1, 'mars': 2,
  'avril': 3, 'avr': 3, 'mai': 4, 'juin': 5, 'juillet': 6, 'juil': 6,
  'aout': 7, 'août': 7, 'septembre': 8, 'sept': 8, 'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10, 'decembre': 11, 'décembre': 11, 'dec': 11,
};

// ============= HELPERS =============

function normalizeQuery(query: string): string {
  return query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function getRoleLevel(globalRole: string | null | undefined): number {
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}

function getMonthName(monthIndex: number): string {
  return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][monthIndex] || '';
}

function detectQueryTypeHeuristic(normalized: string): { type: 'stats' | 'doc' | 'action' | 'unknown'; confidence: number } {
  const statsKeywords = ['combien', 'ca', 'chiffre', 'dossiers', 'moyenne', 'top', 'meilleur', 'taux', 'panier', 'sav', 'technicien', 'apporteur', 'univers', 'rapporte', 'délai', 'delai'];
  const actionKeywords = ['ouvrir', 'afficher', 'voir', 'aller', 'naviguer'];
  const docKeywords = ['comment', 'pourquoi', 'expliquer', "c'est quoi"];
  
  let statsScore = 0, actionScore = 0, docScore = 0;
  for (const kw of statsKeywords) if (normalized.includes(kw)) statsScore++;
  for (const kw of actionKeywords) if (normalized.includes(kw)) actionScore++;
  for (const kw of docKeywords) if (normalized.includes(kw)) docScore++;
  
  if (statsScore > actionScore && statsScore > docScore) return { type: 'stats', confidence: Math.min(0.5 + statsScore * 0.1, 0.9) };
  if (actionScore > docScore) return { type: 'action', confidence: 0.7 };
  if (docScore > 0) return { type: 'doc', confidence: 0.6 };
  return { type: 'unknown', confidence: 0.3 };
}

function extractPeriodFromLLM(llmPeriod: LLMDraftIntent['period'], originalQuery: string, now: Date): ParsedPeriod {
  const normalized = normalizeQuery(originalQuery);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Priority 1: LLM explicit period with from/to
  if (llmPeriod) {
    const from = llmPeriod.start || llmPeriod.from;
    const to = llmPeriod.end || llmPeriod.to;
    if (from && to) {
      try {
        return {
          start: new Date(from),
          end: new Date(to),
          label: llmPeriod.label || 'Période personnalisée',
          isDefault: false,
        };
      } catch {
        // Fall through to query parsing
      }
    }
  }
  
  // Priority 2: Parse from query
  if (normalized.includes('cette annee')) {
    return { start: new Date(currentYear, 0, 1), end: new Date(currentYear, 11, 31), label: `Année ${currentYear}`, isDefault: false };
  }
  if (normalized.includes('annee derniere')) {
    return { start: new Date(currentYear - 1, 0, 1), end: new Date(currentYear - 1, 11, 31), label: `Année ${currentYear - 1}`, isDefault: false };
  }
  if (normalized.includes('ce mois')) {
    return { start: new Date(currentYear, currentMonth, 1), end: new Date(currentYear, currentMonth + 1, 0), label: `${getMonthName(currentMonth)} ${currentYear}`, isDefault: false };
  }
  if (normalized.includes('mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return { start: new Date(year, lastMonth, 1), end: new Date(year, lastMonth + 1, 0), label: `${getMonthName(lastMonth)} ${year}`, isDefault: false };
  }
  
  // Month name detection
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    if (normalized.includes(moisName)) {
      const yearMatch = normalized.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      return { start: new Date(year, moisIndex, 1), end: new Date(year, moisIndex + 1, 0), label: `${getMonthName(moisIndex)} ${year}`, isDefault: false };
    }
  }
  
  // Default: 12 derniers mois
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);
  return { start, end: new Date(currentYear, currentMonth + 1, 0), label: '12 derniers mois', isDefault: true };
}

function findMetricFromKeywords(normalized: string): string | null {
  const patterns: Array<{ keywords: string[]; metricId: string }> = [
    { keywords: ['reste à encaisser', 'reste encaisser', 'impayé', 'encours'], metricId: 'reste_a_encaisser' },
    { keywords: ['taux recouvrement'], metricId: 'taux_recouvrement' },
    { keywords: ['sav par univers'], metricId: 'sav_par_univers' },
    { keywords: ['taux sav', 'sav'], metricId: 'taux_sav_global' },
    { keywords: ['transformation devis', 'taux devis'], metricId: 'taux_transformation_devis' },
    { keywords: ['délai premier devis', 'delai premier devis'], metricId: 'delai_premier_devis' },
    { keywords: ['panier moyen'], metricId: 'panier_moyen' },
    { keywords: ['ca moyen jour', 'ca par jour'], metricId: 'ca_moyen_par_jour' },
    { keywords: ['ca moyen tech'], metricId: 'ca_moyen_par_tech' },
    { keywords: ['ca mensuel', 'ca par mois'], metricId: 'ca_mensuel' },
    { keywords: ['dossiers par univers'], metricId: 'nb_dossiers_par_univers' },
    { keywords: ['dossiers par apporteur'], metricId: 'dossiers_par_apporteur' },
    { keywords: ['nombre dossiers', 'nb dossiers', 'combien dossiers'], metricId: 'nb_dossiers_crees' },
    { keywords: ['top technicien', 'meilleur technicien'], metricId: 'ca_par_technicien' },
    { keywords: ['top apporteur', 'meilleur apporteur'], metricId: 'ca_par_apporteur' },
    { keywords: ['top univers', 'meilleur univers'], metricId: 'ca_par_univers' },
    { keywords: ['technicien'], metricId: 'ca_par_technicien' },
    { keywords: ['apporteur'], metricId: 'ca_par_apporteur' },
    { keywords: ['univers'], metricId: 'ca_par_univers' },
  ];
  
  for (const { keywords, metricId } of patterns) {
    if (keywords.some(kw => normalized.includes(kw))) return metricId;
  }
  
  if (normalized.includes('ca') || normalized.includes('chiffre') || normalized.includes('rapporte')) {
    return 'ca_global_ht';
  }
  return null;
}

function extractTopN(query: string): number | undefined {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) return 5;
  return undefined;
}

function extractTechnicienFilter(llmFilters: Record<string, any>, query: string): string | null {
  if (llmFilters?.technicien) return String(llmFilters.technicien).toLowerCase();
  // Try to detect name patterns
  const match = query.match(/(?:technicien|tech)\s+(\w+)/i);
  if (match) return match[1].toLowerCase();
  return null;
}

// ============= CACHE =============

async function getCacheEntry(supabase: any, key: string): Promise<any | null> {
  try {
    const { data } = await supabase
      .from('ai_search_cache')
      .select('value, created_at, ttl_seconds')
      .eq('key', key)
      .maybeSingle();
    
    if (!data) return null;
    
    const created = new Date(data.created_at).getTime();
    const ttlMs = (data.ttl_seconds ?? 900) * 1000;
    if (Date.now() - created > ttlMs) {
      supabase.from('ai_search_cache').delete().eq('key', key);
      return null;
    }
    return data.value;
  } catch {
    return null;
  }
}

async function setCacheEntry(supabase: any, key: string, value: any, ttlSeconds: number): Promise<void> {
  try {
    await supabase.from('ai_search_cache').upsert([{
      key,
      value: JSON.parse(JSON.stringify(value)),
      ttl_seconds: ttlSeconds,
    }], { onConflict: 'key' });
  } catch { /* ignore */ }
}

function buildCacheKey(metricId: string, agencySlug: string, period: ParsedPeriod, filters: Record<string, unknown>): string {
  return `stat:${metricId}:${agencySlug}:${period.start.toISOString().split('T')[0]}:${period.end.toISOString().split('T')[0]}:${JSON.stringify(filters)}`;
}

function computeTTL(period: ParsedPeriod): number {
  const now = new Date();
  if (period.end.getFullYear() === now.getFullYear() && period.end.getMonth() === now.getMonth()) {
    return 300; // 5 min for current month
  }
  return 3600; // 1h for closed periods
}

// ============= LLM EXTRACTION =============

async function extractIntentWithLLM(query: string, supabaseUrl: string, authHeader: string): Promise<LLMDraftIntent | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-search-extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      console.error('[unified-search] LLM extraction failed:', response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[unified-search] LLM extraction error:', error);
    return null;
  }
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

async function searchDocs(supabase: any, query: string): Promise<{ results: any[] }> {
  const results: any[] = [];
  
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

// ============= VALIDATE & ROUTE =============

function validateAndRoute(
  llmDraft: LLMDraftIntent | null,
  normalized: string,
  originalQuery: string,
  userRoleLevel: number,
  now: Date
): ValidatedIntent {
  const corrections: string[] = [];
  const heuristic = detectQueryTypeHeuristic(normalized);
  
  // 1. Determine type
  let queryType: 'stats' | 'doc' | 'action' | 'unknown' = 
    llmDraft?.queryType === 'stats' ? 'stats' : 
    heuristic.type;
  
  if (llmDraft && (llmDraft.confidence ?? 0) < 0.5 && heuristic.confidence > 0.5) {
    queryType = heuristic.type;
    corrections.push(`type_corrected:${llmDraft.queryType}→${heuristic.type}`);
  }
  
  // 2. Find metric
  let metricId: string | null = null;
  
  if (queryType === 'stats') {
    // Trust LLM metric if valid
    if (llmDraft?.metric && hasMetric(llmDraft.metric)) {
      metricId = llmDraft.metric;
    } else {
      // Fallback to keyword detection
      const keywordMetric = findMetricFromKeywords(normalized);
      if (keywordMetric && hasMetric(keywordMetric)) {
        metricId = keywordMetric;
        if (llmDraft?.metric) {
          corrections.push(`metric_corrected:${llmDraft.metric}→${keywordMetric}`);
        }
      } else if (llmDraft?.metric) {
        // LLM proposed invalid metric - use ca_global_ht as fallback but log it
        corrections.push(`metric_unknown:${llmDraft.metric}→ca_global_ht`);
        metricId = 'ca_global_ht';
      }
    }
    
    // If still no metric, default to ca_global_ht
    if (!metricId) {
      metricId = 'ca_global_ht';
      corrections.push('metric_default:ca_global_ht');
    }
  }
  
  const metricInfo = metricId ? METRICS_INFO[metricId] : null;
  
  // 3. Detect dimension
  let dimension = 'global';
  if (normalized.includes('technicien') || normalized.includes('tech')) dimension = 'technicien';
  else if (normalized.includes('apporteur') || normalized.includes('commanditaire')) dimension = 'apporteur';
  else if (normalized.includes('univers') || normalized.includes('metier')) dimension = 'univers';
  else if (llmDraft?.dimension) dimension = llmDraft.dimension;
  
  // 4. Detect intent type
  let intentType = llmDraft?.intentType || 'valeur';
  if (normalized.includes('top') || normalized.includes('meilleur')) intentType = 'top';
  else if (normalized.includes('moyenne') || normalized.includes('moyen')) intentType = 'moyenne';
  else if (normalized.includes('taux') || normalized.includes('%')) intentType = 'taux';
  
  // 5. Parse period
  const period = extractPeriodFromLLM(llmDraft?.period ?? null, originalQuery, now);
  if (period.isDefault) corrections.push('period_default:12_mois');
  
  // 6. Check period limit (max 24 months)
  const periodDays = (period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24);
  if (periodDays > 730) {
    corrections.push('period_too_long');
  }
  
  // 7. Extract filters
  const filters: Record<string, unknown> = {};
  if (llmDraft?.filters?.technicien) {
    filters.technicien = String(llmDraft.filters.technicien).toLowerCase();
  }
  if (llmDraft?.filters?.univers) {
    filters.univers = String(llmDraft.filters.univers).toUpperCase();
  }
  if (llmDraft?.filters?.apporteur) {
    filters.apporteur = llmDraft.filters.apporteur;
  }
  
  // 8. Limit
  const limit = llmDraft?.limit || extractTopN(originalQuery) || metricInfo?.isRanking ? 5 : null;
  
  // 9. Access control
  const minRole = metricInfo?.minRole || 0;
  
  // 10. Confidence
  let confidence = llmDraft?.confidence || heuristic.confidence;
  if (corrections.length > 0) confidence = Math.max(0.3, confidence - corrections.length * 0.1);
  
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
      .select('agence, global_role, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const globalRole = profile?.global_role || 'base_user';
    const userRoleLevel = getRoleLevel(globalRole);
    const agencySlug = profile?.agence || '';
    
    console.log(`[unified-search] User id=${user.id}, role=${globalRole} (level=${userRoleLevel}), agence=${agencySlug}`);

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ 
        type: 'error',
        error: { code: 'QUERY_REQUIRED', message: 'Une question est requise.' }
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const now = new Date();
    const normalized = normalizeQuery(query);
    console.log(`[unified-search] Query: "${query}" → normalized: "${normalized}"`);

    // ========== STEP 1: HEURISTIC DETECTION ==========
    const heuristic = detectQueryTypeHeuristic(normalized);
    console.log(`[unified-search] Heuristic: type=${heuristic.type}, confidence=${heuristic.confidence}`);

    // ========== STEP 2: LLM EXTRACTION ==========
    let llmDraft: LLMDraftIntent | null = null;
    if (heuristic.type === 'stats' || heuristic.type === 'unknown' || heuristic.confidence < 0.6) {
      llmDraft = await extractIntentWithLLM(query, supabaseUrl, authHeader);
      console.log(`[unified-search] LLM draft: ${llmDraft ? JSON.stringify(llmDraft) : 'null'}`);
    }

    // ========== STEP 3: VALIDATE & ROUTE ==========
    const validated = validateAndRoute(llmDraft, normalized, query, userRoleLevel, now);
    console.log(`[unified-search] Validated: type=${validated.type}, metric=${validated.metricId}, corrections=${validated.corrections.join(', ')}`);

    // ========== ACCESS CONTROL ==========
    
    // N0/N1: No stats access → fallback to docs
    if (validated.type === 'stats' && userRoleLevel < 2) {
      console.log('[unified-search] N0/N1 denied stats, fallback to docs');
      validated.type = 'doc';
      validated.corrections.push('stats_denied_role:fallback_doc');
    }

    // N2: Must have agency
    if (validated.type === 'stats' && userRoleLevel === 2 && !agencySlug) {
      console.log('[unified-search] N2 without agency');
      return withCors(req, new Response(JSON.stringify({
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(validated, agencySlug),
        computedAt: now.toISOString(),
        agencySlug: '',
        accessDenied: true,
        accessMessage: 'Vous devez être rattaché à une agence pour accéder aux statistiques.',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // Metric access level check
    if (validated.type === 'stats' && validated.minRole > userRoleLevel) {
      console.log(`[unified-search] Metric access denied: user level ${userRoleLevel} < required ${validated.minRole}`);
      return withCors(req, new Response(JSON.stringify({
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(validated, agencySlug),
        computedAt: now.toISOString(),
        agencySlug,
        accessDenied: true,
        accessMessage: `Cette statistique nécessite un niveau d'accès supérieur (N${validated.minRole}+).`,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ========== STEP 4: EXECUTE ==========
    let result: any = null;
    let fromCache = false;

    if (validated.type === 'stats' && validated.metricId) {
      // Check metric exists
      if (!hasMetric(validated.metricId)) {
        console.error(`[unified-search] Metric ${validated.metricId} not found in statiaService`);
        return withCors(req, new Response(JSON.stringify({
          type: 'error',
          result: null,
          interpretation: buildInterpretation(validated, agencySlug),
          computedAt: now.toISOString(),
          agencySlug,
          error: { code: 'METRIC_NOT_FOUND', message: `Métrique "${validated.metricId}" non disponible.` }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // Check cache
      const cacheKey = buildCacheKey(validated.metricId, agencySlug, validated.period, validated.filters);
      const cached = await getCacheEntry(supabase, cacheKey);
      
      if (cached) {
        console.log('[unified-search] Cache hit');
        result = cached;
        fromCache = true;
      } else {
        // Load data
        const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
        const requiredSources = getRequiredSources(validated.metricId);
        console.log(`[unified-search] Loading sources: ${requiredSources.join(', ')}`);
        
        const apogeeData = await loadApogeeData(proxyUrl, authHeader, agencySlug, validated.period, requiredSources);
        console.log(`[unified-search] Data loaded: ${apogeeData.factures.length} factures, ${apogeeData.projects.length} projects`);

        const params: StatParams = {
          dateRange: { start: validated.period.start, end: validated.period.end },
          agencySlug,
          topN: validated.limit || undefined,
          filters: validated.filters,
        };

        result = computeMetric(validated.metricId, apogeeData, params);
        console.log(`[unified-search] Computed: ${result.value}${result.unit}`);

        // Save to cache
        const ttl = computeTTL(validated.period);
        await setCacheEntry(supabase, cacheKey, result, ttl);
      }
      
    } else if (validated.type === 'doc' || validated.type === 'unknown') {
      result = await searchDocs(supabase, query);
      
    } else if (validated.type === 'action') {
      result = { action: 'navigate', targetUrl: '/', label: 'Accueil' };
    }

    // ========== BUILD RESPONSE ==========
    const interpretation = buildInterpretation(validated, agencySlug);
    
    const response: SearchResponse = {
      type: validated.type === 'stats' ? 'stat' : 
            validated.type === 'doc' ? 'doc' : 
            validated.type === 'action' ? 'action' : 'doc',
      result,
      interpretation,
      computedAt: now.toISOString(),
      agencySlug,
      fromCache,
    };

    // Debug block for N6 only
    if (userRoleLevel >= 6) {
      response.debug = {
        llmDraft,
        validatedIntent: validated,
        corrections: validated.corrections,
        normalizedQuery: normalized,
        executionTimeMs: Date.now() - startTime,
        cacheKey: validated.metricId ? buildCacheKey(validated.metricId, agencySlug, validated.period, validated.filters) : null,
      };
    }

    return withCors(req, new Response(JSON.stringify(response), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      type: 'error',
      error: { 
        code: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Erreur interne' 
      }
    }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
});

function buildInterpretation(intent: ValidatedIntent, agencySlug: string): any {
  return {
    metricId: intent.metricId,
    metricLabel: intent.metricLabel,
    dimension: intent.dimension,
    intentType: intent.intentType,
    period: {
      start: intent.period.start.toISOString(),
      end: intent.period.end.toISOString(),
      label: intent.period.label,
      isDefault: intent.period.isDefault,
    },
    filters: intent.filters,
    confidence: intent.confidence,
    corrections: intent.corrections,
    agencySlug,
    enginePath: `heuristic→LLM→validate→${intent.type === 'stats' ? 'StatIA' : intent.type}`,
  };
}
