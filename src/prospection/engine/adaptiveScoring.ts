/**
 * Adaptive Scoring Engine
 * 
 * Calcule un score 0-100 pour chaque apporteur basé sur SES PROPRES
 * moyennes historiques vs tendance récente (2-3 derniers mois).
 * Aucun seuil fixe global : tout est relatif à l'activité de l'apporteur.
 */

export interface MetricVariation {
  avg: number;
  recent: number;
  variationPct: number;
}

export type ScoreLevel = 'danger' | 'warning' | 'stable' | 'positive' | 'excellent';

export interface AdaptiveScore {
  score: number;              // 0-100
  level: ScoreLevel;
  label: string;              // "En forte baisse", "En baisse", "Stable", "En hausse", "En forte hausse"
  metrics: {
    ca: MetricVariation;
    dossiers: MetricVariation;
    devis: MetricVariation;
    factures: MetricVariation;
    tauxTransfo: { avg: number | null; recent: number | null; variationPct: number | null };
  };
  alerts: string[];
}

export interface MonthlyTrendEntry {
  month: string;
  dossiers: number;
  ca_ht: number;
  devis_total?: number;
  devis_signed?: number;
  factures?: number;
  taux_transfo: number | null;
}

export const RECENT_MONTHS_OPTIONS = [1, 3] as const;
export type RecentMonthsOption = typeof RECENT_MONTHS_OPTIONS[number];

const DEFAULT_RECENT_MONTHS = 3;
const MIN_HISTORY_MONTHS = 3; // besoin d'au moins 3 mois pour comparer

