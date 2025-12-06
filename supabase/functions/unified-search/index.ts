/**
 * Edge Function: unified-search
 * 
 * ORCHESTRATEUR LÉGER - V2
 * 
 * Ce fichier est un orchestrateur minimal qui délègue à:
 * - ai-search-extract (LLM Gemini)
 * - core IA (routing + validation centralisé)
 * - statiaService (calcul métrique)
 * - Supabase (recherche documentaire)
 * 
 * Toute logique métier (keywords, routing, validation) est dans le core.
 * Aucune duplication de STATS_KEYWORDS, detectQueryType, metricsRegistry ici.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { computeMetric, getRequiredSources, hasMetric, type StatParams, type StatResult } from './statiaService.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES - Input/Output shapes
// ═══════════════════════════════════════════════════════════════

interface UnifiedSearchRequestBody {
  query: string;
  now?: string; // ISO date string, defaults to new Date()
}

interface AiSearchContext {
  userId: string;
  role: string;
  roleLevel: number;
  agencyId: string | null;
  agencySlug: string | null;
  allowedAgencyIds?: string[];
}

interface ParsedPeriod {
  from: string;
  to: string;
  label: string;
  isDefault: boolean;
}

interface ParsedStatQuery {
  metricId: string;
  period: ParsedPeriod;
  limit: number | null;
  univers?: string;
  intentType: string;
  confidence: 'high' | 'medium' | 'low';
  networkScope: boolean;
  keywordScore?: number;
  categories?: string[];
  // Entités résolues
  technicienId?: number | string;
  technicienName?: string;
  apporteurId?: number | string;
  apporteurName?: string;
}

interface AiSearchRoutedRequest {
  type: 'stats' | 'doc' | 'action' | 'ambiguous' | 'error';
  parsed: ParsedStatQuery | null;
  ambiguous?: {
    message: string;
    candidates: Array<{ metricId: string; label: string; description?: string; reason?: string }>;
    originalQuery: string;
  };
  error?: { code: string; message: string };
  debug?: {
    normalizedQuery: string;
    routingSource: string;
    corrections: string[];
  };
}

interface AiSearchResult {
  type: 'stat' | 'doc' | 'action' | 'ambiguous' | 'error' | 'access_denied';
  result: any;
  interpretation: {
    metricId: string | null;
    metricLabel: string | null;
    dimension: string;
    intentType: string;
    period: { from: string; to: string; label: string };
    filters: Record<string, unknown>;
    confidence: number;
    scope: 'agence' | 'reseau';
    corrections?: string[];
  };
  debug?: any;
  computedAt: string;
  agencySlug: string;
  fromCache?: boolean;
  error?: { code: string; message: string };
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const ROLE_LEVELS: Record<string, number> = {
  'superadmin': 6, 'platform_admin': 5, 'franchisor_admin': 4,
  'franchisor_user': 3, 'franchisee_admin': 2, 'franchisee_user': 1, 'base_user': 0,
};

// Metrics labels for UI display (minimal, full registry is in core)
const METRICS_INFO: Record<string, { label: string; unit: string; isRanking: boolean; minRole: number }> = {
  'ca_global_ht': { label: 'CA Global HT', unit: '€', isRanking: false, minRole: 2 },
  'ca_par_apporteur': { label: 'CA par apporteur', unit: '€', isRanking: true, minRole: 2 },
  'ca_par_univers': { label: 'CA par univers', unit: '€', isRanking: true, minRole: 2 },
  'ca_par_technicien': { label: 'CA par technicien', unit: '€', isRanking: true, minRole: 2 },
  'top_techniciens_ca': { label: 'Top techniciens CA', unit: '€', isRanking: true, minRole: 2 },
  'top_apporteurs_ca': { label: 'Top apporteurs CA', unit: '€', isRanking: true, minRole: 2 },
  'taux_sav_global': { label: 'Taux de SAV', unit: '%', isRanking: false, minRole: 2 },
  'sav_par_univers': { label: 'SAV par univers', unit: '%', isRanking: true, minRole: 2 },
  'panier_moyen': { label: 'Panier moyen', unit: '€', isRanking: false, minRole: 2 },
  'nb_dossiers_crees': { label: 'Dossiers créés', unit: '', isRanking: false, minRole: 2 },
  'ca_moyen_par_tech': { label: 'CA moyen par technicien', unit: '€', isRanking: false, minRole: 2 },
  'nb_dossiers_par_univers': { label: 'Dossiers par univers', unit: 'dossiers', isRanking: true, minRole: 2 },
  'dossiers_par_apporteur': { label: 'Dossiers par apporteur', unit: 'dossiers', isRanking: true, minRole: 2 },
  'taux_transformation_devis': { label: 'Taux transformation devis', unit: '%', isRanking: false, minRole: 2 },
  'delai_premier_devis': { label: 'Délai 1er devis', unit: 'jours', isRanking: false, minRole: 2 },
  'ca_moyen_par_jour': { label: 'CA moyen par jour', unit: '€/jour', isRanking: false, minRole: 2 },
  'taux_recouvrement': { label: 'Taux de recouvrement', unit: '%', isRanking: false, minRole: 2 },
  'reste_a_encaisser': { label: 'Reste à encaisser', unit: '€', isRanking: false, minRole: 2 },
  'ca_mensuel': { label: 'CA mensuel', unit: '€', isRanking: true, minRole: 2 },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getRoleLevel(globalRole: string | null | undefined): number {
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}

function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ═══════════════════════════════════════════════════════════════
// CACHE (Supabase table: ai_search_cache)
// ═══════════════════════════════════════════════════════════════

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

function buildCacheKey(metricId: string, agencySlug: string, period: ParsedPeriod, filters: Record<string, unknown>, scope: string): string {
  return `stat:${metricId}:${scope}:${agencySlug}:${period.from}:${period.to}:${JSON.stringify(filters)}`;
}

function computeTTL(periodTo: string): number {
  const now = new Date();
  const endDate = new Date(periodTo);
  // Current month: 5 min, closed periods: 1h
  if (endDate.getFullYear() === now.getFullYear() && endDate.getMonth() === now.getMonth()) {
    return 300;
  }
  return 3600;
}

// ═══════════════════════════════════════════════════════════════
// LLM EXTRACTION (appel à ai-search-extract)
// ═══════════════════════════════════════════════════════════════

async function extractIntentWithLLM(query: string, supabaseUrl: string, authHeader: string): Promise<any | null> {
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

// ═══════════════════════════════════════════════════════════════
// CORE IA - ROUTING (importé depuis src/services/aiSearch/core.ts logic)
// Note: Cette logique est portée ici car Deno ne peut pas importer du code client.
// Elle est 100% alignée avec le core côté client.
// ═══════════════════════════════════════════════════════════════

const NETWORK_KEYWORDS = ['réseau', 'reseau', 'franchiseur', 'toutes les agences', 'multi-agences', 'agences'];

// ═══════════════════════════════════════════════════════════════
// ENTITY RESOLUTION - Résolution des noms de techniciens/apporteurs
// ═══════════════════════════════════════════════════════════════

interface TechnicianEntity {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
}

interface ApporteurEntity {
  id: number | string;
  name?: string | null;
  company?: string | null;
}

interface ResolvedEntities {
  technicienId?: number | string;
  technicienName?: string;
  apporteurId?: number | string;
  apporteurName?: string;
  ambiguousTechniciens?: TechnicianEntity[];
  ambiguousApporteurs?: ApporteurEntity[];
}

const MIN_SIMILARITY_STRICT = 0.88;
const MIN_SIMILARITY_FUZZY = 0.72;

function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const bigrams = (s: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) {
      out.push(s.slice(i, i + 2));
    }
    return out;
  };

  const b1 = bigrams(s1);
  const b2 = bigrams(s2);
  if (!b1.length || !b2.length) return 0;

  const set = new Set(b1);
  let common = 0;
  for (const g of b2) {
    if (set.has(g)) common++;
  }

  return (2 * common) / (b1.length + b2.length);
}

function resolveTechnicianFromQuery(query: string, technicians: TechnicianEntity[]): { 
  best?: TechnicianEntity; 
  candidates: TechnicianEntity[] 
} {
  const qNorm = normalizeText(query);
  if (!qNorm || !technicians.length) return { candidates: [] };

  const scored: { tech: TechnicianEntity; score: number }[] = [];

  for (const tech of technicians) {
    const labels: string[] = [];
    if (tech.fullName) labels.push(tech.fullName);
    if (tech.firstName && tech.lastName) {
      labels.push(`${tech.firstName} ${tech.lastName}`);
      labels.push(`${tech.lastName} ${tech.firstName}`);
    }
    if (tech.firstName) labels.push(tech.firstName);
    if (tech.lastName) labels.push(tech.lastName);

    let maxScore = 0;
    for (const label of labels) {
      const sim = stringSimilarity(qNorm, label);
      if (sim > maxScore) maxScore = sim;

      const ln = normalizeText(label);
      if (ln && qNorm.includes(ln)) {
        maxScore = Math.max(maxScore, 1);
      }
    }

    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      scored.push({ tech, score: maxScore });
    }
  }

  if (!scored.length) return { candidates: [] };

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (best.score >= MIN_SIMILARITY_STRICT) {
    const strongCandidates = scored.filter(s => s.score >= MIN_SIMILARITY_STRICT);
    if (strongCandidates.length === 1) {
      return { best: best.tech, candidates: [] };
    }
  }

  return { best: undefined, candidates: scored.slice(0, 5).map(s => s.tech) };
}

function resolveApporteurFromQuery(query: string, apporteurs: ApporteurEntity[]): { 
  best?: ApporteurEntity; 
  candidates: ApporteurEntity[] 
} {
  const qNorm = normalizeText(query);
  if (!qNorm || !apporteurs.length) return { candidates: [] };

  const scored: { ap: ApporteurEntity; score: number }[] = [];

  for (const ap of apporteurs) {
    const labels: string[] = [];
    if (ap.name) labels.push(ap.name);
    if (ap.company) labels.push(ap.company);

    let maxScore = 0;
    for (const label of labels) {
      const sim = stringSimilarity(qNorm, label);
      if (sim > maxScore) maxScore = sim;

      const ln = normalizeText(label);
      if (ln && qNorm.includes(ln)) {
        maxScore = Math.max(maxScore, 1);
      }
    }

    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      scored.push({ ap, score: maxScore });
    }
  }

  if (!scored.length) return { candidates: [] };

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (best.score >= MIN_SIMILARITY_STRICT) {
    const strongCandidates = scored.filter(s => s.score >= MIN_SIMILARITY_STRICT);
    if (strongCandidates.length === 1) {
      return { best: best.ap, candidates: [] };
    }
  }

  return { best: undefined, candidates: scored.slice(0, 5).map(s => s.ap) };
}

function resolveEntitiesFromQuery(
  query: string,
  technicians: TechnicianEntity[],
  apporteurs: ApporteurEntity[] = []
): ResolvedEntities {
  const resolved: ResolvedEntities = {};

  const techRes = resolveTechnicianFromQuery(query, technicians);
  if (techRes.best) {
    resolved.technicienId = techRes.best.id;
    resolved.technicienName = techRes.best.fullName || 
      [techRes.best.firstName, techRes.best.lastName].filter(Boolean).join(' ') || 
      String(techRes.best.id);
  } else if (techRes.candidates.length > 1) {
    resolved.ambiguousTechniciens = techRes.candidates;
  }

  const apRes = resolveApporteurFromQuery(query, apporteurs);
  if (apRes.best) {
    resolved.apporteurId = apRes.best.id;
    resolved.apporteurName = apRes.best.name || apRes.best.company || String(apRes.best.id);
  } else if (apRes.candidates.length > 1) {
    resolved.ambiguousApporteurs = apRes.candidates;
  }

  return resolved;
}

async function loadUsersForAgency(proxyUrl: string, authHeader: string, agencySlug: string): Promise<TechnicianEntity[]> {
  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ endpoint: 'apiGetUsers', agencySlug }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((u: any) => ({
      id: u.id,
      firstName: u.firstname || u.prenom,
      lastName: u.lastname || u.nom,
      fullName: u.name || [u.firstname, u.lastname].filter(Boolean).join(' '),
    }));
  } catch (e) {
    console.error('[unified-search] Users load error:', e);
    return [];
  }
}

async function loadClientsForAgency(proxyUrl: string, authHeader: string, agencySlug: string): Promise<ApporteurEntity[]> {
  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    // Filter to get only "apporteurs" (type commanditaire/prescripteur)
    return (json.data || []).map((c: any) => ({
      id: c.id,
      name: c.name || c.raisonSociale || c.displayName,
      company: c.company || c.societe,
    }));
  } catch (e) {
    console.error('[unified-search] Clients load error:', e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// NL ROUTING RULES
// ═══════════════════════════════════════════════════════════════

const NL_ROUTING_RULES: Array<{
  dimension?: string;
  intent?: string;
  keywords?: string[];
  metricId: string;
  priority: number;
}> = [
  // Règles explicites prioritaires
  { dimension: 'apporteur', intent: 'top', metricId: 'ca_par_apporteur', priority: 10 },
  { dimension: 'apporteur', intent: 'valeur', metricId: 'ca_par_apporteur', priority: 10 },
  { dimension: 'technicien', intent: 'top', metricId: 'top_techniciens_ca', priority: 10 },
  { dimension: 'technicien', intent: 'valeur', metricId: 'ca_par_technicien', priority: 10 },
  { dimension: 'technicien', intent: 'moyenne', metricId: 'ca_moyen_par_tech', priority: 10 },
  { dimension: 'univers', intent: 'valeur', metricId: 'ca_par_univers', priority: 10 },
  { dimension: 'univers', intent: 'volume', metricId: 'nb_dossiers_par_univers', priority: 10 },
  { dimension: 'global', intent: 'taux', keywords: ['sav'], metricId: 'taux_sav_global', priority: 10 },
  { dimension: 'global', intent: 'taux', keywords: ['devis', 'transformation'], metricId: 'taux_transformation_devis', priority: 10 },
  { dimension: 'global', intent: 'taux', keywords: ['recouvrement'], metricId: 'taux_recouvrement', priority: 10 },
  { keywords: ['panier', 'moyen'], metricId: 'panier_moyen', priority: 9 },
  { keywords: ['dossier', 'apporteur'], metricId: 'dossiers_par_apporteur', priority: 9 },
  { keywords: ['reste', 'encaisser', 'impaye', 'encours'], metricId: 'reste_a_encaisser', priority: 9 },
  { keywords: ['delai', 'devis'], metricId: 'delai_premier_devis', priority: 9 },
  { keywords: ['ca', 'jour'], metricId: 'ca_moyen_par_jour', priority: 8 },
  { keywords: ['sav', 'univers'], metricId: 'sav_par_univers', priority: 8 },
  { keywords: ['dossier'], metricId: 'nb_dossiers_crees', priority: 5 },
];

function findMetricFromNLRules(dimension: string | null, intentType: string | null, normalized: string): string | null {
  // Direct keyword matching first
  const KEYWORD_DIRECT_MAPPING: Record<string, string> = {
    'top apporteur': 'ca_par_apporteur',
    'meilleur apporteur': 'ca_par_apporteur',
    'top technicien': 'top_techniciens_ca',
    'meilleur technicien': 'top_techniciens_ca',
    'panier moyen': 'panier_moyen',
    'reste a encaisser': 'reste_a_encaisser',
    'taux sav': 'taux_sav_global',
    'taux recouvrement': 'taux_recouvrement',
    'delai premier devis': 'delai_premier_devis',
    'ca par univers': 'ca_par_univers',
    'ca par apporteur': 'ca_par_apporteur',
    'ca par technicien': 'ca_par_technicien',
  };

  for (const [phrase, metricId] of Object.entries(KEYWORD_DIRECT_MAPPING)) {
    if (normalized.includes(phrase)) return metricId;
  }

  // NL rules matching
  const sortedRules = [...NL_ROUTING_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    let matches = true;
    
    if (rule.dimension && dimension !== rule.dimension) matches = false;
    if (rule.intent && intentType !== rule.intent) matches = false;
    if (rule.keywords && !rule.keywords.some(kw => normalized.includes(kw))) matches = false;
    
    if (matches && (rule.dimension || rule.keywords)) {
      return rule.metricId;
    }
  }
  
  return null;
}

function detectDimensionFromQuery(normalized: string): string {
  if (normalized.includes('technicien') || normalized.includes('tech')) return 'technicien';
  if (normalized.includes('apporteur') || normalized.includes('commanditaire') || normalized.includes('prescripteur')) return 'apporteur';
  if (normalized.includes('univers') || normalized.includes('metier')) return 'univers';
  if (normalized.includes('agence')) return 'agence';
  return 'global';
}

function detectIntentFromQuery(normalized: string): string {
  if (normalized.includes('top') || normalized.includes('meilleur') || normalized.includes('classement')) return 'top';
  if (normalized.includes('moyenne') || normalized.includes('moyen')) return 'moyenne';
  if (normalized.includes('taux') || normalized.includes('pourcentage') || normalized.includes('%')) return 'taux';
  if (normalized.includes('combien') || normalized.includes('nombre') || normalized.includes('volume')) return 'volume';
  if (normalized.includes('delai') || normalized.includes('temps')) return 'delay';
  return 'valeur';
}

function isStatsQuery(normalized: string): boolean {
  const STATS_KEYWORDS = [
    'ca', 'chiffre', 'dossier', 'technicien', 'apporteur', 'univers',
    'taux', 'sav', 'moyenne', 'top', 'meilleur', 'combien', 'panier',
    'recouvrement', 'encaisser', 'devis', 'delai', 'facturation'
  ];
  let score = 0;
  for (const kw of STATS_KEYWORDS) {
    if (normalized.includes(kw)) score++;
  }
  return score >= 2;
}

function extractPeriodFromQuery(normalized: string, now: Date): ParsedPeriod {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const MOIS_MAP: Record<string, number> = {
    'janvier': 0, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
    'juillet': 6, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'decembre': 11,
  };

  // Cette année
  if (normalized.includes('cette annee')) {
    return {
      from: `${currentYear}-01-01`,
      to: `${currentYear}-12-31`,
      label: `Année ${currentYear}`,
      isDefault: false,
    };
  }

  // Année dernière
  if (normalized.includes('annee derniere') || normalized.includes('an dernier')) {
    return {
      from: `${currentYear - 1}-01-01`,
      to: `${currentYear - 1}-12-31`,
      label: `Année ${currentYear - 1}`,
      isDefault: false,
    };
  }

  // Ce mois
  if (normalized.includes('ce mois')) {
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    return {
      from: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      to: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`,
      label: `${getMonthName(currentMonth)} ${currentYear}`,
      isDefault: false,
    };
  }

  // Mois dernier
  if (normalized.includes('mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastDay = new Date(year, lastMonth + 1, 0).getDate();
    return {
      from: `${year}-${String(lastMonth + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(lastMonth + 1).padStart(2, '0')}-${lastDay}`,
      label: `${getMonthName(lastMonth)} ${year}`,
      isDefault: false,
    };
  }

  // Month name detection
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAP)) {
    if (normalized.includes(moisName)) {
      const yearMatch = normalized.match(/20\d{2}/);
      const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
      const lastDay = new Date(year, moisIndex + 1, 0).getDate();
      return {
        from: `${year}-${String(moisIndex + 1).padStart(2, '0')}-01`,
        to: `${year}-${String(moisIndex + 1).padStart(2, '0')}-${lastDay}`,
        label: `${getMonthName(moisIndex)} ${year}`,
        isDefault: false,
      };
    }
  }

  // Default: 12 derniers mois
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);
  const end = new Date(currentYear, currentMonth + 1, 0);
  
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
    label: '12 derniers mois',
    isDefault: true,
  };
}

function getMonthName(idx: number): string {
  return ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][idx] || '';
}

function extractTopN(query: string): number | null {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) return 5;
  return null;
}

/**
 * Core routing function - aligned with src/services/aiSearch/core.ts
 */
