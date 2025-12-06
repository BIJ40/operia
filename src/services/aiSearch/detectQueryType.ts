/**
 * StatIA AI Search - Détection type de requête
 * Classifie: stats / doc / action / pedagogic / unknown
 * V2: Utilise les catégories pondérées pour scoring avancé
 */

import type { QueryType, KeywordMatch, IntentType, DimensionType } from './types';
import { findAllKeywords, computeStatsScore, getDominantCategory, getKeywordsByCategory } from './nlKeywords';

// ═══════════════════════════════════════════════════════════════
// CATÉGORIES FORTES POUR STATS
// ═══════════════════════════════════════════════════════════════

const STRONG_STATS_CATEGORIES = new Set([
  'finance',
  'recouvrement',
  'ratios',
  'volumes',
  'forecasting',
  'analytics',
  'prediction',
  'risk_analysis',
  'business_analysis',
  'pilotage',
  'delais',
  'tendances',
]);

const DIMENSION_CATEGORIES = new Set([
  'univers',
  'activite',
  'region',
  'agence',
  'reseau',
  'clientele',
  'segmentation',
]);

// ═══════════════════════════════════════════════════════════════
// PATTERNS DE DÉTECTION
// ═══════════════════════════════════════════════════════════════

const STATS_PATTERNS = [
  /combien/i,
  /quel(?:le)?s?\s+(?:est|sont)/i,
  /montant/i,
  /total(?:iser)?/i,
  /top\s*\d*/i,
  /classement/i,
  /meilleur/i,
  /moyenne/i,
  /taux/i,
  /pourcentage/i,
  /evolution/i,
  /comparaison/i,
  /ca\s/i,
  /chiffre\s*(?:d'?)?affaires?/i,
  /recouvrement/i,
  /encours/i,
  /impaye/i,
  /sav\b/i,
  /dossiers?\s+(?:recus?|crees?|ouverts?)/i,
  /factures?\s+(?:emises?|payees?)/i,
  /interventions?\s+(?:realisees?|planifiees?)/i,
  /delai/i,
  /depuis\s+(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)/i,
  /cette\s+(?:annee|semaine|mois)/i,
  /(?:dernier|derniere)\s+(?:annee|semaine|mois|trimestre)/i,
  /par\s+(?:technicien|apporteur|univers|mois)/i,
];

const DOC_PATTERNS = [
  /comment\s+(?:faire|creer|modifier|supprimer)/i,
  /pourquoi/i,
  /qu'?est[- ]ce\s+que/i,
  /aide\s+(?:sur|pour|a)/i,
  /guide/i,
  /tutoriel/i,
  /procedure/i,
  /etapes?\s+pour/i,
  /ou\s+(?:trouver|est)/i,
  /expliqu/i,
  /definition/i,
  /signifie/i,
  /veut\s+dire/i,
];

const ACTION_PATTERNS = [
  /(?:ouvrir?|afficher?|voir|montrer?|aller)\s+(?:mon|ma|mes|le|la|les)/i,
  /(?:ouvrir?|afficher?|voir)\s+(?:planning|agenda|calendrier)/i,
  /(?:ouvrir?|afficher?|voir)\s+(?:dossiers?|devis|factures?)/i,
  /mes\s+(?:devis|dossiers|factures|interventions)/i,
  /(?:devis|dossiers|factures)\s+en\s+(?:attente|cours)/i,
  /tableau\s+de\s+bord/i,
  /dashboard/i,
];

const PEDAGOGIC_PATTERNS = [
  /c'?est\s+quoi/i,
  /definition\s+(?:de|du|des)/i,
  /qu'?est[- ]ce\s+qu'?(?:un|une)/i,
  /signification/i,
  /a\s+quoi\s+sert/i,
  /regle\s+(?:de|du)/i,
  /politique\s+(?:de|du)/i,
];

// ═══════════════════════════════════════════════════════════════
// RÉSULTAT DE DÉTECTION ENRICHI
// ═══════════════════════════════════════════════════════════════

export interface DetectionResult {
  type: QueryType;
  confidence: number;
  keywordMatches: KeywordMatch[];
  reasoning: string;
  
  // Nouvelles propriétés enrichies
  detectedCategories: Set<string>;
  strongCategoriesCount: number;
  dimensionCategories: string[];
  suggestedDimension: DimensionType | null;
  suggestedIntent: IntentType | null;
  needsAdvancedAnalysis: boolean;
  isNetworkScope: boolean;
}

/**
 * Détecte le type de requête avec scoring hybride
 * V2: Utilise catégories fortes et enrichit ParsedStatQuery
 */
export function detectQueryType(normalizedQuery: string, originalQuery: string): DetectionResult {
  // 1. Analyse par mots-clés
  const keywordMatches = findAllKeywords(normalizedQuery);
  const statsScore = computeStatsScore(keywordMatches);
  const dominantCategory = getDominantCategory(keywordMatches);
  
  // 2. Analyser les catégories détectées
  const detectedCategories = new Set<string>();
  const dimensionCategories: string[] = [];
  let strongCategoriesCount = 0;
  let needsAdvancedAnalysis = false;
  let isNetworkScope = false;
  
  for (const match of keywordMatches) {
    const cat = match.keyword.category;
    detectedCategories.add(cat);
    
    // Compter catégories fortes stats
    if (STRONG_STATS_CATEGORIES.has(cat)) {
      strongCategoriesCount++;
    }
    
    // Détecter catégories dimension
    if (DIMENSION_CATEGORIES.has(cat)) {
      dimensionCategories.push(cat);
    }
    
    // Détecter besoin analyse avancée
    if (['analytics', 'ai_analysis', 'data_science', 'prediction', 'forecasting'].includes(cat)) {
      needsAdvancedAnalysis = true;
    }
    
    // Détecter scope réseau
    if (['reseau', 'region', 'agence'].includes(cat)) {
      isNetworkScope = true;
    }
  }
  
  // 3. Déduire dimension et intent
  const suggestedDimension = deduceDimension(keywordMatches, normalizedQuery);
  const suggestedIntent = deduceIntent(keywordMatches, normalizedQuery);
  
  // 4. Analyse par patterns regex
  const scores = {
    stats: 0,
    doc: 0,
    action: 0,
    pedagogic: 0,
  };
  
  for (const pattern of STATS_PATTERNS) {
    if (pattern.test(normalizedQuery) || pattern.test(originalQuery)) {
      scores.stats += 0.15;
    }
  }
  
  for (const pattern of DOC_PATTERNS) {
    if (pattern.test(normalizedQuery) || pattern.test(originalQuery)) {
      scores.doc += 0.2;
    }
  }
  
  for (const pattern of ACTION_PATTERNS) {
    if (pattern.test(normalizedQuery) || pattern.test(originalQuery)) {
      scores.action += 0.25;
    }
  }
  
  for (const pattern of PEDAGOGIC_PATTERNS) {
    if (pattern.test(normalizedQuery) || pattern.test(originalQuery)) {
      scores.pedagogic += 0.25;
    }
  }
  
  // 5. Combiner avec le score keywords (pondération forte)
  scores.stats += statsScore * 0.6;
  
  // Bonus si catégories fortes (nouveau scoring V2)
  if (strongCategoriesCount >= 2) {
    scores.stats += 0.35;
  } else if (strongCategoriesCount >= 1) {
    scores.stats += 0.2;
  }
  
  // Bonus dimension
  if (dimensionCategories.length > 0) {
    scores.stats += 0.15;
  }
  
  // Bonus catégorie dominante cohérente
  if (dominantCategory === 'metric' || dominantCategory === 'dimension' || dominantCategory === 'intent') {
    scores.stats += 0.2;
  }
  if (dominantCategory === 'doc') {
    scores.doc += 0.3;
  }
  if (dominantCategory === 'action') {
    scores.action += 0.3;
  }
  
  // 6. Déterminer le type final
  const maxScore = Math.max(scores.stats, scores.doc, scores.action, scores.pedagogic);
  
  let type: QueryType;
  let confidence: number;
  let reasoning: string;
  
  if (maxScore < 0.15) {
    type = 'unknown';
    confidence = 1 - maxScore;
    reasoning = 'Aucun pattern significatif détecté';
  } else if (scores.stats >= scores.doc && scores.stats >= scores.action && scores.stats >= scores.pedagogic) {
    type = 'stats_query';
    confidence = Math.min(1, scores.stats);
    reasoning = `Stats détecté (score=${scores.stats.toFixed(2)}, keywords=${keywordMatches.length}, catFortes=${strongCategoriesCount})`;
  } else if (scores.action >= scores.doc && scores.action >= scores.pedagogic) {
    type = 'action_query';
    confidence = Math.min(1, scores.action);
    reasoning = `Action détectée (score=${scores.action.toFixed(2)})`;
  } else if (scores.pedagogic >= scores.doc) {
    type = 'pedagogic_query';
    confidence = Math.min(1, scores.pedagogic);
    reasoning = `Pédagogique détecté (score=${scores.pedagogic.toFixed(2)})`;
  } else {
    type = 'documentary_query';
    confidence = Math.min(1, scores.doc);
    reasoning = `Documentation détectée (score=${scores.doc.toFixed(2)})`;
  }
  
  return {
    type,
    confidence,
    keywordMatches,
    reasoning,
    detectedCategories,
    strongCategoriesCount,
    dimensionCategories,
    suggestedDimension,
    suggestedIntent,
    needsAdvancedAnalysis,
    isNetworkScope,
  };
}

/**
 * isStatsQuery renforcé V2
 * Utilise score ≥ 5 OU 2+ catégories fortes
 */
export function isStatsQuery(normalizedQuery: string, originalQuery: string = normalizedQuery): boolean {
  const keywordMatches = findAllKeywords(normalizedQuery);
  const totalScore = keywordMatches.reduce((sum, m) => sum + m.keyword.weight, 0);
  
  // Compter catégories fortes présentes
  const strongCategories = new Set<string>();
  for (const match of keywordMatches) {
    if (STRONG_STATS_CATEGORIES.has(match.keyword.category)) {
      strongCategories.add(match.keyword.category);
    }
  }
  
  // Stats si score ≥ 5 OU au moins 2 catégories fortes
  if (totalScore >= 5 || strongCategories.size >= 2) {
    return true;
  }
  
  // Fallback sur détection classique
  const result = detectQueryType(normalizedQuery, originalQuery);
  return result.type === 'stats_query' && result.confidence >= 0.3;
}

/**
 * Vérification rapide pour actions
 */
export function isActionQuery(normalizedQuery: string, originalQuery: string = normalizedQuery): boolean {
  const result = detectQueryType(normalizedQuery, originalQuery);
  return result.type === 'action_query' && result.confidence >= 0.4;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS - DÉDUCTION DIMENSION / INTENT
// ═══════════════════════════════════════════════════════════════

function deduceDimension(matches: KeywordMatch[], query: string): DimensionType | null {
  // Priorité aux matches explicites
  for (const match of matches) {
    const word = match.keyword.word.toLowerCase();
    if (word.includes('technicien') || word.includes('tech')) return 'technicien';
    if (word.includes('apporteur') || word.includes('commanditaire')) return 'apporteur';
    if (word.includes('univers') || word.includes('metier') || word.includes('domaine')) return 'univers';
    if (word.includes('agence')) return 'agence';
    if (word.includes('client')) return 'client_type';
  }
  
  // Fallback sur patterns query
  const q = query.toLowerCase();
  if (/par\s+technicien|techniciens?/.test(q)) return 'technicien';
  if (/par\s+apporteur|apporteurs?|commanditaire/.test(q)) return 'apporteur';
  if (/par\s+univers|univers/.test(q)) return 'univers';
  if (/par\s+agence|agences?/.test(q)) return 'agence';
  
  return null;
}

function deduceIntent(matches: KeywordMatch[], query: string): IntentType | null {
  const q = query.toLowerCase();
  
  // Classement / ranking
  if (/top|meilleur|premier|classement|ranking|podium/.test(q)) return 'top';
  
  // Moyenne
  if (/moyenne|moyen|avg|average/.test(q)) return 'moyenne';
  
  // Volume / comptage
  if (/combien|nombre|volume|total|comptage|count/.test(q)) return 'volume';
  
  // Taux / ratio
  if (/taux|pourcentage|ratio|%|proportion/.test(q)) return 'taux';
  
  // Délai
  if (/delai|temps|duree|rapidite|vitesse/.test(q)) return 'delay';
  
  // Comparaison
  if (/compar|versus|vs|n-1|evolution|progression/.test(q)) return 'compare';
  
  // Prévision
  if (/prevision|forecast|projection|prediction/.test(q)) return 'valeur'; // mapped to forecast in validateAndRoute
  
  return 'valeur';
}

/**
 * Export helper pour récupérer les catégories fortes
 */
export function getStrongStatsCategories(): Set<string> {
  return new Set(STRONG_STATS_CATEGORIES);
}
