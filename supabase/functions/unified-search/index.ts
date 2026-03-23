/**
 * Edge Function: unified-search
 * 
 * ORCHESTRATEUR V4 - Pipeline NLP Structuré
 * 
 * Pipeline:
 * 1. Tokenisation
 * 2. Chargement entités dynamiques (apporteurs/techniciens depuis Apogée)
 * 3. Parsing NL V4 complet (statiaIntentV4) → subject/operation/dimension/filters
 * 4. Résolution métrique par scoring (subject + operation + dimension)
 * 5. Exécution StatIA
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { computeMetric, getRequiredSources, hasMetric, type StatParams, type StatResult } from './statiaService.ts';
import { tokenizeQuery, type TokenizedQuery } from './nlTokenizer.ts';
import { extractIntentFromTokens, type ExtractedIntent } from './nlIntentExtractor.ts';
import { extractPeriodFromTokens, type ParsedPeriod } from './nlPeriodExtractor.ts';
import { selectBestMetric, hasMetricSignature, getMetricSignature, type MetricScore, type MetricSignature } from './nlMetricScorer.ts';
import { buildEntityDictionary, findEntitiesInQuery, normalizeForMatching, type EntityDictionary, type ResolvedEntityFilters } from './nlEntityResolver.ts';
import { parseNLQuery, resolveMetricFromParsed, type ParsedNLQuery } from './nlQueryParser.ts';
import { 
  parseStatiaQuery, 
  selectMetricV4, 
  normalize as normalizeV4,
  type ParsedQuery as ParsedQueryV4,
  type EntityDictionaries,
  type NlContext
} from './statiaIntentV4.ts';
import { generateChatResponse, type ChatMessage, type ChatContext } from './chatService.ts';
// ═══════════════════════════════════════════════════════════════
// NEW: Simple Templates + Source Validation + Post-Processing
// ═══════════════════════════════════════════════════════════════
import { matchSimpleTemplate, getTemplateRequiredSources, type TemplateMatchResult } from './simpleTemplates.ts';
import { getEnforcedSources, validateSources, logSourcesDebug, buildUserFriendlyError } from './sourceValidator.ts';
import { applyPostProcessing, inferPostProcessingType, getEntityTypeForMetric, type PostProcessedResult } from './statiaPostProcessing.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UnifiedSearchRequestBody {
  query: string;
  now?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  forceStats?: boolean;
}

interface AiSearchContext {
  userId: string;
  role: string;
  roleLevel: number;
  agencyId: string | null;
  agencySlug: string | null;
  allowedAgencyIds?: string[];
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
    tokens: string[];
    bigrams: string[];
    extracted: ExtractedIntent;
    metricScores: Array<{ id: string; score: number; reasons: string[] }>;
    selectedMetric: string | null;
    period: ParsedPeriod;
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
  'nb_sav': { label: 'Nombre de SAV', unit: '', isRanking: false, minRole: 2 },
  'nb_devis': { label: 'Nombre de devis', unit: '', isRanking: false, minRole: 2 },
  'nb_interventions': { label: "Nombre d'interventions", unit: '', isRanking: false, minRole: 2 },
  'delai_facturation': { label: 'Délai facturation', unit: 'jours', isRanking: false, minRole: 2 },
};

const NETWORK_KEYWORDS = ['reseau', 'franchiseur', 'toutes les agences', 'multi-agences', 'agences'];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getRoleLevel(globalRole: string | null | undefined): number {
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY RESOLUTION
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
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const bigrams = (s: string): string[] => { const out: string[] = []; for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2)); return out; };
  const b1 = bigrams(s1), b2 = bigrams(s2);
  if (!b1.length || !b2.length) return 0;
  const set = new Set(b1);
  let common = 0;
  for (const g of b2) if (set.has(g)) common++;
  return (2 * common) / (b1.length + b2.length);
}

function resolveTechnicianFromQuery(query: string, technicians: TechnicianEntity[]): { best?: TechnicianEntity; candidates: TechnicianEntity[] } {
  const qNorm = normalizeText(query);
  if (!qNorm || !technicians.length) return { candidates: [] };
  // Mots de la query >= 3 lettres, en excluant les mots-clés courants
  const EXCLUDED_WORDS = new Set(['combien', 'fait', 'avec', 'sur', 'pour', 'quel', 'quelle', 'octobre', 'novembre', 'decembre', 'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'cette', 'annee', 'mois', 'dernier', 'derniere', 'chiffre', 'affaires', 'facture', 'factures']);
  const queryWords = qNorm.split(' ').filter(w => w.length >= 3 && !EXCLUDED_WORDS.has(w));
  
  console.log(`[resolveTechnicianFromQuery] Query words: [${queryWords.join(', ')}]`);
  
  const scored: { tech: TechnicianEntity; score: number; matchedWord: string }[] = [];
  for (const tech of technicians) {
    const labels: string[] = [];
    const normFirstName = normalizeText(tech.firstName || '');
    const normLastName = normalizeText(tech.lastName || '');
    const normFullName = normalizeText(tech.fullName || '');
    if (normFullName) labels.push(normFullName);
    if (normFirstName && normLastName) { labels.push(`${normFirstName} ${normLastName}`); labels.push(`${normLastName} ${normFirstName}`); }
    if (normFirstName) labels.push(normFirstName);
    if (normLastName) labels.push(normLastName);
    
    let maxScore = 0;
    let matchedWord = '';
    
    // Match par mot individuel de la query
    for (const word of queryWords) {
      for (const label of labels) {
        // Match exact → score parfait
        if (word === label) { 
          maxScore = Math.max(maxScore, 1); 
          matchedWord = word;
          continue; 
        }
        // Match inclusion (le mot de la query est dans le label ou vice versa)
        if (label.includes(word) && word.length >= 4) {
          const newScore = 0.95;
          if (newScore > maxScore) { maxScore = newScore; matchedWord = word; }
        }
        if (word.includes(label) && label.length >= 4) {
          const newScore = 0.9;
          if (newScore > maxScore) { maxScore = newScore; matchedWord = word; }
        }
        // Similarité bigram (moins fiable)
        const sim = stringSimilarity(word, label);
        if (sim > maxScore && sim >= 0.8) { 
          maxScore = sim; 
          matchedWord = word;
        }
      }
    }
    
    // SUPPRIMÉ: plus de match sur la query entière (causait les faux positifs)
    
    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      scored.push({ tech, score: maxScore, matchedWord });
    }
  }
  
  if (!scored.length) {
    console.log(`[resolveTechnicianFromQuery] No match found`);
    return { candidates: [] };
  }
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  console.log(`[resolveTechnicianFromQuery] Best match: ${best.tech.fullName} (score=${best.score.toFixed(2)}, matchedWord=${best.matchedWord})`);
  
  if (best.score >= MIN_SIMILARITY_STRICT) {
    const strongCandidates = scored.filter(s => s.score >= MIN_SIMILARITY_STRICT);
    if (strongCandidates.length === 1) return { best: best.tech, candidates: [] };
  }
  return { best: undefined, candidates: scored.slice(0, 5).map(s => s.tech) };
}

function resolveApporteurFromQuery(query: string, apporteurs: ApporteurEntity[]): { best?: ApporteurEntity; candidates: ApporteurEntity[] } {
  const qNorm = normalizeText(query);
  if (!qNorm || !apporteurs.length) return { candidates: [] };
  
  // Mots de la query >= 3 lettres, en excluant les mots-clés courants (même logique que techniciens)
  const EXCLUDED_WORDS = new Set(['combien', 'fait', 'avec', 'sur', 'pour', 'quel', 'quelle', 'octobre', 'novembre', 'decembre', 'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'cette', 'annee', 'mois', 'dernier', 'derniere', 'chiffre', 'affaires', 'facture', 'factures', 'apporteur', 'client', 'partenaire']);
  const queryWords = qNorm.split(' ').filter(w => w.length >= 3 && !EXCLUDED_WORDS.has(w));
  
  console.log(`[resolveApporteurFromQuery] Query words: [${queryWords.join(', ')}]`);
  
  const scored: { ap: ApporteurEntity; score: number; matchedWord: string }[] = [];
  
  for (const ap of apporteurs) {
    const labels: string[] = [];
    const normName = normalizeText(ap.name || '');
    const normCompany = normalizeText(ap.company || '');
    if (normName) labels.push(normName);
    if (normCompany) labels.push(normCompany);
    
    let maxScore = 0;
    let matchedWord = '';
    
    // Match par mot individuel de la query
    for (const word of queryWords) {
      for (const label of labels) {
        // Match exact → score parfait
        if (word === label) { 
          maxScore = Math.max(maxScore, 1); 
          matchedWord = word;
          continue; 
        }
        // Match inclusion (le mot de la query est dans le label ou vice versa)
        if (label.includes(word) && word.length >= 4) {
          const newScore = 0.95;
          if (newScore > maxScore) { maxScore = newScore; matchedWord = word; }
        }
        if (word.includes(label) && label.length >= 4) {
          const newScore = 0.9;
          if (newScore > maxScore) { maxScore = newScore; matchedWord = word; }
        }
        // Similarité bigram (moins fiable)
        const sim = stringSimilarity(word, label);
        if (sim > maxScore && sim >= 0.8) { 
          maxScore = sim; 
          matchedWord = word;
        }
      }
    }
    
    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      scored.push({ ap, score: maxScore, matchedWord });
    }
  }
  
  if (!scored.length) {
    console.log(`[resolveApporteurFromQuery] No match found`);
    return { candidates: [] };
  }
  
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  console.log(`[resolveApporteurFromQuery] Best match: ${best.ap.name || best.ap.company} (score=${best.score.toFixed(2)}, matchedWord=${best.matchedWord})`);
  
  if (best.score >= MIN_SIMILARITY_STRICT) {
    const strongCandidates = scored.filter(s => s.score >= MIN_SIMILARITY_STRICT);
    if (strongCandidates.length === 1) return { best: best.ap, candidates: [] };
  }
  return { best: undefined, candidates: scored.slice(0, 5).map(s => s.ap) };
}

function resolveEntitiesFromQuery(query: string, technicians: TechnicianEntity[], apporteurs: ApporteurEntity[] = []): ResolvedEntities {
  const resolved: ResolvedEntities = {};
  const techRes = resolveTechnicianFromQuery(query, technicians);
  if (techRes.best) {
    resolved.technicienId = techRes.best.id;
    resolved.technicienName = techRes.best.fullName || [techRes.best.firstName, techRes.best.lastName].filter(Boolean).join(' ') || String(techRes.best.id);
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
    const res = await fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetUsers', agencySlug }) });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map((u: any) => ({ id: u.id, firstName: (u.firstname || u.prenom || '').trim(), lastName: (u.name || u.lastname || u.nom || '').trim(), fullName: [(u.firstname || u.prenom || '').trim(), (u.name || u.lastname || u.nom || '').trim()].filter(Boolean).join(' ') }));
  } catch { return []; }
}

async function loadClientsForAgency(proxyUrl: string, authHeader: string, agencySlug: string): Promise<ApporteurEntity[]> {
  try {
    // ═══════════════════════════════════════════════════════════════
    // STRATÉGIE: Identifier les vrais apporteurs via commanditaireId des projets
    // L'API apiGetClients n'a pas de champ "type", donc on doit croiser avec les projets
    // ═══════════════════════════════════════════════════════════════
    
    // 1. Charger les projets pour extraire les commanditaireId uniques
    const projectsRes = await fetch(proxyUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, 
      body: JSON.stringify({ endpoint: 'apiGetProjects', agencySlug }) 
    });
    
    const commanditaireIds = new Set<number>();
    if (projectsRes.ok) {
      const projectsJson = await projectsRes.json();
      const projects = projectsJson.data || [];
      for (const p of projects) {
        const cmdId = p.data?.commanditaireId;
        if (cmdId && typeof cmdId === 'number' && cmdId > 0) {
          commanditaireIds.add(cmdId);
        }
      }
    }
    
    console.log(`[loadClientsForAgency] Found ${commanditaireIds.size} unique commanditaireIds from projects`);
    
    // 2. Charger tous les clients
    const res = await fetch(proxyUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, 
      body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }) 
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rawClients = json.data || [];
    
    // 3. Filtrer: ne garder que les clients qui sont des commanditaires (apporteurs)
    const apporteursOnly = rawClients.filter((c: any) => commanditaireIds.has(c.id));
    
    console.log(`[loadClientsForAgency] Total clients: ${rawClients.length}, Apporteurs (commanditaires): ${apporteursOnly.length}`);
    
    // Log sample pour debug
    if (apporteursOnly.length > 0) {
      const sample = apporteursOnly.slice(0, 10);
      console.log(`[loadClientsForAgency] Sample apporteurs:`, sample.map((c: any) => ({ 
        id: c.id, 
        nom: c.nom,
      })));
    }
    
    // Mapping pour les apporteurs
    return apporteursOnly.map((c: any) => {
      const name = c.nom || c.name || c.raisonSociale || c.displayName || c.societe || c.company || c.label || '';
      return { id: c.id, name, company: c.company || c.societe || '' };
    });
  } catch (e) { 
    console.error(`[loadClientsForAgency] Error:`, e);
    return []; 
  }
}

// ═══════════════════════════════════════════════════════════════
// QUERY TYPE DETECTION (HYBRID SUPPORT)
// ═══════════════════════════════════════════════════════════════

type SearchMode = 'stats' | 'doc' | 'hybrid';

const DOC_KEYWORDS = [
  'comment', 'pourquoi', 'procedure', 'procédure', 'etapes', 'étapes',
  'tutoriel', 'guide', 'aide', 'explication', 'mode d emploi', "mode d'emploi",
  'qu est ce', "qu'est-ce", 'definition', 'définition', 'signifie'
];

function isStatsQuery(extracted: ExtractedIntent): boolean {
  // Une requête est stats si elle a un topic identifié
  if (extracted.topic) return true;
  // Ou si elle a une dimension non-globale
  if (extracted.dimension !== 'global') return true;
  // Ou si elle a un intent spécifique (pas juste 'valeur')
  if (extracted.intent !== 'valeur') return true;
  return false;
}

function detectSearchMode(tokenized: TokenizedQuery, extracted: ExtractedIntent): SearchMode {
  const hasDocIntent = DOC_KEYWORDS.some(k => tokenized.normalized.includes(k));
  const hasStatsIntent = isStatsQuery(extracted);
  
  if (hasDocIntent && hasStatsIntent) return 'hybrid';
  if (hasStatsIntent) return 'stats';
  if (hasDocIntent) return 'doc';
  
  // Default: hybrid pour les cas ambigus
  return 'hybrid';
}

// ═══════════════════════════════════════════════════════════════
// TOP N EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractTopN(query: string): number | null {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) return 5;
  return null;
}

// ═══════════════════════════════════════════════════════════════
// UNIVERS EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractUnivers(tokenized: TokenizedQuery): string | undefined {
  const UNIVERS_MAP: Record<string, string> = {
    'plomberie': 'PLOMBERIE',
    'vitrerie': 'VITRERIE',
    'serrurerie': 'SERRURERIE',
    'electricite': 'ELECTRICITE',
    'menuiserie': 'MENUISERIE',
    'peinture': 'PEINTURE',
    'maconnerie': 'MACONNERIE',
    'couverture': 'COUVERTURE',
    'carrelage': 'CARRELAGE',
  };
  for (const token of tokenized.tokens) {
    if (UNIVERS_MAP[token]) return UNIVERS_MAP[token];
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════
// NETWORK SCOPE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectNetworkScope(tokenized: TokenizedQuery): boolean {
  for (const kw of NETWORK_KEYWORDS) {
    if (tokenized.normalized.includes(kw)) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
// CORE V3 ROUTING
// ═══════════════════════════════════════════════════════════════

function aiSearchRouteV3(
  query: string,
  tokenized: TokenizedQuery,
  extracted: ExtractedIntent,
  period: ParsedPeriod,
  context: AiSearchContext,
  resolvedEntities: ResolvedEntities,
  metricResult: { metric: MetricSignature | null; scores: MetricScore[] },
  now: Date
): AiSearchRoutedRequest {
  const corrections: string[] = [];
  const routingSource = 'nlv3';
  
  // 1. Determine query type - PRIORITIZE DOC for "comment/pourquoi/procedure" questions
  const hasDocIntent = DOC_KEYWORDS.some(k => tokenized.normalized.includes(k));
  const hasStatsIntent = isStatsQuery(extracted);
  
  // If query has explicit doc keywords like "comment", force doc mode
  let queryType: 'stats' | 'doc';
  if (hasDocIntent) {
    queryType = 'doc';
    if (hasStatsIntent) {
      corrections.push('type:stats→doc (doc_keyword_priority)');
    }
  } else {
    queryType = hasStatsIntent ? 'stats' : 'doc';
  }
  
  // 2. Permissions: N0/N1 cannot access stats
  if (queryType === 'stats' && context.roleLevel < 2) {
    corrections.push('type:stats→doc (N0/N1)');
    queryType = 'doc';
  }
  
  // 3. If not stats, return early
  if (queryType !== 'stats') {
    return {
      type: queryType,
      parsed: null,
      debug: {
        normalizedQuery: tokenized.normalized,
        tokens: tokenized.tokens,
        bigrams: tokenized.bigrams,
        extracted,
        metricScores: metricResult.scores.slice(0, 5).map(s => ({ id: s.metric.id, score: s.score, reasons: s.reasons })),
        selectedMetric: null,
        period,
        routingSource,
        corrections,
      },
    };
  }
  
  // 4. If no metric found with sufficient score → METRIC_NOT_FOUND
  if (!metricResult.metric) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'METRIC_NOT_FOUND',
        message: `Je n'ai pas pu identifier précisément votre demande.\n\nReformulez en précisant :\n• Le sujet (CA, SAV, dossiers, devis...)\n• La période (ce mois, en avril, cette année...)\n• Le niveau de détail (global, par technicien, par univers...)\n\nExemples : "CA ce mois", "Top techniciens en juin", "Taux SAV cette année"`,
      },
      debug: {
        normalizedQuery: tokenized.normalized,
        tokens: tokenized.tokens,
        bigrams: tokenized.bigrams,
        extracted,
        metricScores: metricResult.scores.slice(0, 5).map(s => ({ id: s.metric.id, score: s.score, reasons: s.reasons })),
        selectedMetric: null,
        period,
        routingSource,
        corrections,
      },
    };
  }
  
  const metricId = metricResult.metric.id;
  
  // 5. Adjust dimension based on resolved entities
  let dimension = extracted.dimension;
  if (resolvedEntities.technicienId) {
    dimension = 'technicien';
    console.log(`[aiSearchRouteV3] Technician resolved → dimension=technicien`);
  }
  if (resolvedEntities.apporteurId) {
    dimension = 'apporteur';
    console.log(`[aiSearchRouteV3] Apporteur resolved → dimension=apporteur`);
  }
  
  // 6. Check metric permissions
  const metricInfo = METRICS_INFO[metricId];
  if (metricInfo && context.roleLevel < metricInfo.minRole) {
    return {
      type: 'error',
      parsed: null,
      error: {
        code: 'ACCESS_DENIED',
        message: `Cette métrique nécessite un niveau d'accès N${metricInfo.minRole}+.`,
      },
      debug: {
        normalizedQuery: tokenized.normalized,
        tokens: tokenized.tokens,
        bigrams: tokenized.bigrams,
        extracted,
        metricScores: metricResult.scores.slice(0, 5).map(s => ({ id: s.metric.id, score: s.score, reasons: s.reasons })),
        selectedMetric: metricId,
        period,
        routingSource,
        corrections,
      },
    };
  }
  
  // 7. Network scope
  const networkScope = detectNetworkScope(tokenized);
  if (networkScope && context.roleLevel < 3) {
    corrections.push('scope:reseau→agence (N2)');
  }
  const finalNetworkScope = networkScope && context.roleLevel >= 3;
  
  // 8. Extract filters
  const limit = extractTopN(query) || (metricInfo?.isRanking ? 5 : null);
  const univers = extractUnivers(tokenized);
  
  // 9. Build parsed stat query
  const parsed: ParsedStatQuery = {
    metricId,
    period,
    limit,
    univers,
    intentType: extracted.intent,
    confidence: extracted.confidence,
    networkScope: finalNetworkScope,
    keywordScore: metricResult.scores[0]?.score || 0,
    categories: [],
    technicienId: resolvedEntities.technicienId,
    technicienName: resolvedEntities.technicienName,
    apporteurId: resolvedEntities.apporteurId,
    apporteurName: resolvedEntities.apporteurName,
  };
  
  return {
    type: 'stats',
    parsed,
    debug: {
      normalizedQuery: tokenized.normalized,
      tokens: tokenized.tokens,
      bigrams: tokenized.bigrams,
      extracted,
      metricScores: metricResult.scores.slice(0, 5).map(s => ({ id: s.metric.id, score: s.score, reasons: s.reasons })),
      selectedMetric: metricId,
      period,
      routingSource,
      corrections,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

async function getCacheEntry(supabase: any, key: string): Promise<any | null> {
  try {
    const { data } = await supabase.from('ai_search_cache').select('value, created_at, ttl_seconds').eq('key', key).maybeSingle();
    if (!data) return null;
    const created = new Date(data.created_at).getTime();
    const ttlMs = (data.ttl_seconds ?? 900) * 1000;
    if (Date.now() - created > ttlMs) { supabase.from('ai_search_cache').delete().eq('key', key); return null; }
    return data.value;
  } catch { return null; }
}

async function setCacheEntry(supabase: any, key: string, value: any, ttlSeconds: number): Promise<void> {
  try { await supabase.from('ai_search_cache').upsert([{ key, value: JSON.parse(JSON.stringify(value)), ttl_seconds: ttlSeconds }], { onConflict: 'key' }); } catch { /* ignore */ }
}

