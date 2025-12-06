/**
 * NL Metric Scorer - Scoring des métriques par signature
 * 
 * Algorithme de scoring basé sur:
 * - Topic match
 * - Intent match
 * - Dimension match
 * - Feature alignment (bonus/malus)
 * - Required features check
 */

import { type ExtractedIntent, type IntentType, type DimensionType, type TopicType, type ExtractedFeatures } from './nlIntentExtractor.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MetricSignature {
  id: string;
  label: string;
  topic: TopicType;
  dimensions: DimensionType[];
  supportedIntents: IntentType[];
  isAverage: boolean;
  isRanking: boolean;
  isRate: boolean;
  isDelay: boolean;
  requiredFeatures?: (keyof ExtractedFeatures)[];
  unit: string;
  minRole: number;
}

export interface MetricScore {
  metric: MetricSignature;
  score: number;
  reasons: string[];
}

// ═══════════════════════════════════════════════════════════════
// METRICS REGISTRY V3 - Signatures enrichies
// ═══════════════════════════════════════════════════════════════

export const METRICS_SIGNATURES: MetricSignature[] = [
  // ─────────────────────────────────────────────────────────────
  // CA
  // ─────────────────────────────────────────────────────────────
  {
    id: 'ca_global_ht',
    label: 'CA Global HT',
    topic: 'ca',
    dimensions: ['global'],
    supportedIntents: ['valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },
  {
    id: 'ca_moyen_par_jour',
    label: 'CA Moyen par Jour',
    topic: 'ca',
    dimensions: ['global'],
    supportedIntents: ['moyenne'],
    isAverage: true,
    isRanking: false,
    isRate: false,
    isDelay: false,
    requiredFeatures: ['mentionsMoyenne'], // OBLIGATOIRE
    unit: '€/jour',
    minRole: 2,
  },
  {
    id: 'ca_par_technicien',
    label: 'CA par Technicien',
    topic: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['valeur', 'top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },
  {
    id: 'top_techniciens_ca',
    label: 'Top Techniciens CA',
    topic: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    requiredFeatures: ['mentionsClassement'],
    unit: '€',
    minRole: 2,
  },
  {
    id: 'ca_moyen_par_tech',
    label: 'CA Moyen par Technicien',
    topic: 'ca',
    dimensions: ['technicien'],
    supportedIntents: ['moyenne'],
    isAverage: true,
    isRanking: false,
    isRate: false,
    isDelay: false,
    requiredFeatures: ['mentionsMoyenne'],
    unit: '€',
    minRole: 2,
  },
  {
    id: 'ca_par_univers',
    label: 'CA par Univers',
    topic: 'ca',
    dimensions: ['univers'],
    supportedIntents: ['valeur', 'top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },
  {
    id: 'ca_par_apporteur',
    label: 'CA par Apporteur',
    topic: 'ca',
    dimensions: ['apporteur'],
    supportedIntents: ['valeur', 'top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },
  {
    id: 'panier_moyen',
    label: 'Panier Moyen',
    topic: 'ca',
    dimensions: ['global'],
    supportedIntents: ['moyenne', 'valeur'],
    isAverage: true,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // RECOUVREMENT
  // ─────────────────────────────────────────────────────────────
  {
    id: 'reste_a_encaisser',
    label: 'Reste à Encaisser',
    topic: 'recouvrement',
    dimensions: ['global'],
    supportedIntents: ['valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '€',
    minRole: 2,
  },
  {
    id: 'taux_recouvrement',
    label: 'Taux de Recouvrement',
    topic: 'recouvrement',
    dimensions: ['global'],
    supportedIntents: ['taux'],
    isAverage: false,
    isRanking: false,
    isRate: true,
    isDelay: false,
    requiredFeatures: ['mentionsTaux'],
    unit: '%',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // SAV
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taux_sav_global',
    label: 'Taux SAV Global',
    topic: 'sav',
    dimensions: ['global'],
    supportedIntents: ['taux', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: true,
    isDelay: false,
    unit: '%',
    minRole: 2,
  },
  {
    id: 'nb_sav',
    label: 'Nombre de SAV',
    topic: 'sav',
    dimensions: ['global', 'technicien', 'univers'],
    supportedIntents: ['volume', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // DEVIS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taux_transformation_devis',
    label: 'Taux Transformation Devis',
    topic: 'devis',
    dimensions: ['global'],
    supportedIntents: ['taux'],
    isAverage: false,
    isRanking: false,
    isRate: true,
    isDelay: false,
    unit: '%',
    minRole: 2,
  },
  {
    id: 'nb_devis',
    label: 'Nombre de Devis',
    topic: 'devis',
    dimensions: ['global', 'technicien'],
    supportedIntents: ['volume', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // DOSSIERS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'nb_dossiers_crees',
    label: 'Dossiers Créés',
    topic: 'dossiers',
    dimensions: ['global'],
    supportedIntents: ['volume', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '',
    minRole: 2,
  },
  {
    id: 'nb_dossiers_par_univers',
    label: 'Dossiers par Univers',
    topic: 'dossiers',
    dimensions: ['univers'],
    supportedIntents: ['volume', 'valeur', 'top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    unit: 'dossiers',
    minRole: 2,
  },
  {
    id: 'dossiers_par_apporteur',
    label: 'Dossiers par Apporteur',
    topic: 'dossiers',
    dimensions: ['apporteur'],
    supportedIntents: ['volume', 'valeur', 'top'],
    isAverage: false,
    isRanking: true,
    isRate: false,
    isDelay: false,
    unit: 'dossiers',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // DÉLAIS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'delai_premier_devis',
    label: 'Délai 1er Devis',
    topic: 'delais',
    dimensions: ['global'],
    supportedIntents: ['delay', 'moyenne', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: true,
    unit: 'jours',
    minRole: 2,
  },
  {
    id: 'delai_facturation',
    label: 'Délai Facturation',
    topic: 'delais',
    dimensions: ['global'],
    supportedIntents: ['delay', 'moyenne', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: true,
    unit: 'jours',
    minRole: 2,
  },

  // ─────────────────────────────────────────────────────────────
  // INTERVENTIONS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'nb_interventions',
    label: "Nombre d'Interventions",
    topic: 'interventions',
    dimensions: ['global', 'technicien'],
    supportedIntents: ['volume', 'valeur'],
    isAverage: false,
    isRanking: false,
    isRate: false,
    isDelay: false,
    unit: '',
    minRole: 2,
  },
];

// Index par ID pour lookup rapide
const METRICS_BY_ID = new Map<string, MetricSignature>();
for (const m of METRICS_SIGNATURES) {
  METRICS_BY_ID.set(m.id, m);
}

/**
 * Vérifie si une métrique existe
 */
export function hasMetricSignature(id: string): boolean {
  return METRICS_BY_ID.has(id);
}

/**
 * Récupère une métrique par ID
 */
export function getMetricSignature(id: string): MetricSignature | undefined {
  return METRICS_BY_ID.get(id);
}

// ═══════════════════════════════════════════════════════════════
// SCORING ALGORITHM
// ═══════════════════════════════════════════════════════════════

/**
 * Score une métrique par rapport à l'intent extrait
 * 
 * Scoring:
 * - Topic match: +4
 * - Intent match: +3
 * - Dimension match: +3
 * - Feature alignment: +2 (bonus) ou -4 (malus)
 * - Required features check: -10 si manquantes
 */
export function scoreMetric(metric: MetricSignature, extracted: ExtractedIntent): MetricScore {
  let score = 0;
  const reasons: string[] = [];
  
  // 1. Topic match (+4)
  if (extracted.topic && metric.topic === extracted.topic) {
    score += 4;
    reasons.push(`topic=${extracted.topic}`);
  }
  
  // 2. Intent match (+3)
  if (metric.supportedIntents.includes(extracted.intent)) {
    score += 3;
    reasons.push(`intent=${extracted.intent}`);
  } else {
    // Pénalité légère si intent ne correspond pas
    score -= 1;
    reasons.push(`intent_mismatch`);
  }
  
  // 3. Dimension match (+3)
  if (metric.dimensions.includes(extracted.dimension)) {
    score += 3;
    reasons.push(`dimension=${extracted.dimension}`);
  } else {
    // Pénalité si dimension ne correspond pas
    score -= 2;
    reasons.push(`dimension_mismatch`);
  }
  
  // 4. Feature alignment
  
  // isAverage → mentionsMoyenne
  if (metric.isAverage) {
    if (extracted.features.mentionsMoyenne) {
      score += 2;
      reasons.push('feature:moyenne');
    } else {
      score -= 4; // PÉNALITÉ FORTE si "moyenne" pas mentionné
      reasons.push('penalty:moyenne_absent');
    }
  }
  
  // isRanking → mentionsClassement
  if (metric.isRanking) {
    if (extracted.features.mentionsClassement) {
      score += 2;
      reasons.push('feature:classement');
    } else if (extracted.intent === 'top') {
      // L'intent est "top" même sans mot-clé explicite → OK
      score += 1;
    } else {
      // Pas de pénalité forte pour ranking, c'est souvent implicite
    }
  }
  
  // isRate → mentionsTaux
  if (metric.isRate) {
    if (extracted.features.mentionsTaux) {
      score += 2;
      reasons.push('feature:taux');
    } else if (extracted.intent === 'taux') {
      score += 1;
    } else {
      score -= 2;
      reasons.push('penalty:taux_absent');
    }
  }
  
  // isDelay → mentionsDelay
  if (metric.isDelay) {
    if (extracted.features.mentionsDelay) {
      score += 2;
      reasons.push('feature:delay');
    } else if (extracted.intent === 'delay') {
      score += 1;
    }
  }
  
  // 5. Required features check (blocage si manquantes)
  if (metric.requiredFeatures && metric.requiredFeatures.length > 0) {
    const missing = metric.requiredFeatures.filter(f => !extracted.features[f]);
    if (missing.length > 0) {
      score -= 10; // Blocage effectif
      reasons.push(`missing_required:${missing.join(',')}`);
    }
  }
  
  return { metric, score, reasons };
}

/**
 * Score toutes les métriques et retourne le classement
 */
export function scoreAllMetrics(extracted: ExtractedIntent): MetricScore[] {
  const scores: MetricScore[] = [];
  
  for (const metric of METRICS_SIGNATURES) {
    const scored = scoreMetric(metric, extracted);
    scores.push(scored);
  }
  
  // Trier par score décroissant
  scores.sort((a, b) => b.score - a.score);
  
  return scores;
}

/**
 * Sélectionne la meilleure métrique (seuil minimum = 5)
 */
export function selectBestMetric(
  extracted: ExtractedIntent,
  minScore: number = 5
): { metric: MetricSignature | null; scores: MetricScore[] } {
  const scores = scoreAllMetrics(extracted);
  
  console.log(`[nlMetricScorer] Top 5 scores:`);
  for (let i = 0; i < Math.min(5, scores.length); i++) {
    console.log(`  ${i + 1}. ${scores[i].metric.id}: ${scores[i].score} (${scores[i].reasons.join(', ')})`);
  }
  
  const best = scores[0];
  if (best && best.score >= minScore) {
    console.log(`[nlMetricScorer] Selected: ${best.metric.id} with score ${best.score}`);
    return { metric: best.metric, scores };
  }
  
  console.log(`[nlMetricScorer] No metric reached minScore ${minScore}, best was ${best?.metric.id} with ${best?.score}`);
  return { metric: null, scores };
}
