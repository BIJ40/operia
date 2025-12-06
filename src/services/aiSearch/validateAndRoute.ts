/**
 * StatIA AI Search - Validation & Correction
 * Cœur du moteur déterministe - Aucune invention autorisée
 */

import type {
  LLMDraftIntent,
  ValidatedIntent,
  ValidationCorrection,
  QueryType,
  DimensionType,
  IntentType,
  ParsedPeriod,
  UserContext,
  AmbiguousResult,
  MetricCandidate,
} from './types';
import { getMetricById, isValidMetricId, findMetricForIntent, getAllMetricIds } from './metricsRegistry';
import { extractPeriod, getDefaultPeriod, getCurrentYearPeriod } from './extractPeriod';
import { findAllKeywords, extractDimensionFromMatches, extractUniversFromMatches } from './nlKeywords';

// ═══════════════════════════════════════════════════════════════
// LISTE BLANCHE DES UNIVERS
// ═══════════════════════════════════════════════════════════════

const VALID_UNIVERS = new Set([
  'PLOMBERIE',
  'ELECTRICITE',
  'VITRERIE',
  'SERRURERIE',
  'PEINTURE',
  'PLAQUISTE',
  'MENUISERIE',
  'COUVERTURE',
  'RECHERCHE FUITE',
  'MULTI-TRAVAUX',
  'CHAUFFAGE',      // Note: exclu de StatIA selon règles métier
  'CLIMATISATION',  // Note: exclu de StatIA selon règles métier
]);

// Univers exclus des calculs StatIA
const EXCLUDED_UNIVERS = new Set(['CHAUFFAGE', 'CLIMATISATION']);

// ═══════════════════════════════════════════════════════════════
// VALIDATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

type ValidationResult = {
  success: true;
  intent: ValidatedIntent;
} | {
  success: false;
  ambiguous: AmbiguousResult;
};

/**
 * Valide et corrige un intent draft du LLM
 * JAMAIS exécuté brut - toujours corrigé
 */
