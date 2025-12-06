/**
 * Pipeline NL → Métrique StatIA
 * Parser déterministe avec extraction structurée
 */

import { 
  UNIVERS_ALIASES, 
  MOIS_MAPPING, 
  STATS_KEYWORDS,
  DIMENSION_KEYWORDS,
  INTENT_KEYWORDS,
  METRIC_ROUTING_MATRIX,
  SPECIALIZED_METRICS,
  DimensionType,
  IntentType,
  MetricRouting,
} from './nlDictionaries';

// ============= TYPES =============
export interface ParsedPeriod {
  start: Date;
  end: Date;
  label: string;
  isDefault: boolean;
}

export interface ParsedStatQuery {
  metricId: string;
  metricLabel: string;
  dimension: DimensionType;
  intentType: IntentType;
  univers?: string;
  period?: ParsedPeriod;
  topN?: number;
  technicienName?: string;
  confidence: number;
  minRole: number;
  isRanking: boolean;
  debug: {
    detectedDimension: string;
    detectedIntent: string;
    detectedUnivers: string | null;
    detectedPeriod: string | null;
    routingPath: string;
  };
}

// ============= CLASSIFICATION =============

/**
 * Détermine si la requête concerne des statistiques
 */
export function isStatsQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  return STATS_KEYWORDS.some(kw => normalized.includes(kw));
}

// ============= EXTRACTION ENTITÉS =============

/**
 * Extrait l'univers de la requête
 */
export function extractUnivers(query: string): string | undefined {
  const normalized = query.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  for (const [alias, univers] of Object.entries(UNIVERS_ALIASES)) {
    const normalizedAlias = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(normalizedAlias)) {
      return univers;
    }
  }
  return undefined;
}

/**
 * Extrait la période de la requête
 */
export function extractPeriode(query: string, now = new Date()): ParsedPeriod | undefined {
  const normalized = query.toLowerCase();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // "cette année"
  if (normalized.includes('cette année') || normalized.includes('cette annee')) {
    return {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
      label: `Année ${currentYear}`,
      isDefault: false,
    };
  }

  // "année dernière" / "l'année passée"
  if (normalized.includes('année dernière') || normalized.includes('annee derniere') || 
      normalized.includes('année passée') || normalized.includes("l'année dernière")) {
    return {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
      label: `Année ${currentYear - 1}`,
      isDefault: false,
    };
  }

  // "ce mois" / "ce mois-ci"
  if (normalized.includes('ce mois')) {
    return {
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentMonth + 1, 0),
      label: getMonthLabel(currentMonth, currentYear),
      isDefault: false,
    };
  }

  // "mois dernier"
  if (normalized.includes('mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    return {
      start: new Date(year, lastMonth, 1),
      end: new Date(year, lastMonth + 1, 0),
      label: getMonthLabel(lastMonth, year),
      isDefault: false,
    };
  }

  // "12 derniers mois"
  if (normalized.includes('12 derniers mois') || normalized.includes('douze derniers mois')) {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 12);
    start.setDate(1);
    return {
      start,
      end: new Date(currentYear, currentMonth + 1, 0),
      label: '12 derniers mois',
      isDefault: false,
    };
  }

  // "en [mois]", "au mois de [mois]", etc.
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    const patterns = [
      new RegExp(`en ${moisName}\\b`, 'i'),
      new RegExp(`mois de ${moisName}\\b`, 'i'),
      new RegExp(`mois d'${moisName}\\b`, 'i'),
      new RegExp(`au ${moisName}\\b`, 'i'),
      new RegExp(`\\b${moisName}\\s+\\d{4}\\b`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        const yearMatch = normalized.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        return {
          start: new Date(year, moisIndex, 1),
          end: new Date(year, moisIndex + 1, 0),
          label: getMonthLabel(moisIndex, year),
          isDefault: false,
        };
      }
    }
  }

  // Plage de mois "juin / juillet", "de juin à juillet"
  const rangePatterns = [
    /(?:de\s+)?(\w+)\s*(?:\/|à|a|-)\s*(\w+)/i,
    /(?:sur\s+)?(\w+)\s*(?:\/|et)\s*(\w+)/i,
  ];

  for (const pattern of rangePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const [, m1, m2] = match;
      const idx1 = MOIS_MAPPING[m1.toLowerCase()];
      const idx2 = MOIS_MAPPING[m2.toLowerCase()];

      if (idx1 !== undefined && idx2 !== undefined) {
        const yearMatch = normalized.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        return {
          start: new Date(year, idx1, 1),
          end: new Date(year, idx2 + 1, 0),
          label: `${getMonthName(idx1)} - ${getMonthName(idx2)} ${year}`,
          isDefault: false,
        };
      }
    }
  }

  return undefined;
}

/**
 * Extrait le nombre de résultats pour un classement (top N)
 */