// Pondérations
const WEIGHTS = {
  ca: 0.40,
  dossiers: 0.25,
  tauxTransfo: 0.20,
  factures: 0.15,
};

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function variationPct(recent: number, historical: number): number {
  if (historical === 0) return recent > 0 ? 100 : 0;
  return ((recent - historical) / historical) * 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function scoreLevel(score: number): ScoreLevel {
  if (score < 30) return 'danger';
  if (score < 42) return 'warning';
  if (score <= 58) return 'stable';
  if (score <= 72) return 'positive';
  return 'excellent';
}

function scoreLabel(level: ScoreLevel): string {
  const map: Record<ScoreLevel, string> = {
    danger: 'En forte baisse',
    warning: 'En baisse',
    stable: 'Stable',
    positive: 'En hausse',
    excellent: 'En forte hausse',
  };
  return map[level];
}

/**
 * Calcule le score adaptatif d'un apporteur.
 * @param monthlyTrendFull - TOUS les mois disponibles (pas filtré par période UI)
 */
export function computeAdaptiveScore(monthlyTrendFull: MonthlyTrendEntry[], recentMonths: RecentMonthsOption = DEFAULT_RECENT_MONTHS): AdaptiveScore | null {
  if (monthlyTrendFull.length < MIN_HISTORY_MONTHS) return null;

  // Trier chronologiquement
  const sorted = [...monthlyTrendFull].sort((a, b) => a.month.localeCompare(b.month));

  const recentSlice = sorted.slice(-recentMonths);
  const historicalSlice = sorted.slice(0, -recentMonths);

  if (historicalSlice.length < 1) return null;

  // Moyennes historiques
  const avgCA = avg(historicalSlice.map(m => m.ca_ht));
  const avgDossiers = avg(historicalSlice.map(m => m.dossiers));
  const avgFactures = avg(historicalSlice.map(m => m.factures ?? 0));
  const historicalTransfo = historicalSlice
    .map(m => m.taux_transfo)
    .filter((v): v is number => v !== null && v !== undefined);
  const avgTransfo = historicalTransfo.length > 0 ? avg(historicalTransfo) : null;

  // Moyennes récentes
  const recentCA = avg(recentSlice.map(m => m.ca_ht));
  const recentDossiers = avg(recentSlice.map(m => m.dossiers));
  const recentFactures = avg(recentSlice.map(m => m.factures ?? 0));
  const recentTransfoArr = recentSlice
    .map(m => m.taux_transfo)
    .filter((v): v is number => v !== null && v !== undefined);
  const recentTransfo = recentTransfoArr.length > 0 ? avg(recentTransfoArr) : null;

  // Variations %
  const varCA = variationPct(recentCA, avgCA);
  const varDossiers = variationPct(recentDossiers, avgDossiers);
  const varFactures = variationPct(recentFactures, avgFactures);
  const varTransfo = avgTransfo !== null && recentTransfo !== null
    ? variationPct(recentTransfo, avgTransfo)
    : null;

  // Score composite : 50 (neutre) + ajustements pondérés
  // On normalise : chaque variation % est divisée par 50 pour avoir un facteur raisonnable
  // puis multiplié par le poids et par 50 (demi-échelle)
  const normalize = (v: number) => clamp(v / 50, -1, 1); // -1 à +1

  let weightedSum = 0;
  let totalWeight = 0;

  weightedSum += normalize(varCA) * WEIGHTS.ca;
  totalWeight += WEIGHTS.ca;

  weightedSum += normalize(varDossiers) * WEIGHTS.dossiers;
  totalWeight += WEIGHTS.dossiers;

  weightedSum += normalize(varFactures) * WEIGHTS.factures;
  totalWeight += WEIGHTS.factures;

  if (varTransfo !== null) {
    weightedSum += normalize(varTransfo) * WEIGHTS.tauxTransfo;
    totalWeight += WEIGHTS.tauxTransfo;
  }

  // Normaliser si on n'a pas toutes les métriques
  const normalizedSum = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Score final : 50 + normalizedSum * 50 → range [0, 100]
  const score = clamp(Math.round(50 + normalizedSum * 50), 0, 100);

  const level = scoreLevel(score);
  const label = scoreLabel(level);

  // Alertes contextuelles
  const alerts: string[] = [];
  if (varCA < -15) {
    alerts.push(`CA en baisse de ${Math.abs(Math.round(varCA))}% vs moyenne historique (${formatEuro(recentCA)}/mois vs ${formatEuro(avgCA)}/mois)`);
  } else if (varCA > 20) {
    alerts.push(`CA en hausse de ${Math.round(varCA)}% vs moyenne historique (${formatEuro(recentCA)}/mois vs ${formatEuro(avgCA)}/mois)`);
  }

  if (varDossiers < -20) {
    alerts.push(`Volume de dossiers en baisse de ${Math.abs(Math.round(varDossiers))}% (${recentDossiers.toFixed(1)}/mois vs ${avgDossiers.toFixed(1)}/mois)`);
  } else if (varDossiers > 25) {
    alerts.push(`Volume de dossiers en hausse de ${Math.round(varDossiers)}% (${recentDossiers.toFixed(1)}/mois vs ${avgDossiers.toFixed(1)}/mois)`);
  }

  if (varTransfo !== null) {
    if (varTransfo < -15) {
      alerts.push(`Taux de transformation en baisse de ${Math.abs(Math.round(varTransfo))}%`);
    } else if (varTransfo > 15) {
      alerts.push(`Taux de transformation en amélioration de ${Math.round(varTransfo)}%`);
    }
  }

  // Détection de tendance baissière consécutive (3 mois de suite en baisse CA)
  if (recentSlice.length >= 3) {
    const caValues = recentSlice.map(m => m.ca_ht);
    const isDecreasing = caValues.every((v, i) => i === 0 || v <= caValues[i - 1]);
    if (isDecreasing && caValues[0] > 0) {
      alerts.push('CA en baisse constante sur les 3 derniers mois consécutifs');
    }
  }

  return {
    score,
    level,
    label,
    metrics: {
      ca: { avg: Math.round(avgCA), recent: Math.round(recentCA), variationPct: Math.round(varCA * 10) / 10 },
      dossiers: { avg: Math.round(avgDossiers * 10) / 10, recent: Math.round(recentDossiers * 10) / 10, variationPct: Math.round(varDossiers * 10) / 10 },
      devis: { avg: 0, recent: 0, variationPct: 0 }, // populated below
      factures: { avg: Math.round(avgFactures * 10) / 10, recent: Math.round(recentFactures * 10) / 10, variationPct: Math.round(varFactures * 10) / 10 },
      tauxTransfo: {
        avg: avgTransfo !== null ? Math.round(avgTransfo * 10) / 10 : null,
        recent: recentTransfo !== null ? Math.round(recentTransfo * 10) / 10 : null,
        variationPct: varTransfo !== null ? Math.round(varTransfo * 10) / 10 : null,
      },
    },
    alerts,
  };
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}
