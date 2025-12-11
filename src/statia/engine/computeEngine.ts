/**
 * STATiA-BY-BIJ - Moteur de calcul de métriques
 * 
 * Ce module exécute les calculs définis dans metrics_definitions.
 * Il supporte le routage automatique frontend/edge selon la complexité.
 */

import { 
  MetricDefinition, 
  MetricParams, 
  MetricResult, 
  FormulaDefinition,
  FilterCondition,
  ComputeComplexity,
  InputSource,
  ApogeeSourceName,
  MetricError
} from '../types';
import { validateMetricDefinition, getSchemaRelations, APOGEE_SCHEMA } from '../schema/apogeeSchemaV2';
import { apogeeProxy } from '@/services/apogeeProxy';

/**
 * Trouve les clés de jointure entre deux sources via le schema
 */
function getJoinKeys(source: ApogeeSourceName, target: ApogeeSourceName): { localKey: string; foreignKey: string } | null {
  const endpoint = APOGEE_SCHEMA[source];
  if (!endpoint) return null;
  
  const join = endpoint.joins.find(j => j.target === target);
  if (join) {
    return { localKey: join.localField, foreignKey: join.remoteField };
  }
  
  // Tenter la jointure inverse
  const targetEndpoint = APOGEE_SCHEMA[target];
  const reverseJoin = targetEndpoint?.joins.find(j => j.target === source);
  if (reverseJoin) {
    return { localKey: reverseJoin.remoteField, foreignKey: reverseJoin.localField };
  }
  
  return null;
}
import { parseISO, parse, isWithinInterval, differenceInMinutes } from 'date-fns';

// ============================================
// CALCUL DE COMPLEXITÉ POUR ROUTAGE
// ============================================

const COMPLEXITY_THRESHOLDS = {
  FRONTEND_MAX: 40, // en dessous = frontend
  EDGE_MIN: 41,     // au dessus = edge
};

/**
 * Évalue la complexité d'un calcul de métrique
 */
export function evaluateComplexity(metric: MetricDefinition, params: MetricParams): ComputeComplexity {
  const factors = {
    multiAgency: !!(params.agency_slugs && params.agency_slugs.length > 1),
    multiSource: metric.input_sources.length > 1,
    heavyJoins: metric.input_sources.some(s => s.joinOn),
    largeTimeRange: isLargeTimeRange(params.date_from, params.date_to),
    complexGroupBy: (metric.formula.groupBy?.length ?? 0) > 1,
  };

  let score = 0;
  if (factors.multiAgency) score += 35;
  if (factors.multiSource) score += 15;
  if (factors.heavyJoins) score += 20;
  if (factors.largeTimeRange) score += 15;
  if (factors.complexGroupBy) score += 15;

  return { score, factors };
}