function buildCacheKey(metricId: string, agencySlug: string, period: ParsedPeriod, filters: Record<string, unknown>, scope: string): string {
  return `stat:${metricId}:${scope}:${agencySlug}:${period.from}:${period.to}:${JSON.stringify(filters)}`;
}

function computeTTL(periodTo: string): number {
  const now = new Date();
  const endDate = new Date(periodTo);
  if (endDate.getFullYear() === now.getFullYear() && endDate.getMonth() === now.getMonth()) return 300;
  return 3600;
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════

async function loadApogeeData(proxyUrl: string, authHeader: string, agencySlug: string, period: ParsedPeriod, requiredSources: string[]): Promise<{ factures: any[]; projects: any[]; clients: any[]; interventions: any[]; users: any[] }> {
  const data = { factures: [], projects: [], clients: [], interventions: [], users: [] } as any;
  const requests: Promise<void>[] = [];
  const periodStart = new Date(period.from);
  const periodEnd = new Date(period.to);
  
  if (requiredSources.includes('factures')) {
    requests.push(fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetFactures', agencySlug, filters: { dateDebut: period.from, dateFin: period.to } }) }).then(async res => { if (res.ok) { const json = await res.json(); data.factures = (json.data || []).filter((f: any) => { const factureDate = f.dateReelle || f.date; if (!factureDate) return true; const d = new Date(factureDate); return d >= periodStart && d <= periodEnd; }); } }).catch(e => console.error('[unified-search] Factures error:', e)));
  }
  if (requiredSources.includes('projects')) {
    requests.push(fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetProjects', agencySlug }) }).then(async res => { if (res.ok) data.projects = (await res.json()).data || []; }).catch(e => console.error('[unified-search] Projects error:', e)));
  }
  if (requiredSources.includes('clients')) {
    requests.push(fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetClients', agencySlug }) }).then(async res => { if (res.ok) data.clients = (await res.json()).data || []; }).catch(e => console.error('[unified-search] Clients error:', e)));
  }
  if (requiredSources.includes('interventions')) {
    // IMPORTANT: Utiliser apiGetInterventions (toutes les interventions) et non getInterventionsCreneaux (seulement créneaux)
    // Le moteur CA par technicien a besoin de TOUTES les interventions pour mapper factures → projets → interventions → techniciens
    requests.push(fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetInterventions', agencySlug }) }).then(async res => { if (res.ok) data.interventions = (await res.json()).data || []; console.log(`[loadApogeeData] Loaded ${data.interventions.length} interventions (apiGetInterventions)`); }).catch(e => console.error('[unified-search] Interventions error:', e)));
  }
  if (requiredSources.includes('users')) {
    requests.push(fetch(proxyUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }, body: JSON.stringify({ endpoint: 'apiGetUsers', agencySlug }) }).then(async res => { if (res.ok) data.users = (await res.json()).data || []; console.log(`[loadApogeeData] Loaded ${data.users.length} users`); }).catch(e => console.error('[unified-search] Users error:', e)));
  }
  
  await Promise.all(requests);
  console.log(`[loadApogeeData] Final data: ${data.factures.length} factures, ${data.projects.length} projects, ${data.interventions.length} interventions, ${data.users.length} users`);
  return data;
}

// ═══════════════════════════════════════════════════════════════
// DOCS SEARCH (HELPI INTEGRATION)
// ═══════════════════════════════════════════════════════════════

interface DocSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  blockType: string;
  sourceId: string;
  blockSlug: string | null;
  url: string;
}

async function searchDocsWithHelpi(authHeader: string, query: string, allowedBlockTypes: string[]): Promise<DocSearchResult[]> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    console.log(`[unified-search] helpi-search with blockTypes: [${allowedBlockTypes.join(', ')}]`);
    const res = await fetch(`${supabaseUrl}/functions/v1/helpi-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ query, matchThreshold: 0.35, matchCount: 8, blockTypes: allowedBlockTypes })
    });
    
    if (!res.ok) {
      console.error('[unified-search] helpi-search error:', res.status);
      return [];
    }
    
    const json = await res.json();
    const results: DocSearchResult[] = (json.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || 'Document',
      content: r.content || '',
      similarity: r.similarity || 0,
      blockType: r.block_type || 'apogee',
      sourceId: r.source_id || '',
      blockSlug: r.block_slug || null,
      url: buildDocUrl(r.block_type, r.block_slug || r.source_id)
    }));
    
    return results;
  } catch (e) {
    console.error('[unified-search] helpi-search exception:', e);
    return [];
  }
}

function buildDocUrl(blockType: string, slugOrId: string): string {
  if (!slugOrId) return '#';
  switch (blockType) {
    case 'apogee': return `/academy/apogee/category/${slugOrId}`;
    case 'helpconfort': return `/academy/hc-base/category/${slugOrId}`;
    case 'faq': return `/support/faq`;
    case 'document': return `/academy/hc-base`;
    default: return '#';
  }
}

async function searchDocsConversational(
  supabase: any, 
  query: string, 
  userName: string, 
  authHeader: string,
  allowedBlockTypes: string[],
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<{ answer: string; sources: any[]; docResults: DocSearchResult[]; isConversational: true }> {
  // Use Helpi for doc search with permission-filtered block types
  const docResults = await searchDocsWithHelpi(authHeader, query, allowedBlockTypes);
  const sources = docResults.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.sourceId,
    similarity: r.similarity,
    source: r.blockType
  }));
  
  // Build RAG context from results
  const ragContent = docResults.length > 0
    ? docResults.map(r => `### ${r.title}\n${r.content}`).join('\n\n---\n\n')
    : 'Aucune documentation trouvée.';
  
  // Build messages array with conversation history
  const messages: ChatMessage[] = [];
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }
  // Add the current query
  messages.push({ role: 'user', content: query });
  
  // Call integrated chat service (Lovable AI) directly instead of chat-guide
  console.log('[unified-search] Calling integrated chatService with Lovable AI');
  const chatResponse = await generateChatResponse({
    messages,
    ragContent,
    userName,
    context: 'apogee' as ChatContext
  });
  
  // Log to chatbot_queries for analytics
  try {
    const userQuestion = query;
    await supabase.from('chatbot_queries').insert({
      question: userQuestion,
      answer: chatResponse.answer,
      is_incomplete: chatResponse.isIncomplete,
      context_found: ragContent.substring(0, 5000),
      status: chatResponse.isIncomplete ? 'pending' : 'resolved',
      chat_context: 'apogee'
    });
  } catch (logError) {
    console.error('[unified-search] Failed to log query:', logError);
  }
  
  return { 
    answer: chatResponse.answer || "Je n'ai pas trouvé d'information précise.", 
    sources, 
    docResults, 
    isConversational: true 
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

serve(async (req) => {
  const startTime = Date.now();
  
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return withCors(req, new Response(JSON.stringify({ type: 'error', error: { code: 'AUTH_REQUIRED', message: 'Authentification requise.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return withCors(req, new Response(JSON.stringify({ type: 'error', error: { code: 'UNAUTHORIZED', message: 'Utilisateur non autorisé.' } }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`unified-search:${user.id}`, { limit: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);

    const { data: profile } = await supabase.from('profiles').select('agence, global_role, first_name, last_name').eq('id', user.id).maybeSingle();
    const globalRole = profile?.global_role || 'base_user';
    const roleLevel = getRoleLevel(globalRole);
    
    // Déterminer les types de blocs autorisés pour la recherche documentaire
    // Source de vérité : user_modules (pas enabled_modules legacy)
    // N5+ (platform_admin/superadmin) ont accès à tout inconditionnellement
    const allowedBlockTypes: string[] = ['faq']; // FAQ toujours accessible
    
    if (roleLevel >= 5) {
      // Superadmin/platform_admin : accès total
      allowedBlockTypes.push('apogee', 'helpconfort', 'document');
    } else {
      // Vérifier les modules via user_modules (source de vérité)
      const { data: userModules } = await supabase
        .from('user_modules')
        .select('module_key')
        .eq('user_id', user.id)
        // legacy compat — 'help_academy' à supprimer après migration DB des user_modules/plan_tier_modules
        .in('module_key', ['guides', 'help_academy']);
      
      const moduleKeys = (userModules || []).map((m: any) => m.module_key);
      const hasGuidesAccess = moduleKeys.includes('guides') || moduleKeys.includes('help_academy');
      
      if (hasGuidesAccess) {
        allowedBlockTypes.push('apogee', 'helpconfort', 'document');
      }
      console.log(`[unified-search] user_modules check: modules=[${moduleKeys.join(', ')}], hasGuidesAccess=${hasGuidesAccess}`);
    }
    console.log(`[unified-search] Doc permissions: roleLevel=N${roleLevel}, allowedBlockTypes=[${allowedBlockTypes.join(', ')}]`);
    const agencySlug = profile?.agence || '';
    
    const context: AiSearchContext = { userId: user.id, role: globalRole, roleLevel, agencyId: null, agencySlug: agencySlug || null, allowedAgencyIds: roleLevel >= 3 ? [] : undefined };
    console.log(`[unified-search] User id=${user.id}, role=${globalRole} (N${roleLevel}), agence=${agencySlug}`);

    const body: UnifiedSearchRequestBody = await req.json();
    const query = body.query;
    if (!query || typeof query !== 'string') return withCors(req, new Response(JSON.stringify({ type: 'error', error: { code: 'QUERY_REQUIRED', message: 'Une question est requise.' } }), { status: 400, headers: { 'Content-Type': 'application/json' } }));

    const now = body.now ? new Date(body.now) : new Date();
    const conversationHistory = body.conversationHistory;

    // ══════════════════════════════════════════════════════════
    // STEP 1: TOKENISATION (NL V4)
    // ══════════════════════════════════════════════════════════
    const tokenized = tokenizeQuery(query);
    console.log(`[unified-search] V4 Tokens: [${tokenized.tokens.join(', ')}]`);

    // ══════════════════════════════════════════════════════════
    // STEP 2: CHARGEMENT ENTITÉS DYNAMIQUES DEPUIS APOGÉE
    // ══════════════════════════════════════════════════════════
    const proxyUrl = `${supabaseUrl}/functions/v1/proxy-apogee`;
    let entityDictionary: EntityDictionary = { apporteurs: [], techniciens: [], univers: [] };
    let entityDictionariesV4: EntityDictionaries = { apporteurs: [], techniciens: [], univers: [], agences: [] };
    
    if (agencySlug) {
      const [usersRaw, clientsRaw] = await Promise.all([
        loadUsersForAgency(proxyUrl, authHeader, agencySlug),
        loadClientsForAgency(proxyUrl, authHeader, agencySlug)
      ]);
      
      // Pour V4: construire les dictionnaires d'entités avec les noms bruts
      const apporteurNames: string[] = clientsRaw.map(c => c.name || '').filter(n => n.length >= 3);
      const technicienNames: string[] = usersRaw.map(u => u.fullName || '').filter(n => n.length >= 3);
      
      entityDictionariesV4 = {
        apporteurs: apporteurNames,
        techniciens: technicienNames,
        univers: ['PLOMBERIE', 'VITRERIE', 'SERRURERIE', 'ELECTRICITE', 'MENUISERIE', 'PEINTURE', 'MACONNERIE', 'COUVERTURE', 'CARRELAGE'],
        agences: [agencySlug]
      };
      
      console.log(`[unified-search] V4 Dictionaries: ${entityDictionariesV4.apporteurs.length} apporteurs, ${entityDictionariesV4.techniciens.length} techniciens`);
      
      // Sample pour debug
      if (entityDictionariesV4.apporteurs.length > 0) {
        console.log(`[unified-search] Sample apporteurs: ${entityDictionariesV4.apporteurs.slice(0, 5).join(', ')}`);
      }
      
      // Construire aussi l'ancien dictionnaire pour compatibilité
      entityDictionary = buildEntityDictionary(
        clientsRaw.map(c => ({ id: c.id, name: c.name, company: c.company })),
        usersRaw.map(u => ({ id: u.id, firstname: u.firstName, lastname: u.lastName }))
      );
    }

    // ══════════════════════════════════════════════════════════
    // STEP 3: PARSING NL V4 COMPLET (subject/operation/dimension/filters)
    // ══════════════════════════════════════════════════════════
    const nlContextV4: NlContext = {
      dictionaries: entityDictionariesV4,
      defaultYear: now.getFullYear()
    };
    
    const parsedV4 = parseStatiaQuery(query, nlContextV4);
    console.log(`[unified-search] V4 Parsed: subject=${parsedV4.subject}, operation=${parsedV4.operation}, dimension=${parsedV4.dimension}`);
    console.log(`[unified-search] V4 Filters: apporteur=${parsedV4.filters.apporteur || 'none'}, technicien=${parsedV4.filters.technicien || 'none'}`);
    console.log(`[unified-search] V4 Period: type=${parsedV4.period.type}, month=${parsedV4.period.month || 'none'}, year=${parsedV4.period.year || 'none'}`);

    // ══════════════════════════════════════════════════════════
    // STEP 4: SÉLECTION MÉTRIQUE V4 (scoring par subject+operation+dimension)
    // ══════════════════════════════════════════════════════════
    const selectedMetricV4 = selectMetricV4(parsedV4);
    console.log(`[unified-search] V4 Selected metric: ${selectedMetricV4?.id || 'NONE'} (${selectedMetricV4?.label || ''}) [engineKey: ${selectedMetricV4?.engineKey || 'none'}]`);

    // ══════════════════════════════════════════════════════════
    // STEP 5: EXTRACTION PÉRIODE (format legacy pour compatibilité)
    // ══════════════════════════════════════════════════════════
    const period = extractPeriodFromTokens(tokenized, now);
    
    // Override period si V4 a trouvé un mois spécifique
    if (parsedV4.period.month && parsedV4.period.year) {
      const startOfMonth = new Date(parsedV4.period.year, parsedV4.period.month - 1, 1);
      const endOfMonth = new Date(parsedV4.period.year, parsedV4.period.month, 0);
      period.from = startOfMonth.toISOString().split('T')[0];
      period.to = endOfMonth.toISOString().split('T')[0];
      period.label = `${['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parsedV4.period.month]} ${parsedV4.period.year}`;
      period.isDefault = false;
    }
    console.log(`[unified-search] Final period: ${period.label} (${period.from} → ${period.to})`);

    // ══════════════════════════════════════════════════════════
    // STEP 5.5: TEMPLATES LÉGERS (bypass NL si match fort)
    // ══════════════════════════════════════════════════════════
    const templateMatch = matchSimpleTemplate(query);
    if (templateMatch) {
      console.log(`[unified-search] TEMPLATE MATCH: ${templateMatch.template.id} via pattern "${templateMatch.matchedPattern}" (confidence: ${templateMatch.confidence})`);
    }

    // ══════════════════════════════════════════════════════════
    // STEP 6: RÉSOLUTION FINALE DE LA MÉTRIQUE + ENTITÉS
    // ══════════════════════════════════════════════════════════
    let finalMetricId: string | null = null;
    let metricSource = 'none';
    let metricScores: MetricScore[] = [];
    let templatePostProcessing: string | null = null;
    let templateEntityType: string | null = null;
    
    // Fallback entities/extracted pour compatibilité arrière
    const entityFiltersCompat = findEntitiesInQuery(normalizeForMatching(query), entityDictionary);
    const extractedCompat = extractIntentFromTokens(tokenized);
    let extractedWithEntityOverride = { ...extractedCompat };
    if (entityFiltersCompat.dimension !== 'global') {
      extractedWithEntityOverride = { ...extractedCompat, dimension: entityFiltersCompat.dimension as any };
    }
    const metricResultFallback = selectBestMetric(extractedWithEntityOverride, 5);
    metricScores = metricResultFallback.scores;
    
    // ════════════════════════════════════════════════════════════
    // PRIORITÉ DE RÉSOLUTION:
    // 1. Template match (si confiance high)
    // 2. NL V4 (si métrique trouvée)
    // 3. NL V3 fallback
    // ════════════════════════════════════════════════════════════
    if (templateMatch && templateMatch.confidence === 'high') {
      finalMetricId = templateMatch.template.metricId;
      metricSource = 'template';
      templatePostProcessing = templateMatch.template.postProcessing;
      templateEntityType = templateMatch.template.entityType || null;
      console.log(`[unified-search] Using TEMPLATE: ${finalMetricId} (postProcessing: ${templatePostProcessing})`);
    } else if (selectedMetricV4) {
      finalMetricId = selectedMetricV4.engineKey; // Utiliser l'engineKey pour StatIA
      metricSource = 'nlv4';
    } else if (templateMatch) {
      // Template match avec confiance medium = utiliser comme fallback
      finalMetricId = templateMatch.template.metricId;
      metricSource = 'template_fallback';
      templatePostProcessing = templateMatch.template.postProcessing;
      templateEntityType = templateMatch.template.entityType || null;
      console.log(`[unified-search] Using TEMPLATE FALLBACK: ${finalMetricId}`);
    } else if (metricResultFallback.metric) {
      finalMetricId = metricResultFallback.metric.id;
      metricSource = 'nlv3_fallback';
    }
    console.log(`[unified-search] Final metric: ${finalMetricId || 'NONE'} (source: ${metricSource})`);
    
    // Résoudre les entités pour les filtres (priorité V4)
    const resolvedEntities: ResolvedEntities = {
      apporteurId: entityFiltersCompat.apporteur?.id,
      apporteurName: parsedV4.filters.apporteur || entityFiltersCompat.apporteur?.name,
      technicienId: entityFiltersCompat.technicien?.id,
      technicienName: parsedV4.filters.technicien || entityFiltersCompat.technicien?.name,
    };
    
    // Si V4 a trouvé un apporteur mais pas d'ID, chercher l'ID
    if (parsedV4.filters.apporteur && !resolvedEntities.apporteurId && agencySlug) {
      const clientsRaw = await loadClientsForAgency(proxyUrl, authHeader, agencySlug);
      const matchedClient = clientsRaw.find(c => 
        normalizeV4(c.name || '').includes(normalizeV4(parsedV4.filters.apporteur || '')) ||
        normalizeV4(parsedV4.filters.apporteur || '').includes(normalizeV4(c.name || ''))
      );
      if (matchedClient) {
        resolvedEntities.apporteurId = matchedClient.id;
        console.log(`[unified-search] Resolved apporteur: ${parsedV4.filters.apporteur} → ID ${matchedClient.id}`);
      }
    }

    // ══════════════════════════════════════════════════════════
    // STEP 7: CORE ROUTING (avec nouveau système de métrique)
    // ══════════════════════════════════════════════════════════
    const metricResult = finalMetricId && hasMetricSignature(finalMetricId)
      ? { metric: getMetricSignature(finalMetricId)!, scores: metricScores }
      : { metric: null, scores: metricScores };

    const routed = aiSearchRouteV3(query, tokenized, extractedWithEntityOverride, period, context, resolvedEntities, metricResult, now);
    
    // forceStats: if Helpi sends this flag, override doc routing to stats
    if (body.forceStats && routed.type === 'doc') {
      console.log(`[unified-search] forceStats: overriding doc→stats`);
      routed.type = 'stats';
    }
    
    console.log(`[unified-search] Routed: type=${routed.type}, metric=${routed.parsed?.metricId || 'none'}`);

    // ══════════════════════════════════════════════════════════
    // STEP 7: HANDLE ERROR/AMBIGUOUS
    // ══════════════════════════════════════════════════════════
    if (routed.type === 'error') {
      const response: AiSearchResult = { type: 'error', result: null, interpretation: buildInterpretation(null, agencySlug, routed.debug), error: routed.error, computedAt: now.toISOString(), agencySlug };
      if (roleLevel >= 6) response.debug = routed.debug;
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    if (routed.type === 'ambiguous') {
      const response: AiSearchResult = { type: 'ambiguous', result: routed.ambiguous, interpretation: buildInterpretation(null, agencySlug, routed.debug), computedAt: now.toISOString(), agencySlug };
      if (roleLevel >= 6) response.debug = routed.debug;
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ══════════════════════════════════════════════════════════
    // STEP 8: ACCESS CONTROL
    // ══════════════════════════════════════════════════════════
    if (routed.type === 'stats' && roleLevel === 2 && !agencySlug) {
      return withCors(req, new Response(JSON.stringify({ type: 'access_denied', result: null, interpretation: buildInterpretation(routed.parsed, agencySlug, routed.debug), error: { code: 'AGENCY_REQUIRED', message: 'Vous devez être rattaché à une agence.' }, computedAt: now.toISOString(), agencySlug: '' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    if (routed.type === 'stats' && routed.parsed?.networkScope && roleLevel < 3) {
      return withCors(req, new Response(JSON.stringify({ type: 'access_denied', result: null, interpretation: buildInterpretation(routed.parsed, agencySlug, routed.debug), error: { code: 'ACCESS_DENIED', message: 'Statistiques réseau réservées au franchiseur (N3+).' }, computedAt: now.toISOString(), agencySlug }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ══════════════════════════════════════════════════════════
    // STEP 9: EXECUTE
    // ══════════════════════════════════════════════════════════
    let result: any = null;
    let fromCache = false;

    if (routed.type === 'stats' && routed.parsed) {
      const parsed = routed.parsed;
      const scope = parsed.networkScope ? 'reseau' : 'agence';
      const filters: Record<string, unknown> = { univers: parsed.univers, limit: parsed.limit, technicienId: parsed.technicienId, technicienName: parsed.technicienName, apporteurId: parsed.apporteurId, apporteurName: parsed.apporteurName };
      const cacheKey = buildCacheKey(parsed.metricId, agencySlug, parsed.period, filters, scope);
      
      // ════════════════════════════════════════════════════════════
      // CACHE: Désactivé pour métriques sensibles + requêtes filtrées
      // ════════════════════════════════════════════════════════════
      const forceNoCacheMetrics = new Set(['ca_par_technicien', 'top_techniciens_ca']);
      const skipCache = forceNoCacheMetrics.has(parsed.metricId) || !!(parsed.technicienId || parsed.apporteurId);
      console.log(`[unified-search] Cache: metric=${parsed.metricId}, skipCache=${skipCache}`);
      const cached = skipCache ? null : await getCacheEntry(supabase, cacheKey);
      if (cached) { console.log('[unified-search] Cache hit'); result = cached; fromCache = true; }
      else {
        // ════════════════════════════════════════════════════════════
        // FIX SIMPLIFIÉ: Forcer les sources complètes pour métriques sensibles
        // ════════════════════════════════════════════════════════════
        let requiredSources = getRequiredSources(parsed.metricId);
        requiredSources = getEnforcedSources(parsed.metricId, requiredSources);
        
        console.log(`[unified-search] Loading: ${requiredSources.join(', ')}`);
        const apogeeData = await loadApogeeData(proxyUrl, authHeader, agencySlug, parsed.period, requiredSources);
        
        // ════════════════════════════════════════════════════════════
        // FIX SIMPLIFIÉ: Log de debug systématique
        // ════════════════════════════════════════════════════════════
        logSourcesDebug(parsed.metricId, apogeeData);
        console.log(`[unified-search] Data: ${apogeeData.factures.length} factures, ${apogeeData.projects.length} projects`);
        
        // ════════════════════════════════════════════════════════════
        // FIX SIMPLIFIÉ: Validation dure des sources avant calcul
        // ════════════════════════════════════════════════════════════
        const validationResult = validateSources(parsed.metricId, requiredSources, apogeeData);
        if (!validationResult.isValid) {
          console.error(`[unified-search] VALIDATION FAILED: ${validationResult.errorMessage}`);
          const userError = buildUserFriendlyError(validationResult);
          const errorResponse: AiSearchResult = {
            type: 'error',
            result: null,
            interpretation: buildInterpretation(parsed, agencySlug, routed.debug),
            error: { code: 'STATIA_DATA_MISSING', message: userError },
            computedAt: now.toISOString(),
            agencySlug
          };
          return withCors(req, new Response(JSON.stringify(errorResponse), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        
        const params: StatParams = { dateRange: { start: new Date(parsed.period.from), end: new Date(parsed.period.to) }, agencySlug, topN: parsed.limit || undefined, filters: { univers: parsed.univers, technicienId: parsed.technicienId, technicienName: parsed.technicienName, apporteurId: parsed.apporteurId, apporteurName: parsed.apporteurName } };
        result = computeMetric(parsed.metricId, apogeeData, params);
        console.log(`[unified-search] Computed: ${result.value}${result.unit}`);
        
        // ════════════════════════════════════════════════════════════
        // FIX SIMPLIFIÉ: Post-processing automatique
        // ════════════════════════════════════════════════════════════
        const isTopQuery = parsed.intentType === 'top' || parsed.intentType === 'classement' || parsed.intentType === 'meilleur';
        const postProcessType = inferPostProcessingType(parsed.metricId, isTopQuery);
        const entityType = getEntityTypeForMetric(parsed.metricId);
        const postProcessed = applyPostProcessing(result, postProcessType, entityType);
        
        // Enrichir result avec les infos post-processées
        if (postProcessed.displayText) {
          (result as any).displayText = postProcessed.displayText;
          (result as any).postProcessType = postProcessType;
        }
        
        if (!skipCache) { const ttl = computeTTL(parsed.period.to); await setCacheEntry(supabase, cacheKey, result, ttl); }
      }

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
          hasData: result.hasData, 
          dataCount: result.dataCount,
          displayText: (result as any).displayText,
          postProcessType: (result as any).postProcessType
        },
        interpretation: buildInterpretation(parsed, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug,
        fromCache,
      };
      if (roleLevel >= 6) response.debug = { ...routed.debug, cacheKey, executionTimeMs: Date.now() - startTime };
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    } else if (routed.type === 'doc') {
      const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Utilisateur';
      result = await searchDocsConversational(supabase, query, userName, authHeader, allowedBlockTypes, conversationHistory);
      const docResultsFormatted = result.docResults?.map((d: DocSearchResult) => ({
        id: d.id,
        title: d.title,
        snippet: d.content?.substring(0, 200) + '...',
        url: d.url,
        source: d.blockType,
        similarity: d.similarity
      })) || [];
      const response: AiSearchResult = {
        type: 'doc',
        result: { answer: result.answer, sources: result.sources, docResults: docResultsFormatted, isConversational: true },
        interpretation: buildInterpretation(null, agencySlug, routed.debug),
        computedAt: now.toISOString(),
        agencySlug
      };
      return withCors(req, new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    return withCors(req, new Response(JSON.stringify({ type: 'error', error: { code: 'UNKNOWN_TYPE', message: 'Type de requête non supporté.' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return withCors(req, new Response(JSON.stringify({ type: 'error', error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Erreur interne' } }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
});

// ═══════════════════════════════════════════════════════════════
// INTERPRETATION BUILDER
// ═══════════════════════════════════════════════════════════════

function buildInterpretation(parsed: ParsedStatQuery | null, agencySlug: string, debug?: any): AiSearchResult['interpretation'] {
  if (!parsed) return { metricId: null, metricLabel: null, dimension: 'global', intentType: 'valeur', period: { from: '', to: '', label: '' }, filters: {}, confidence: 0, scope: 'agence', corrections: debug?.corrections };
  const metricInfo = METRICS_INFO[parsed.metricId];
  return { metricId: parsed.metricId, metricLabel: metricInfo?.label || null, dimension: metricInfo?.isRanking ? 'ranking' : 'global', intentType: parsed.intentType, period: parsed.period, filters: { univers: parsed.univers, limit: parsed.limit }, confidence: parsed.confidence === 'high' ? 0.9 : parsed.confidence === 'medium' ? 0.7 : 0.5, scope: parsed.networkScope ? 'reseau' : 'agence', corrections: debug?.corrections };
}