export function validateAndRoute(
  llmDraft: LLMDraftIntent | null,
  normalizedQuery: string,
  originalQuery: string,
  user: UserContext,
  now = new Date()
): ValidationResult {
  const corrections: ValidationCorrection[] = [];
  
  // ─────────────────────────────────────────────────────────────
  // 1. DÉTERMINER LE TYPE DE REQUÊTE
  // ─────────────────────────────────────────────────────────────
  
  let queryType: QueryType = llmDraft?.intent || 'unknown';
  
  // Si LLM n'a pas détecté ou faible confiance → heuristique
  if (!queryType || queryType === 'unknown' || (llmDraft?.confidence ?? 0) < 0.5) {
    queryType = detectQueryTypeHeuristic(normalizedQuery);
    if (llmDraft?.intent && llmDraft.intent !== queryType) {
      corrections.push({
        field: 'type',
        original: llmDraft.intent,
        corrected: queryType,
        reason: 'LLM confidence trop faible, heuristique appliquée',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 2. VALIDER LA MÉTRIQUE
  // ─────────────────────────────────────────────────────────────
  
  let metricId: string | undefined;
  let metricLabel: string | undefined;
  
  if (queryType === 'stats_query') {
    // Vérifier que la métrique du LLM est valide
    if (llmDraft?.metric && isValidMetricId(llmDraft.metric)) {
      metricId = llmDraft.metric;
    } else {
      // Trouver la métrique via les keywords
      const keywordMatches = findAllKeywords(normalizedQuery);
      const keywords = keywordMatches.map(m => m.keyword.word);
      const dimension = extractDimensionFromMatches(keywordMatches) as DimensionType || 'global';
      const intent = detectIntentFromQuery(normalizedQuery);
      
      const foundMetric = findMetricForIntent(dimension, intent, keywords);
      
      if (foundMetric) {
        metricId = foundMetric.id;
        if (llmDraft?.metric) {
          corrections.push({
            field: 'metricId',
            original: llmDraft.metric,
            corrected: metricId,
            reason: `Métrique '${llmDraft.metric}' invalide, corrigée en '${metricId}'`,
          });
        }
      } else {
        // Chercher les candidats pour ambiguïté
        const candidates = findAmbiguousCandidates(normalizedQuery);
        if (candidates.length > 1) {
          return {
            success: false,
            ambiguous: {
              type: 'ambiguous',
              candidates,
              message: 'Plusieurs métriques correspondent à votre requête. Précisez votre demande.',
              originalQuery,
            },
          };
        } else if (candidates.length === 1) {
          metricId = candidates[0].metricId;
        }
      }
    }
    
    // Récupérer le label
    if (metricId) {
      const metricDef = getMetricById(metricId);
      metricLabel = metricDef?.label;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. VALIDER LA DIMENSION
  // ─────────────────────────────────────────────────────────────
  
  let dimension: DimensionType = 'global';
  
  if (llmDraft?.dimension) {
    if (isValidDimension(llmDraft.dimension)) {
      dimension = llmDraft.dimension;
    } else {
      corrections.push({
        field: 'dimension',
        original: llmDraft.dimension,
        corrected: 'global',
        reason: `Dimension '${llmDraft.dimension}' invalide`,
      });
    }
  } else {
    // Détecter via keywords
    const keywordMatches = findAllKeywords(normalizedQuery);
    const detected = extractDimensionFromMatches(keywordMatches);
    if (detected && isValidDimension(detected)) {
      dimension = detected as DimensionType;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. VALIDER LA PÉRIODE
  // ─────────────────────────────────────────────────────────────
  
  let period: ParsedPeriod;
  
  // Essayer d'abord la période du LLM
  if (llmDraft?.period?.from && llmDraft?.period?.to) {
    period = {
      from: llmDraft.period.from,
      to: llmDraft.period.to,
      label: llmDraft.period.label || 'Période personnalisée',
      isDefault: false,
    };
  } else {
    // Parser depuis la requête
    const parsed = extractPeriod(normalizedQuery, now);
    if (parsed) {
      period = parsed;
    } else {
      // Fallback: année courante pour rankings, 12 mois sinon
      const metricDef = metricId ? getMetricById(metricId) : null;
      period = metricDef?.isRanking ? getCurrentYearPeriod(now) : getDefaultPeriod(now);
      corrections.push({
        field: 'period',
        original: null,
        corrected: period.label,
        reason: 'Aucune période détectée, fallback appliqué',
      });
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. VALIDER LES FILTRES
  // ─────────────────────────────────────────────────────────────
  
  const filters: Record<string, unknown> = {};
  
  // Univers
  const keywordMatches = findAllKeywords(normalizedQuery);
  const detectedUnivers = extractUniversFromMatches(keywordMatches);
  
  for (const uni of detectedUnivers) {
    if (VALID_UNIVERS.has(uni) && !EXCLUDED_UNIVERS.has(uni)) {
      filters.univers = uni;
      break; // Premier univers valide
    }
  }
  
  // Filtres du LLM (avec validation)
  if (llmDraft?.filters) {
    for (const [key, value] of Object.entries(llmDraft.filters)) {
      // Liste blanche des clés de filtres autorisées
      if (['univers', 'technicien', 'apporteur', 'client'].includes(key)) {
        if (key === 'univers') {
          const uni = String(value).toUpperCase();
          if (VALID_UNIVERS.has(uni) && !EXCLUDED_UNIVERS.has(uni)) {
            filters.univers = uni;
          } else {
            corrections.push({
              field: `filters.${key}`,
              original: value,
              corrected: null,
              reason: `Univers '${value}' invalide ou exclu`,
            });
          }
        } else {
          filters[key] = value;
        }
      } else {
        corrections.push({
          field: `filters.${key}`,
          original: value,
          corrected: null,
          reason: `Clé de filtre '${key}' non autorisée`,
        });
      }
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. VALIDER LE LIMIT (TOP N)
  // ─────────────────────────────────────────────────────────────
  
  let limit: number | undefined;
  
  if (llmDraft?.limit) {
    if (llmDraft.limit > 0 && llmDraft.limit <= 100) {
      limit = llmDraft.limit;
    } else {
      corrections.push({
        field: 'limit',
        original: llmDraft.limit,
        corrected: 10,
        reason: 'Limit hors bornes (1-100)',
      });
      limit = 10;
    }
  } else if (metricId) {
    const metricDef = getMetricById(metricId);
    limit = metricDef?.defaultTopN;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 7. APPLIQUER LES PERMISSIONS
  // ─────────────────────────────────────────────────────────────
  
  let agencyScope: 'single' | 'network' = 'single';
  let allowedAgencyIds: string[] | undefined;
  
  // N0/N1 → pas de stats
  if (user.roleLevel < 2 && queryType === 'stats_query') {
    queryType = 'documentary_query';
    corrections.push({
      field: 'type',
      original: 'stats_query',
      corrected: 'documentary_query',
      reason: 'Rôle insuffisant pour les statistiques (N2+ requis)',
    });
  }
  
  // N2 → agence unique
  if (user.roleLevel === 2) {
    agencyScope = 'single';
  }
  
  // N3+ → réseau si autorisé
  if (user.roleLevel >= 3) {
    agencyScope = user.allowedAgencyIds?.length ? 'network' : 'single';
    allowedAgencyIds = user.allowedAgencyIds;
  }
  
  // Vérifier minRole de la métrique
  if (metricId) {
    const metricDef = getMetricById(metricId);
    if (metricDef && user.roleLevel < metricDef.minRole) {
      return {
        success: false,
        ambiguous: {
          type: 'ambiguous',
          candidates: [],
          message: 'Vous n\'avez pas accès à cette métrique.',
          originalQuery,
        },
      };
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 8. CONSTRUIRE L'INTENT FINAL
  // ─────────────────────────────────────────────────────────────
  
  const intent = detectIntentFromQuery(normalizedQuery);
  
  const validatedIntent: ValidatedIntent = {
    type: queryType,
    metricId,
    metricLabel,
    dimension,
    intentType: intent,
    limit,
    period,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
    agencyScope,
    allowedAgencyIds,
    userRoleLevel: user.roleLevel,
    validation: {
      corrections,
      llmConfidence: llmDraft?.confidence ?? 0,
      finalConfidence: computeFinalConfidence(llmDraft, corrections),
      source: llmDraft ? (corrections.length > 0 ? 'hybrid' : 'llm') : 'heuristic',
    },
  };
  
  return { success: true, intent: validatedIntent };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function detectQueryTypeHeuristic(normalizedQuery: string): QueryType {
  const q = normalizedQuery.toLowerCase();
  
  // Stats patterns
  if (/combien|quel(?:le)?s?\s+(?:est|sont)|montant|total|top|classement|meilleur|moyenne|taux|pourcentage|evolution|ca\s|chiffre|recouvrement|encours|impaye|sav\b|dossiers?\s+(?:recus?|crees?)|factures?\s+(?:emises?|payees?)|interventions?|delai|par\s+(?:technicien|apporteur|univers)/.test(q)) {
    return 'stats_query';
  }
  
  // Action patterns
  if (/(?:ouvrir?|afficher?|voir|montrer?|aller)\s+(?:mon|ma|mes|le|la|les)|mes\s+(?:devis|dossiers|factures)|planning|agenda|dashboard/.test(q)) {
    return 'action_query';
  }
  
  // Doc patterns
  if (/comment\s+(?:faire|creer|modifier)|pourquoi|qu'?est[- ]ce\s+que|aide\s+(?:sur|pour)|guide|tutoriel|procedure|etapes?\s+pour|expliqu/.test(q)) {
    return 'documentary_query';
  }
  
  // Pedagogic patterns
  if (/c'?est\s+quoi|definition\s+(?:de|du)|qu'?est[- ]ce\s+qu'?(?:un|une)|signification|a\s+quoi\s+sert/.test(q)) {
    return 'pedagogic_query';
  }
  
  return 'unknown';
}

function detectIntentFromQuery(normalizedQuery: string): IntentType {
  const q = normalizedQuery.toLowerCase();
  
  if (/top|meilleur|premier|classement|ranking/.test(q)) return 'top';
  if (/moyenne|moyen|avg/.test(q)) return 'moyenne';
  if (/combien|nombre|volume|total/.test(q)) return 'volume';
  if (/taux|pourcentage|ratio|%/.test(q)) return 'taux';
  if (/delai|temps|duree/.test(q)) return 'delay';
  if (/compar|versus|vs|n-1/.test(q)) return 'compare';
  
  return 'valeur';
}

function isValidDimension(dim: string): dim is DimensionType {
  return ['global', 'technicien', 'apporteur', 'univers', 'agence', 'site', 'client_type'].includes(dim);
}

function computeFinalConfidence(llmDraft: LLMDraftIntent | null, corrections: ValidationCorrection[]): number {
  if (!llmDraft) return 0.7; // Heuristique seule
  
  let confidence = llmDraft.confidence;
  
  // Réduire la confiance pour chaque correction appliquée
  confidence -= corrections.length * 0.1;
  
  return Math.max(0.3, Math.min(1, confidence));
}

function findAmbiguousCandidates(normalizedQuery: string): MetricCandidate[] {
  const keywordMatches = findAllKeywords(normalizedQuery);
  const keywords = keywordMatches.map(m => m.keyword.word);
  
  const candidates: MetricCandidate[] = [];
  const allMetrics = getAllMetricIds();
  
  for (const metricId of allMetrics) {
    const metric = getMetricById(metricId);
    if (!metric) continue;
    
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const kw of keywords) {
      if (metric.keywords.includes(kw)) {
        score += 0.2;
        matchedKeywords.push(kw);
      }
    }
    
    if (score >= 0.2) {
      candidates.push({
        metricId: metric.id,
        label: metric.label,
        score,
        reason: `Match: ${matchedKeywords.join(', ')}`,
      });
    }
  }
  
  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}
