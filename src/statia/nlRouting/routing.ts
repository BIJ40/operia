/**
 * StatIA NL Routing - Routing Logic
 * Mapping dimension + intent → métrique
 */

import { DimensionType, IntentType, RoutingRule, MetricRouting } from './types';
import { NL_ROUTING_RULES, SPECIALIZED_METRICS, STATS_KEYWORDS } from './dictionaries';
import { normalizeQuery } from './extractors';

/**
 * Détermine si la requête concerne des statistiques
 */
export function isStatsQuery(query: string): boolean {
  const normalized = normalizeQuery(query);
  return STATS_KEYWORDS.some(kw => normalized.includes(kw));
}

/**
 * Route vers la métrique appropriée
 */
export function routeToMetric(
  dimension: DimensionType,
  intent: IntentType,
  query: string
): MetricRouting {
  const normalized = normalizeQuery(query);
  
  // 1. Check specialized metrics first (keyword-based)
  for (const special of SPECIALIZED_METRICS) {
    if (special.keywords.some(kw => normalized.includes(kw))) {
      return {
        metricId: special.rule.metricId,
        label: special.rule.label,
        isRanking: special.rule.isRanking,
        minRole: special.rule.minRole,
        defaultTopN: special.rule.defaultTopN,
      };
    }
  }

  // 2. Find matching rule in routing table
  const rule = NL_ROUTING_RULES.find(
    r => r.dimension === dimension && r.intentType === intent
  );
  
  if (rule) {
    return {
      metricId: rule.metricId,
      label: rule.label,
      isRanking: rule.isRanking,
      minRole: rule.minRole,
      defaultTopN: rule.defaultTopN,
    };
  }

  // 3. Fallback: try "valeur" intent for the dimension
  const valeurRule = NL_ROUTING_RULES.find(
    r => r.dimension === dimension && r.intentType === 'valeur'
  );
  
  if (valeurRule) {
    return {
      metricId: valeurRule.metricId,
      label: valeurRule.label,
      isRanking: valeurRule.isRanking,
      minRole: valeurRule.minRole,
      defaultTopN: valeurRule.defaultTopN,
    };
  }

  // 4. Ultimate fallback: CA global
  return {
    metricId: 'ca_global_ht',
    label: 'CA global HT',
    isRanking: false,
    minRole: 0,
  };
}

/**
 * Trouve les métriques candidates pour une requête ambiguë
 */
export function findAmbiguousCandidates(
  dimension: DimensionType,
  intent: IntentType,
  query: string
): RoutingRule[] {
  const normalized = normalizeQuery(query);
  const candidates: RoutingRule[] = [];
  
  // Check if multiple specialized metrics match
  const matchingSpecials = SPECIALIZED_METRICS.filter(
    s => s.keywords.some(kw => normalized.includes(kw))
  );
  
  if (matchingSpecials.length > 1) {
    return matchingSpecials.map(s => s.rule);
  }
  
  // Check if multiple dimension rules could apply
  const matchingRules = NL_ROUTING_RULES.filter(
    r => r.dimension === dimension && (r.intentType === intent || r.intentType === 'valeur')
  );
  
  if (matchingRules.length > 1 && intent !== 'valeur') {
    return matchingRules;
  }
  
  return candidates;
}

/**
 * Vérifie si l'utilisateur a accès à la métrique
 */
export function checkMetricAccess(userRoleLevel: number, minRole: number): boolean {
  return userRoleLevel >= minRole;
}

/**
 * Récupère le niveau de rôle depuis le globalRole
 */
export function getRoleLevel(globalRole: string | null | undefined): number {
  const ROLE_LEVELS: Record<string, number> = {
    'superadmin': 6,
    'platform_admin': 5,
    'franchisor_admin': 4,
    'franchisor_user': 3,
    'franchisee_admin': 2,
    'franchisee_user': 1,
    'base_user': 0,
  };
  
  if (!globalRole) return 0;
  return ROLE_LEVELS[globalRole] ?? 0;
}
