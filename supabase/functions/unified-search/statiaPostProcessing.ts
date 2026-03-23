/**
 * StatIA Post-Processing Module
 * Fonctions de post-traitement pour les résultats StatIA
 */

import type { RankingItem, StatResult } from './statiaService.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type PostProcessingType = 
  | 'top_1'
  | 'top_3'
  | 'top_5'
  | 'top_10'
  | 'tableau'
  | 'raw_value'
  | 'pourcentage'
  | 'timeseries';

export interface PostProcessedResult {
  type: PostProcessingType;
  value: number;
  unit: string;
  topItem?: RankingItem;
  ranking?: RankingItem[];
  displayText: string;
  hasData: boolean;
}

// ═══════════════════════════════════════════════════════════════
// POST-PROCESSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait le top 1 d'un résultat de ranking
 */
export function top1FromResult(result: StatResult, entityType: string = 'entité'): PostProcessedResult {
  const ranking = result.ranking || [];
  const topItem = ranking[0] || result.topItem;
  
  if (!topItem || topItem.value === 0) {
    return {
      type: 'top_1',
      value: 0,
      unit: result.unit,
      hasData: false,
      displayText: `Aucun ${entityType} avec des données pour cette période.`
    };
  }
  
  return {
    type: 'top_1',
    value: topItem.value,
    unit: result.unit,
    topItem,
    hasData: true,
    displayText: `${topItem.name} avec ${formatValue(topItem.value, result.unit)}`
  };
}

/**
 * Extrait le top 3 d'un résultat de ranking
 */
export function top3FromResult(result: StatResult, entityType: string = 'entité'): PostProcessedResult {
  const ranking = result.ranking || [];
  const top3 = ranking.slice(0, 3);
  
  if (top3.length === 0) {
    return {
      type: 'top_3',
      value: 0,
      unit: result.unit,
      ranking: [],
      hasData: false,
      displayText: `Aucun ${entityType} avec des données pour cette période.`
    };
  }
  
  const displayLines = top3.map((item, idx) => 
    `${idx + 1}. ${item.name}: ${formatValue(item.value, result.unit)}`
  );
  
  return {
    type: 'top_3',
    value: top3.reduce((sum, item) => sum + item.value, 0),
    unit: result.unit,
    topItem: top3[0],
    ranking: top3,
    hasData: true,
    displayText: displayLines.join('\n')
  };
}

/**
 * Extrait le top 5 d'un résultat de ranking
 */
export function top5FromResult(result: StatResult, entityType: string = 'entité'): PostProcessedResult {
  const ranking = result.ranking || [];
  const top5 = ranking.slice(0, 5);
  
  if (top5.length === 0) {
    return {
      type: 'top_5',
      value: 0,
      unit: result.unit,
      ranking: [],
      hasData: false,
      displayText: `Aucun ${entityType} avec des données pour cette période.`
    };
  }
  
  const displayLines = top5.map((item, idx) => 
    `${idx + 1}. ${item.name}: ${formatValue(item.value, result.unit)}`
  );
  
  return {
    type: 'top_5',
    value: top5.reduce((sum, item) => sum + item.value, 0),
    unit: result.unit,
    topItem: top5[0],
    ranking: top5,
    hasData: true,
    displayText: displayLines.join('\n')
  };
}

/**
 * Retourne le ranking complet sous forme de tableau
 */
export function tableauFromResult(result: StatResult, entityType: string = 'entité'): PostProcessedResult {
  const ranking = result.ranking || [];
  
  if (ranking.length === 0) {
    return {
      type: 'tableau',
      value: result.value,
      unit: result.unit,
      ranking: [],
      hasData: result.hasData !== false,
      displayText: `Aucun ${entityType} avec des données pour cette période.`
    };
  }
  
  return {
    type: 'tableau',
    value: result.value,
    unit: result.unit,
    ranking,
    hasData: true,
    displayText: `${ranking.length} ${entityType}(s) trouvé(s)`
  };
}

/**
 * Retourne une valeur brute (pas de ranking)
 */
export function rawValueFromResult(result: StatResult): PostProcessedResult {
  const rawValue = typeof result.value === 'number' ? result.value : Number(result.value ?? 0);
  const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
  const hasUsableData = result.hasData !== false && result.value !== null && result.value !== undefined && Number.isFinite(rawValue);

  return {
    type: 'raw_value',
    value: safeValue,
    unit: result.unit,
    hasData: hasUsableData,
    displayText: hasUsableData ? formatValue(safeValue, result.unit) : 'Aucune donnée exploitable pour cette période.'
  };
}

/**
 * Formate un pourcentage
 */
export function pourcentageFromResult(result: StatResult): PostProcessedResult {
  const value = result.value;
  return {
    type: 'pourcentage',
    value,
    unit: '%',
    hasData: result.hasData !== false,
    displayText: `${value.toFixed(1)}%`
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) return 'Aucune donnée exploitable';
  if (unit === '€') {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === 'jours') {
    return `${value.toFixed(1)} jours`;
  }
  return `${value}${unit ? ' ' + unit : ''}`;
}

/**
 * Applique le post-processing approprié selon le type demandé
 */
export function applyPostProcessing(
  result: StatResult, 
  processingType: PostProcessingType,
  entityType: string = 'entité'
): PostProcessedResult {
  switch (processingType) {
    case 'top_1':
      return top1FromResult(result, entityType);
    case 'top_3':
      return top3FromResult(result, entityType);
    case 'top_5':
      return top5FromResult(result, entityType);
    case 'top_10':
      const ranking = result.ranking?.slice(0, 10) || [];
      return { ...tableauFromResult({ ...result, ranking }, entityType), type: 'top_10' };
    case 'tableau':
      return tableauFromResult(result, entityType);
    case 'pourcentage':
      return pourcentageFromResult(result);
    case 'raw_value':
    default:
      return rawValueFromResult(result);
  }
}

/**
 * Détermine automatiquement le type de post-processing optimal
 */
export function inferPostProcessingType(metricId: string, isTopQuery: boolean): PostProcessingType {
  const rankingMetrics = new Set([
    'ca_par_technicien', 'ca_par_apporteur', 'ca_par_univers',
    'top_techniciens_ca', 'top_apporteurs_ca',
    'sav_par_univers', 'sav_par_apporteur',
    'nb_dossiers_par_univers', 'dossiers_par_apporteur'
  ]);
  
  const percentageMetrics = new Set([
    'taux_sav_global', 'taux_transformation_devis', 'taux_recouvrement'
  ]);
  
  if (isTopQuery && rankingMetrics.has(metricId)) {
    return 'top_1';
  }
  
  if (percentageMetrics.has(metricId)) {
    return 'pourcentage';
  }
  
  if (rankingMetrics.has(metricId)) {
    return 'tableau';
  }
  
  return 'raw_value';
}

/**
 * Détermine l'entity type pour le display text
 */
export function getEntityTypeForMetric(metricId: string): string {
  if (metricId.includes('technicien') || metricId.includes('tech')) return 'technicien';
  if (metricId.includes('apporteur')) return 'apporteur';
  if (metricId.includes('univers')) return 'univers';
  return 'entité';
}