function isLargeTimeRange(from?: Date, to?: Date): boolean {
  if (!from || !to) return false;
  const days = Math.abs((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return days > 90;
}

/**
 * Détermine si le calcul doit être exécuté en frontend ou edge
 */
export function determineExecutionTarget(
  metric: MetricDefinition, 
  params: MetricParams
): 'frontend' | 'edge' {
  if (metric.compute_hint !== 'auto') {
    return metric.compute_hint as 'frontend' | 'edge';
  }
  
  const complexity = evaluateComplexity(metric, params);
  return complexity.score <= COMPLEXITY_THRESHOLDS.FRONTEND_MAX ? 'frontend' : 'edge';
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

interface LoadedData {
  [source: string]: any[];
}

/**
 * Charge les données depuis les sources Apogée
 */
export interface LoadDebugInfo {
  apiUrl: string;
  apiKeyPresent: boolean;
  rawCounts: Record<string, number>;
  filteredCounts: Record<string, number>;
  appliedFilters: Record<string, any[]>;
  aggregationStats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
    numeratorCount?: number;
    denominatorCount?: number;
  };
}

export async function loadSourceData(
  sources: InputSource[],
  params: MetricParams
): Promise<{ data: LoadedData; debug: LoadDebugInfo }> {
  const result: LoadedData = {};
  const debug: LoadDebugInfo = {
    apiUrl: '',
    apiKeyPresent: true, // API key is now managed server-side via proxy
    rawCounts: {},
    filteredCounts: {},
    appliedFilters: {},
  };
  
  // Charger les données via proxy sécurisé
  if (!params.agency_slug) {
    throw new Error('agency_slug is required for metric computation');
  }
  
  debug.apiUrl = `proxy-apogee (agency: ${params.agency_slug})`;
  
  // Charger toutes les données via proxy sécurisé
  const allData = await apogeeProxy.getAllData(params.agency_slug);
  
  // Mapper les sources
  const sourceMapping: Record<ApogeeSourceName, keyof typeof allData> = {
    interventions: 'interventions',
    projects: 'projects',
    factures: 'factures',
    devis: 'devis',
    users: 'users',
    clients: 'clients',
  };

  for (const source of sources) {
    const dataKey = sourceMapping[source.source];
    let data = allData[dataKey] || [];
    
    debug.rawCounts[source.source] = data.length;
    debug.appliedFilters[source.source] = source.filters || [];
    
    // Appliquer les filtres au niveau source
    if (source.filters && source.filters.length > 0) {
      data = applyFilters(data, source.filters);
    }
    
    debug.filteredCounts[source.source] = data.length;
    result[source.alias || source.source] = data;
  }

  return { data: result, debug };
}

// ============================================
// APPLICATION DES FILTRES
// ============================================

/**
 * Applique des filtres sur un dataset
 */
export function applyFilters(data: any[], filters: FilterCondition[]): any[] {
  return data.filter(item => {
    return filters.every(filter => {
      const value = getNestedValue(item, filter.field);
      return evaluateCondition(value, filter.operator, filter.value);
    });
  });
}

function getNestedValue(obj: any, path: string): any {
  // Gestion des fallbacks pour les champs monétaires courants
  const monetaryFallbacks: Record<string, string[]> = {
    'data.totalHT': ['data.totalHT', 'totalHT', 'data.montantHT', 'montantHT'],
    'data.totalTTC': ['data.totalTTC', 'totalTTC', 'data.montantTTC', 'montantTTC'],
    'totalHT': ['totalHT', 'data.totalHT', 'montantHT', 'data.montantHT'],
  };
  
  const fallbacks = monetaryFallbacks[path];
  if (fallbacks) {
    for (const fallbackPath of fallbacks) {
      const value = fallbackPath.split('.').reduce((current, key) => current?.[key], obj);
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
  
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function evaluateCondition(value: any, operator: FilterCondition['operator'], target: any): boolean {
  switch (operator) {
    case 'eq': return value === target;
    case 'neq': return value !== target;
    case 'gt': return value > target;
    case 'gte': return value >= target;
    case 'lt': return value < target;
    case 'lte': return value <= target;
    case 'in': return Array.isArray(target) && target.includes(value);
    case 'not_in': return Array.isArray(target) && !target.includes(value);
    case 'contains': return String(value).toLowerCase().includes(String(target).toLowerCase());
    case 'exists': return value !== null && value !== undefined;
    default: return true;
  }
}

// ============================================
// JOINTURES
// ============================================

/**
 * Effectue une jointure entre deux datasets
 */
export function joinDatasets(
  primary: any[],
  secondary: any[],
  localKey: string,
  foreignKey: string
): any[] {
  const secondaryIndex = new Map<any, any>();
  for (const item of secondary) {
    const key = getNestedValue(item, foreignKey);
    secondaryIndex.set(key, item);
  }

  return primary.map(item => {
    const joinKey = getNestedValue(item, localKey);
    const joined = secondaryIndex.get(joinKey);
    return { ...item, _joined: joined };
  });
}

// ============================================
// AGRÉGATIONS
// ============================================

interface AggregationResult {
  value: number;
  breakdown?: Record<string, number>;
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
    numeratorCount?: number;
    denominatorCount?: number;
  };
}

/**
 * Exécute une agrégation sur un dataset
 */
export function executeAggregation(
  data: any[],
  formula: FormulaDefinition,
  params: MetricParams
): AggregationResult {
  // Appliquer les filtres de la formule
  let filteredData = data;
  if (formula.filters) {
    filteredData = applyFilters(data, formula.filters);
  }

  // Appliquer les filtres de période
  if (params.date_from || params.date_to) {
    filteredData = filterByDateRange(filteredData, params.date_from, params.date_to);
  }

  // Calculer les stats de base pour debug
  const stats = calculateDebugStats(filteredData, formula);

  // Si groupBy, calculer par groupe
  if (formula.groupBy && formula.groupBy.length > 0) {
    const result = aggregateWithGroupBy(filteredData, formula);
    return { ...result, stats };
  }

  // Sinon, calculer la valeur globale
  const value = calculateAggregation(filteredData, formula, stats);
  return { value, stats };
}

/**
 * Calcule les statistiques de debug pour un dataset
 */
function calculateDebugStats(data: any[], formula: FormulaDefinition): AggregationResult['stats'] {
  const stats: AggregationResult['stats'] = {
    count: data.length,
  };

  const field = formula.field;
  if (field && (formula.type === 'sum' || formula.type === 'avg' || formula.type === 'min' || formula.type === 'max')) {
    const values = data
      .map(item => parseFloat(getNestedValue(item, field)) || 0)
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
      stats.sum = values.reduce((a, b) => a + b, 0);
      stats.avg = stats.sum / values.length;
    }
  }

  // Stats pour ratio
  if (formula.type === 'ratio' && formula.numerator && formula.denominator) {
    // Calculer les counts du numérateur et dénominateur
    if (formula.numerator.filters) {
      const numeratorData = applyFilters(data, formula.numerator.filters);
      stats.numeratorCount = formula.numerator.type === 'count' 
        ? numeratorData.length 
        : numeratorData.reduce((s, item) => s + (parseFloat(getNestedValue(item, formula.numerator!.field || '')) || 0), 0);
    } else {
      stats.numeratorCount = data.length;
    }
    
    if (formula.denominator.filters) {
      const denominatorData = applyFilters(data, formula.denominator.filters);
      stats.denominatorCount = formula.denominator.type === 'count'
        ? denominatorData.length
        : denominatorData.reduce((s, item) => s + (parseFloat(getNestedValue(item, formula.denominator!.field || '')) || 0), 0);
    } else {
      stats.denominatorCount = data.length;
    }
  }

  return stats;
}

function filterByDateRange(data: any[], from?: Date, to?: Date): any[] {
  if (!from && !to) return data;
  
  return data.filter(item => {
    const dateStr = item.date || item.dateReelle || item.dateEmission || item.created_at;
    const itemDate = parseDate(dateStr);
    if (!itemDate) return true;
    
    if (from && to) {
      return isWithinInterval(itemDate, { start: from, end: to });
    }
    if (from) return itemDate >= from;
    if (to) return itemDate <= to;
    return true;
  });
}

function parseDate(value: string): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  try {
    const d = parse(value, 'dd/MM/yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
}

function aggregateWithGroupBy(data: any[], formula: FormulaDefinition): AggregationResult {
  const groups = new Map<string, any[]>();
  
  for (const item of data) {
    const groupKey = formula.groupBy!
      .map(field => getNestedValue(item, field) ?? 'unknown')
      .join('|');
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }

  const breakdown: Record<string, number> = {};
  let total = 0;
  
  for (const [key, groupData] of groups) {
    const groupFormula = { ...formula, groupBy: undefined };
    const value = calculateAggregation(groupData, groupFormula);
    breakdown[key] = value;
    total += value;
  }

  // Pour avg avec groupBy, on fait la moyenne des groupes
  const finalValue = formula.type === 'avg' 
    ? total / groups.size 
    : total;

  return { value: finalValue, breakdown };
}

function calculateAggregation(data: any[], formula: FormulaDefinition, stats?: AggregationResult['stats']): number {
  const { type, field } = formula;

  switch (type) {
    case 'count':
      return data.length;

    case 'distinct_count':
      if (!field) return 0;
      const uniqueValues = new Set(data.map(item => getNestedValue(item, field)));
      return uniqueValues.size;

    case 'sum':
      if (!field) return 0;
      return stats?.sum ?? data.reduce((sum, item) => {
        const val = parseFloat(getNestedValue(item, field)) || 0;
        return sum + val;
      }, 0);

    case 'avg':
      if (!field || data.length === 0) return 0;
      return stats?.avg ?? (() => {
        const total = data.reduce((sum, item) => {
          const val = parseFloat(getNestedValue(item, field)) || 0;
          return sum + val;
        }, 0);
        return total / data.length;
      })();

    case 'min':
      if (!field || data.length === 0) return 0;
      return stats?.min ?? Math.min(...data.map(item => parseFloat(getNestedValue(item, field)) || Infinity));

    case 'max':
      if (!field || data.length === 0) return 0;
      return stats?.max ?? Math.max(...data.map(item => parseFloat(getNestedValue(item, field)) || -Infinity));

    case 'ratio':
      if (!formula.numerator || !formula.denominator) return 0;
      const num = calculateAggregation(data, formula.numerator);
      const den = calculateAggregation(data, formula.denominator);
      return den > 0 ? (num / den) * 100 : 0;

    default:
      return 0;
  }
}

// ============================================
// EXÉCUTION PRINCIPALE
// ============================================

/**
 * Valide une métrique contre le schema Apogée
 */
export function validateMetric(metric: MetricDefinition): { valid: boolean; errors: string[] } {
  return validateMetricDefinition(metric);
}

/**
 * Exécute le calcul complet d'une métrique
 */
export async function computeMetric(
  metric: MetricDefinition,
  params: MetricParams
): Promise<MetricResult> {
  const startTime = Date.now();
  
  // Validation contre le schema
  const validation = validateMetricDefinition(metric);
  if (!validation.valid) {
    throw new Error(`Metric validation failed: ${validation.errors.join(', ')}`);
  }
  
  // Charger les données sources avec debug
  const { data: loadedData, debug: loadDebug } = await loadSourceData(metric.input_sources, params);
  
  // Préparer le dataset principal
  let primarySource = metric.input_sources[0];
  let dataset = loadedData[primarySource.alias || primarySource.source] || [];
  
  // Appliquer les jointures si nécessaire
  for (let i = 1; i < metric.input_sources.length; i++) {
    const source = metric.input_sources[i];
    const secondaryData = loadedData[source.alias || source.source] || [];
    
    if (source.joinOn) {
      const joinKeys = getJoinKeys(
        primarySource.source,
        source.source
      );
      
      if (joinKeys) {
        dataset = joinDatasets(
          dataset,
          secondaryData,
          joinKeys.localKey,
          joinKeys.foreignKey
        );
      }
    }
  }
  
  // Exécuter l'agrégation
  const result = executeAggregation(dataset, metric.formula, params);
  
  // Appliquer la transformation si définie
  let finalValue = result.value;
  if (metric.formula.transform) {
    finalValue = applyTransform(finalValue, metric.formula.transform);
  }
  
  // Enrichir le debug avec les stats d'agrégation
  const enrichedDebug = {
    ...loadDebug,
    aggregationStats: result.stats,
  };
  
  return {
    value: finalValue,
    breakdown: result.breakdown,
    metadata: {
      computed_at: new Date().toISOString(),
      cache_hit: false,
      compute_time_ms: Date.now() - startTime,
      data_points: dataset.length,
    },
    _loadDebug: enrichedDebug,
  };
}

function applyTransform(value: number, transform: FormulaDefinition['transform']): number {
  switch (transform) {
    case 'abs': return Math.abs(value);
    case 'round': return Math.round(value);
    case 'floor': return Math.floor(value);
    case 'ceil': return Math.ceil(value);
    default: return value;
  }
}
