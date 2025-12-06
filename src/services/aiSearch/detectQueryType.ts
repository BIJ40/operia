/**
 * StatIA AI Search - Détection type de requête
 * Classifie: stats / doc / action / pedagogic / unknown
 */

import type { QueryType, KeywordMatch } from './types';
import { findAllKeywords, computeStatsScore, getDominantCategory } from './nlKeywords';

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
// DÉTECTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

interface DetectionResult {
  type: QueryType;
  confidence: number;
  keywordMatches: KeywordMatch[];
  reasoning: string;
}

/**
 * Détecte le type de requête avec scoring hybride
 */
export function detectQueryType(normalizedQuery: string, originalQuery: string): DetectionResult {
  // 1. Analyse par mots-clés
  const keywordMatches = findAllKeywords(normalizedQuery);
  const statsScore = computeStatsScore(keywordMatches);
  const dominantCategory = getDominantCategory(keywordMatches);
  
  // 2. Analyse par patterns regex
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
  
  // 3. Combiner avec le score keywords
  scores.stats += statsScore * 0.5;
  
  // Bonus si catégorie dominante cohérente
  if (dominantCategory === 'metric' || dominantCategory === 'dimension' || dominantCategory === 'intent') {
    scores.stats += 0.2;
  }
  if (dominantCategory === 'doc') {
    scores.doc += 0.3;
  }
  if (dominantCategory === 'action') {
    scores.action += 0.3;
  }
  
  // 4. Déterminer le type final
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
    reasoning = `Stats détecté (score=${scores.stats.toFixed(2)}, keywords=${keywordMatches.length})`;
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
  };
}

/**
 * Version simplifiée pour vérification rapide
 */
export function isStatsQuery(normalizedQuery: string, originalQuery: string = normalizedQuery): boolean {
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