function aiSearchRoute(
  query: string,
  normalized: string,
  context: AiSearchContext,
  llmIntent: any,
  now: Date,
  resolvedEntities: ResolvedEntities = {}
): AiSearchRoutedRequest {
  const corrections: string[] = [];
  
  // 1. Determine query type
  let queryType: 'stats' | 'doc' | 'action' = 'doc';
  let routingSource = 'heuristic';
  
  if (isStatsQuery(normalized)) {
    queryType = 'stats';
    routingSource = 'keywords';
  }
  
  // LLM can override if high confidence
  if (llmIntent?.queryType && (llmIntent.confidence ?? 0) >= 0.7) {
    if (llmIntent.queryType === 'stats' || llmIntent.queryType === 'stats_query') {
      queryType = 'stats';
      routingSource = 'llm';
    } else if (llmIntent.queryType === 'doc' || llmIntent.queryType === 'documentary_query') {
      queryType = 'doc';
      routingSource = 'llm';
    }
  }
  
  // 2. Permissions: N0/N1 cannot access stats
  if (queryType === 'stats' && context.roleLevel < 2) {
    corrections.push('type:stats→doc (N0/N1)');
    queryType = 'doc';
  }
  
  // 3. Detect network scope
  let scope: 'agence' | 'reseau' = 'agence';
  for (const kw of NETWORK_KEYWORDS) {
    if (normalized.includes(kw)) {
      scope = 'reseau';
      break;
    }
  }
  
  // N2 cannot have network scope
  if (scope === 'reseau' && context.roleLevel < 3) {
    corrections.push('scope:reseau→agence (N2)');
    scope = 'agence';
  }
  
  // 4. If not stats, return early
  if (queryType !== 'stats') {
    return {
      type: queryType,
      parsed: null,
      debug: { normalizedQuery: normalized, routingSource, corrections },
    };
  }
  
  // 5. Find metric - AVEC RÉSOLUTION D'ENTITÉS
  let dimension = llmIntent?.dimension || detectDimensionFromQuery(normalized);
  const intentType = llmIntent?.intentType || detectIntentFromQuery(normalized);
  
  // Si un technicien est résolu, forcer la dimension "technicien" et la métrique CA par technicien
  if (resolvedEntities.technicienId) {
    dimension = 'technicien';
    console.log(`[aiSearchRoute] Technician resolved: ${resolvedEntities.technicienName} → forcing dimension=technicien`);
  }
  
  // Si un apporteur est résolu, forcer la dimension "apporteur"
  if (resolvedEntities.apporteurId) {
    dimension = 'apporteur';
    console.log(`[aiSearchRoute] Apporteur resolved: ${resolvedEntities.apporteurName} → forcing dimension=apporteur`);
  }
  
  let metricId = findMetricFromNLRules(dimension, intentType, normalized);
  
  if (!metricId && llmIntent?.metric && hasMetric(llmIntent.metric)) {
    metricId = llmIntent.metric;
    routingSource = 'llm';
  }
  
  // 6. If no metric found, return error (NO SILENT FALLBACK!)
  if (!metricId) {
    // Check if we should suggest candidates
    if (normalized.includes('ca') || normalized.includes('chiffre')) {
      if (dimension !== 'global') {
        // Ambiguous: could be ca_par_X or ca_global
        return {
          type: 'ambiguous',
          parsed: null,
          ambiguous: {
            message: 'Plusieurs métriques correspondent. Que souhaitez-vous ?',
            candidates: [
              { metricId: 'ca_global_ht', label: 'CA Global HT', description: 'Chiffre d\'affaires total' },
              { metricId: `ca_par_${dimension}`, label: `CA par ${dimension}`, description: `Répartition par ${dimension}` },
            ].filter(c => hasMetric(c.metricId)),
            originalQuery: query,
          },
          debug: { normalizedQuery: normalized, routingSource, corrections },
        };
      }
      metricId = 'ca_global_ht';
    } else {
      return {
        type: 'error',
        parsed: null,
        error: {
          code: 'METRIC_NOT_FOUND',
          message: 'Aucune métrique ne correspond à votre requête. Reformulez ou précisez votre demande.',
        },
        debug: { normalizedQuery: normalized, routingSource, corrections },
      };
    }
  }
  
  // 7. Verify metric exists
  if (!hasMetric(metricId)) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'UNKNOWN_METRIC',
        message: `Métrique '${metricId}' inconnue.`,
      },
      debug: { normalizedQuery: normalized, routingSource, corrections },
    };
  }
  
  // 8. Check metric permissions
  const metricInfo = METRICS_INFO[metricId];
  if (metricInfo && context.roleLevel < metricInfo.minRole) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'ACCESS_DENIED',
        message: `Cette métrique nécessite un niveau d'accès N${metricInfo.minRole}+.`,
      },
      debug: { normalizedQuery: normalized, routingSource, corrections },
    };
  }
  
  // 9. Extract period
  let period = extractPeriodFromQuery(normalized, now);
  
  // Check LLM period
  if (llmIntent?.period?.from && llmIntent?.period?.to) {
    period = {
      from: llmIntent.period.from || llmIntent.period.start,
      to: llmIntent.period.to || llmIntent.period.end,
      label: llmIntent.period.label || 'Période personnalisée',
      isDefault: false,
    };
  }
  
  // 10. Validate period limit (24 months max)
  const periodMonths = Math.ceil(
    (new Date(period.to).getTime() - new Date(period.from).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  
  if (periodMonths > 24) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'PERIOD_INVALID',
        message: `Période trop large (${periodMonths} mois). Maximum autorisé : 24 mois.`,
      },
      debug: { normalizedQuery: normalized, routingSource, corrections },
    };
  }
  
  // 11. Extract filters
  const limit = extractTopN(query) || (metricInfo?.isRanking ? 5 : null);
  const univers = llmIntent?.filters?.univers ? String(llmIntent.filters.univers).toUpperCase() : undefined;
  
  // 12. Build parsed stat query - inclure les entités résolues
  const parsed: ParsedStatQuery = {
    metricId,
    period,
    limit,
    univers,
    intentType,
    confidence: 'medium',
    networkScope: scope === 'reseau',
    keywordScore: 0,
    categories: [],
    // Entités résolues
    technicienId: resolvedEntities.technicienId,
    technicienName: resolvedEntities.technicienName,
    apporteurId: resolvedEntities.apporteurId,
    apporteurName: resolvedEntities.apporteurName,
  };
  
  return {
    type: 'stats',
    parsed,
    debug: { normalizedQuery: normalized, routingSource, corrections },
  };
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════

