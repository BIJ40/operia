/**
 * StatIA NL Routing - Main Parser
 * Pipeline complet: requête NL → ParsedStatQuery
 */

import { ParsedStatQuery, DimensionType, IntentType, ParsedPeriod } from './types';
import {
  normalizeQuery,
  extractUnivers,
  extractPeriode,
  extractTopN,
  extractTechnicienName,
  extractComparison,
  detectDimension,
  detectIntent,
  getDefaultPeriod,
} from './extractors';
import { isStatsQuery, routeToMetric } from './routing';

export { isStatsQuery };

/**
 * Parse une requête NL et retourne la métrique StatIA correspondante
 * IMPORTANT: Renvoie TOUJOURS une période (fallback 12 derniers mois)
 */
export function parseStatQuery(query: string, now = new Date()): ParsedStatQuery | null {
  if (!isStatsQuery(query)) {
    return null;
  }

  const normalizedQuery = normalizeQuery(query);
  const dimension = detectDimension(query);
  const intent = detectIntent(query);
  const univers = extractUnivers(query);
  const parsedPeriod = extractPeriode(query, now);
  const topN = extractTopN(query);
  const technicienName = extractTechnicienName(query);
  const comparison = extractComparison(query);

  // Route to metric
  const routing = routeToMetric(dimension, intent, query);

  // CRITICAL: Always have a period - fallback to 12 months or current year for rankings
  let effectivePeriod: ParsedPeriod;
  
  if (parsedPeriod) {
    effectivePeriod = parsedPeriod;
  } else if (routing.isRanking) {
    // For rankings without period, use current year
    effectivePeriod = {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: `Année ${now.getFullYear()}`,
      isDefault: true,
    };
  } else {
    // For other metrics, use 12 last months
    effectivePeriod = getDefaultPeriod(now);
  }

  // Calculate confidence score
  let confidence = 0.5;
  if (univers) confidence += 0.15;
  if (parsedPeriod && !parsedPeriod.isDefault) confidence += 0.2;
  if (topN) confidence += 0.1;
  if (dimension !== 'global') confidence += 0.05;
  if (comparison) confidence += 0.05;

  return {
    metricId: routing.metricId,
    metricLabel: routing.label,
    dimension,
    intentType: intent,
    univers,
    period: effectivePeriod,
    topN: topN || routing.defaultTopN,
    technicienName,
    comparison,
    confidence: Math.min(confidence, 1),
    minRole: routing.minRole,
    isRanking: routing.isRanking,
    debug: {
      detectedDimension: dimension,
      detectedIntent: intent,
      detectedUnivers: univers || null,
      detectedPeriod: effectivePeriod.label,
      routingPath: `${dimension}.${intent} → ${routing.metricId}`,
      normalizedQuery,
    },
  };
}

/**
 * Parse et valide une requête avec contexte utilisateur
 */
export function parseStatQueryWithContext(
  query: string, 
  userRoleLevel: number,
  now = new Date()
): { 
  parsed: ParsedStatQuery | null; 
  accessDenied: boolean; 
  accessMessage?: string;
} {
  const parsed = parseStatQuery(query, now);
  
  if (!parsed) {
    return { parsed: null, accessDenied: false };
  }
  
  // Check access
  if (userRoleLevel < parsed.minRole) {
    return {
      parsed,
      accessDenied: true,
      accessMessage: 'Vous n\'avez pas accès à cette statistique. Contactez votre responsable.',
    };
  }
  
  return { parsed, accessDenied: false };
}