export function extractTopN(query: string): number | undefined {
  const normalized = query.toLowerCase();
  
  // Patterns: "top 3", "3 meilleurs", "les 5 premiers"
  const patterns = [
    /top\s*(\d+)/i,
    /(\d+)\s*(?:meilleur|premier)/i,
    /les\s*(\d+)\s*(?:meilleur|premier)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n >= 1 && n <= 20) return n;
    }
  }

  // Default "meilleurs" sans nombre = 3
  if (normalized.includes('meilleur') || normalized.includes('top')) {
    return 3;
  }

  return undefined;
}

/**
 * Extrait un nom de technicien potentiel
 */
export function extractTechnicienName(query: string): string | undefined {
  const reservedWords = new Set([
    'ca', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre',
    'electricite', 'électricité', 'plomberie', 'serrurerie', 'vitrerie',
    'volet', 'volets', 'top', 'meilleur', 'technicien', 'tech',
    'apporteur', 'univers', 'dossier', 'combien', 'moyenne',
  ]);

  const words = query.split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (
      cleanWord.length > 2 &&
      cleanWord[0] === cleanWord[0].toUpperCase() &&
      !reservedWords.has(cleanWord.toLowerCase())
    ) {
      return cleanWord;
    }
  }

  return undefined;
}

// ============= DÉTECTION DIMENSION & INTENT =============

function detectDimension(query: string): DimensionType {
  const normalized = query.toLowerCase();

  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return dimension as DimensionType;
    }
  }

  // Fallback: si un univers est détecté → dimension univers
  if (extractUnivers(query)) {
    return 'univers';
  }

  return 'global';
}

function detectIntent(query: string): IntentType {
  const normalized = query.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return intent as IntentType;
    }
  }

  return 'valeur';
}

// ============= ROUTING MÉTRIQUE =============

function routeToMetric(
  dimension: DimensionType,
  intent: IntentType,
  query: string
): MetricRouting {
  // D'abord, vérifier les métriques spécialisées
  const normalized = query.toLowerCase();
  for (const special of SPECIALIZED_METRICS) {
    if (special.keywords.some(kw => normalized.includes(kw))) {
      return special.metric;
    }
  }

  // Routing matriciel
  const dimensionRoutes = METRIC_ROUTING_MATRIX[dimension];
  if (dimensionRoutes && dimensionRoutes[intent]) {
    return dimensionRoutes[intent];
  }

  // Fallback vers "valeur" de la dimension
  if (dimensionRoutes && dimensionRoutes['valeur']) {
    return dimensionRoutes['valeur'];
  }

  // Fallback ultime: CA global
  return {
    metricId: 'ca_global_ht',
    label: 'CA global HT',
    isRanking: false,
    minRole: 0,
  };
}

// ============= PARSER PRINCIPAL =============

/**
 * Parse une requête NL et retourne la métrique StatIA correspondante
 */
export function parseStatQuery(query: string, now = new Date()): ParsedStatQuery | null {
  if (!isStatsQuery(query)) {
    return null;
  }

  const dimension = detectDimension(query);
  const intent = detectIntent(query);
  const univers = extractUnivers(query);
  let period = extractPeriode(query, now);
  const topN = extractTopN(query);
  const technicienName = extractTechnicienName(query);

  // Routing vers la métrique
  const routing = routeToMetric(dimension, intent, query);

  // Période par défaut pour les rankings sans période spécifiée
  if (routing.isRanking && !period) {
    period = {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31),
      label: `Année ${now.getFullYear()}`,
      isDefault: true,
    };
  }

  // Calculer la confiance
  let confidence = 0.5;
  if (univers) confidence += 0.15;
  if (period && !period.isDefault) confidence += 0.2;
  if (topN) confidence += 0.1;
  if (dimension !== 'global') confidence += 0.05;

  return {
    metricId: routing.metricId,
    metricLabel: routing.label,
    dimension,
    intentType: intent,
    univers,
    period,
    topN: topN || routing.defaultTopN,
    technicienName,
    confidence: Math.min(confidence, 1),
    minRole: routing.minRole,
    isRanking: routing.isRanking,
    debug: {
      detectedDimension: dimension,
      detectedIntent: intent,
      detectedUnivers: univers || null,
      detectedPeriod: period ? period.label : null,
      routingPath: `${dimension}.${intent} → ${routing.metricId}`,
    },
  };
}

/**
 * Génère une période par défaut (12 derniers mois)
 */
export function getDefaultPeriod(now = new Date()): ParsedPeriod {
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);

  return {
    start,
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    label: '12 derniers mois',
    isDefault: true,
  };
}

// ============= HELPERS =============

function getMonthName(monthIndex: number): string {
  const names = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return names[monthIndex] || '';
}

function getMonthLabel(monthIndex: number, year: number): string {
  return `${getMonthName(monthIndex)} ${year}`;
}

// Export de compatibilité
export { isStatsQuery as detectStatsIntent };