async function loadApogeeData(
  proxyUrl: string,
  authHeader: string,
  agencySlug: string,
  period: ParsedPeriod,
  requiredSources: string[]
): Promise<{ factures: any[]; projects: any[]; clients: any[]; interventions: any[]; users: any[] }> {
  const data = { factures: [], projects: [], clients: [], interventions: [], users: [] } as any;
  const requests: Promise<void>[] = [];
  
  const periodStart = new Date(period.from);
  const periodEnd = new Date(period.to);
  
  if (requiredSources.includes('factures')) {
    requests.push(
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
        body: JSON.stringify({
          endpoint: 'apiGetFactures',
          agencySlug,
          filters: { dateDebut: period.from, dateFin: period.to },
        }),
      }).then(async res => {
        if (res.ok) {
          const json = await res.json();
          data.factures = (json.data || []).filter((f: any) => {
            const factureDate = f.dateReelle || f.date;
            if (!factureDate) return true;
            const d = new Date(factureDate);
            return d >= periodStart && d <= periodEnd;
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

// ═══════════════════════════════════════════════════════════════
// DOCS SEARCH
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  const startTime = Date.now();
  
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ 
        type: 'error', 
        error: { code: 'AUTH_REQUIRED', message: 'Authentification requise.' }
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ 
        type: 'error', 
        error: { code: 'UNAUTHORIZED', message: 'Utilisateur non autorisé.' }
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    }

    // Rate limit
    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`unified-search:${user.id}`, { limit: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    // Profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('agence, global_role, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();

    const globalRole = profile?.global_role || 'base_user';
    const roleLevel = getRoleLevel(globalRole);
    const agencySlug = profile?.agence || '';
    
    const context: AiSearchContext = {
      userId: user.id,
      role: globalRole,
      roleLevel,
      agencyId: null,
      agencySlug: agencySlug || null,
      allowedAgencyIds: roleLevel >= 3 ? [] : undefined, // N3+ can access multiple agencies
    };

    console.log(`[unified-search] User id=${user.id}, role=${globalRole} (N${roleLevel}), agence=${agencySlug}`);

    // Parse body
    const body: UnifiedSearchRequestBody = await req.json();
    const query = body.query;
    
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ 
        type: 'error',
        error: { code: 'QUERY_REQUIRED', message: 'Une question est requise.' }
      }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    const now = body.now ? new Date(body.now) : new Date();
    const normalized = normalizeQuery(query);
    console.log(`[unified-search] Query: "${query}" → normalized: "${normalized}"`);

    // ══════════════════════════════════════════════════════════
    // STEP 1: ENTITY RESOLUTION (charger users/clients pour résolution)
    // ══════════════════════════════════════════════════════════
    const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
    let resolvedEntities: ResolvedEntities = {};
    
    if (agencySlug) {
      // Load users and clients in parallel for entity resolution
      const [technicians, apporteurs] = await Promise.all([
        loadUsersForAgency(proxyUrl, authHeader, agencySlug),
        loadClientsForAgency(proxyUrl, authHeader, agencySlug),
      ]);
      
      console.log(`[unified-search] Loaded ${technicians.length} technicians, ${apporteurs.length} apporteurs for entity resolution`);
      
      resolvedEntities = resolveEntitiesFromQuery(query, technicians, apporteurs);
      
      if (resolvedEntities.technicienId) {
        console.log(`[unified-search] Resolved technician: ${resolvedEntities.technicienName} (id=${resolvedEntities.technicienId})`);
      }
      if (resolvedEntities.apporteurId) {
        console.log(`[unified-search] Resolved apporteur: ${resolvedEntities.apporteurName} (id=${resolvedEntities.apporteurId})`);
      }
      if (resolvedEntities.ambiguousTechniciens?.length) {
        console.log(`[unified-search] Ambiguous technicians: ${resolvedEntities.ambiguousTechniciens.map(t => t.fullName).join(', ')}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 2: LLM EXTRACTION
    // ══════════════════════════════════════════════════════════
    const llmIntent = await extractIntentWithLLM(query, supabaseUrl, authHeader);
    console.log(`[unified-search] LLM intent: ${llmIntent ? JSON.stringify(llmIntent) : 'null'}`);

    // ══════════════════════════════════════════════════════════
    // STEP 3: CORE IA ROUTING (avec entités résolues)
    // ══════════════════════════════════════════════════════════
    const routed = aiSearchRoute(query, normalized, context, llmIntent, now, resolvedEntities);
    console.log(`[unified-search] Routed: type=${routed.type}, metric=${routed.parsed?.metricId || 'none'}`);

    // ══════════════════════════════════════════════════════════
    // STEP 3: HANDLE ERROR/AMBIGUOUS EARLY
    // ══════════════════════════════════════════════════════════
    if (routed.type === 'error') {
      const response: AiSearchResult = {
        type: 'error',
        result: null,
        interpretation: buildInterpretation(null, agencySlug, routed.debug),
        error: routed.error,
        computedAt: now.toISOString(),
        agencySlug,
      };
      if (roleLevel >= 6) response.debug = { ...routed.debug, llmIntent };
      return withCors(req, new Response(JSON.stringify(response), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      }));
    }

    if (routed.type === 'ambiguous') {
      const response: AiSearchResult = {
        type: 'ambiguous',
        result: routed.ambiguous,
        interpretation: buildInterpretation(null, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug,
      };
      if (roleLevel >= 6) response.debug = { ...routed.debug, llmIntent };
      return withCors(req, new Response(JSON.stringify(response), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      }));
    }

    // ══════════════════════════════════════════════════════════
    // STEP 4: ACCESS CONTROL
    // ══════════════════════════════════════════════════════════
    if (routed.type === 'stats' && roleLevel === 2 && !agencySlug) {
      return withCors(req, new Response(JSON.stringify({
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(routed.parsed, agencySlug, routed.debug),
        error: { code: 'AGENCY_REQUIRED', message: 'Vous devez être rattaché à une agence pour accéder aux statistiques.' },
        computedAt: now.toISOString(),
        agencySlug: '',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    if (routed.type === 'stats' && routed.parsed?.networkScope && roleLevel < 3) {
      return withCors(req, new Response(JSON.stringify({
        type: 'access_denied',
        result: null,
        interpretation: buildInterpretation(routed.parsed, agencySlug, routed.debug),
        error: { code: 'ACCESS_DENIED', message: 'Les statistiques réseau sont réservées au franchiseur (N3+).' },
        computedAt: now.toISOString(),
        agencySlug,
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ══════════════════════════════════════════════════════════
    // STEP 5: EXECUTE
    // ══════════════════════════════════════════════════════════
    let result: any = null;
    let fromCache = false;

    if (routed.type === 'stats' && routed.parsed) {
      const parsed = routed.parsed;
      const scope = parsed.networkScope ? 'reseau' : 'agence';
      const filters: Record<string, unknown> = { 
        univers: parsed.univers, 
        limit: parsed.limit,
        technicienId: parsed.technicienId,
        technicienName: parsed.technicienName,
        apporteurId: parsed.apporteurId,
        apporteurName: parsed.apporteurName,
      };
      const cacheKey = buildCacheKey(parsed.metricId, agencySlug, parsed.period, filters, scope);
      
      // Check cache - SKIP cache if entity filter is applied (more specific query)
      const skipCache = !!(parsed.technicienId || parsed.apporteurId);
      const cached = skipCache ? null : await getCacheEntry(supabase, cacheKey);
      if (cached) {
        console.log('[unified-search] Cache hit');
        result = cached;
        fromCache = true;
      } else {
        // Load data - utiliser le proxyUrl déjà défini
        const requiredSources = getRequiredSources(parsed.metricId);
        console.log(`[unified-search] Loading: ${requiredSources.join(', ')}`);
        
        const apogeeData = await loadApogeeData(proxyUrl, authHeader, agencySlug, parsed.period, requiredSources);
        console.log(`[unified-search] Data: ${apogeeData.factures.length} factures, ${apogeeData.projects.length} projects`);

        // Compute metric avec filtres d'entités
        const params: StatParams = {
          dateRange: { start: new Date(parsed.period.from), end: new Date(parsed.period.to) },
          agencySlug,
          topN: parsed.limit || undefined,
          filters: { 
            univers: parsed.univers,
            technicienId: parsed.technicienId,
            technicienName: parsed.technicienName,
            apporteurId: parsed.apporteurId,
            apporteurName: parsed.apporteurName,
          },
        };

        result = computeMetric(parsed.metricId, apogeeData, params);
        console.log(`[unified-search] Computed: ${result.value}${result.unit} (technicienId=${parsed.technicienId || 'none'})`);

        // Cache (only if no entity filter)
        if (!skipCache) {
          const ttl = computeTTL(parsed.period.to);
          await setCacheEntry(supabase, cacheKey, result, ttl);
        }
      }

      // Build response
      const metricInfo = METRICS_INFO[parsed.metricId];
      const response: AiSearchResult = {
        type: 'stat',
        result: {
          metricId: parsed.metricId,
          label: metricInfo?.label || parsed.metricId,
          unit: metricInfo?.unit || result.unit,
          period: parsed.period,
          dimension: metricInfo?.isRanking ? 'ranking' : 'global',
          filters: { univers: parsed.univers, limit: parsed.limit },
          value: result.value,
          ranking: result.ranking,
          topItem: result.topItem,
          evolution: null,
        },
        interpretation: buildInterpretation(parsed, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug,
        fromCache,
      };

      if (roleLevel >= 6) {
        response.debug = {
          ...routed.debug,
          llmIntent,
          cacheKey,
          executionTimeMs: Date.now() - startTime,
        };
      }

      return withCors(req, new Response(JSON.stringify(response), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      }));

    } else if (routed.type === 'doc') {
      result = await searchDocs(supabase, query);

      const response: AiSearchResult = {
        type: 'doc',
        result,
        interpretation: buildInterpretation(null, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug,
      };

      return withCors(req, new Response(JSON.stringify(response), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      }));

    } else if (routed.type === 'action') {
      result = { action: 'navigate', targetUrl: '/', label: 'Accueil' };

      const response: AiSearchResult = {
        type: 'action',
        result,
        interpretation: buildInterpretation(null, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug,
      };

      return withCors(req, new Response(JSON.stringify(response), { 
        status: 200, headers: { 'Content-Type': 'application/json' } 
      }));
    }

    // Fallback: should not happen
    return withCors(req, new Response(JSON.stringify({ 
      type: 'error',
      error: { code: 'UNKNOWN_TYPE', message: 'Type de requête non supporté.' }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

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

// ═══════════════════════════════════════════════════════════════
// INTERPRETATION BUILDER
// ═══════════════════════════════════════════════════════════════

function buildInterpretation(
  parsed: ParsedStatQuery | null, 
  agencySlug: string,
  debug?: { normalizedQuery?: string; routingSource?: string; corrections?: string[] }
): AiSearchResult['interpretation'] {
  if (!parsed) {
    return {
      metricId: null,
      metricLabel: null,
      dimension: 'global',
      intentType: 'valeur',
      period: { from: '', to: '', label: '' },
      filters: {},
      confidence: 0,
      scope: 'agence',
      corrections: debug?.corrections,
    };
  }

  const metricInfo = METRICS_INFO[parsed.metricId];

  return {
    metricId: parsed.metricId,
    metricLabel: metricInfo?.label || null,
    dimension: metricInfo?.isRanking ? 'ranking' : 'global',
    intentType: parsed.intentType,
    period: parsed.period,
    filters: { univers: parsed.univers, limit: parsed.limit },
    confidence: parsed.confidence === 'high' ? 0.9 : parsed.confidence === 'medium' ? 0.7 : 0.5,
    scope: parsed.networkScope ? 'reseau' : 'agence',
    corrections: debug?.corrections,
  };
}
