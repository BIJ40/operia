/**
 * NL Query Parser - Pipeline NLP complet structuré
 * 
 * Produit une ParsedNLQuery avec:
 * - subject: ca | sav | dossiers | devis | interventions | delais | recouvrement
 * - operation: amount | count | rate | delay | average | ranking
 * - dimension: global | apporteur | technicien | univers
 * - entityFilters: { apporteur?, technicien?, univers? }
 * - period: { from, to, label }
 */

import { type TokenizedQuery, hasAnyToken } from './nlTokenizer.ts';
import { type ParsedPeriod } from './nlPeriodExtractor.ts';
import { type ResolvedEntityFilters } from './nlEntityResolver.ts';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type MetricSubject = 'ca' | 'sav' | 'dossiers' | 'devis' | 'interventions' | 'delais' | 'recouvrement';
export type MetricOperation = 'amount' | 'count' | 'rate' | 'delay' | 'average' | 'ranking';
export type MetricDimension = 'global' | 'apporteur' | 'technicien' | 'univers';

export interface ParsedNLQuery {
  subject: MetricSubject;
  operation: MetricOperation;
  dimension: MetricDimension;
  entityFilters: {
    apporteurId?: number | string;
    apporteurName?: string;
    technicienId?: number | string;
    technicienName?: string;
    univers?: string;
  };
  period: ParsedPeriod;
  limit?: number;
  confidence: 'high' | 'medium' | 'low';
  debug: {
    subjectReason: string;
    operationReason: string;
    dimensionReason: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// SUBJECT DETECTION (sujet métier)
// ═══════════════════════════════════════════════════════════════

const SUBJECT_KEYWORDS: Record<MetricSubject, string[]> = {
  ca: ['ca', 'chiffre', 'affaires', 'affaire', 'caht', 'recette', 'recettes', 'facture', 'factures', 'facturation', 'fait', 'ifait', 'genere', 'realise', 'gagne', 'rapporte', 'generer', 'revenus', 'revenue'],
  sav: ['sav', 'garantie', 'retour', 'reclamation', 'service', 'vente'],
  dossiers: ['dossier', 'dossiers', 'projet', 'projets', 'affaire', 'affaires', 'ouvert', 'ouverts', 'cree', 'crees', 'recu', 'recus'],
  devis: ['devis', 'transformation', 'conversion', 'signe', 'accepte', 'proposition'],
  interventions: ['intervention', 'interventions', 'rdv', 'visite', 'visites', 'passage', 'passages'],
  delais: ['delai', 'delais', 'temps', 'duree', 'rapidite', 'vitesse', 'attente'],
  recouvrement: ['recouvrement', 'impayes', 'impaye', 'encours', 'duclient', 'reste', 'encaisser', 'encaissement', 'paiement', 'reglement'],
};

function detectSubject(tokenized: TokenizedQuery): { subject: MetricSubject; reason: string } {
  // Ordre de priorité: sujets spécifiques avant CA (plus générique)
  const subjectOrder: MetricSubject[] = ['sav', 'recouvrement', 'delais', 'devis', 'interventions', 'dossiers', 'ca'];
  
  for (const subject of subjectOrder) {
    if (hasAnyToken(tokenized, SUBJECT_KEYWORDS[subject])) {
      const matched = SUBJECT_KEYWORDS[subject].filter(kw => 
        tokenized.tokens.includes(kw) || tokenized.bigrams.some(b => b.includes(kw))
      );
      return { subject, reason: `keyword:${matched[0] || subject}` };
    }
  }
  
  // Fallback sémantique: "combien j'ai fait" → CA
  if (tokenized.normalized.includes('combien') && 
      (tokenized.normalized.includes('fait') || tokenized.normalized.includes('ifait'))) {
    return { subject: 'ca', reason: 'semantic:combien_fait' };
  }
  
  // Default: CA
  return { subject: 'ca', reason: 'default' };
}

// ═══════════════════════════════════════════════════════════════
// OPERATION DETECTION (type d'opération)
// ═══════════════════════════════════════════════════════════════

const OPERATION_KEYWORDS: Record<MetricOperation, string[]> = {
  average: ['moyen', 'moyenne', 'moyenparjour', 'moyennejour', 'moyennetechnicien'],
  ranking: ['top', 'meilleur', 'meilleurs', 'classement', 'premier', 'premiers', 'pire', 'pires'],
  rate: ['taux', 'pourcentage', '%', 'ratio', 'proportion'],
  count: ['combien', 'nombre', 'nb', 'volume', 'quantite', 'total'],
  delay: ['delai', 'temps', 'duree', 'encombientemps', 'rapidite'],
  amount: [], // Default pour les montants
};

function detectOperation(tokenized: TokenizedQuery, subject: MetricSubject): { operation: MetricOperation; reason: string } {
  // 1. Priorité aux opérations explicites
  if (hasAnyToken(tokenized, OPERATION_KEYWORDS.average)) {
    return { operation: 'average', reason: 'keyword:moyenne' };
  }
  if (hasAnyToken(tokenized, OPERATION_KEYWORDS.ranking)) {
    return { operation: 'ranking', reason: 'keyword:top' };
  }
  if (hasAnyToken(tokenized, OPERATION_KEYWORDS.rate)) {
    return { operation: 'rate', reason: 'keyword:taux' };
  }
  if (hasAnyToken(tokenized, OPERATION_KEYWORDS.delay)) {
    return { operation: 'delay', reason: 'keyword:delai' };
  }
  
  // 2. Inférence par subject
  if (subject === 'sav' && !hasAnyToken(tokenized, ['nombre', 'nb', 'combien'])) {
    return { operation: 'rate', reason: 'implicit:sav_taux' };
  }
  if (subject === 'delais') {
    return { operation: 'delay', reason: 'implicit:delais' };
  }
  if (subject === 'dossiers' || subject === 'interventions' || subject === 'devis') {
    if (hasAnyToken(tokenized, OPERATION_KEYWORDS.count)) {
      return { operation: 'count', reason: 'keyword:count' };
    }
    return { operation: 'count', reason: 'implicit:volume_subject' };
  }
  
  // 3. Default: amount (montant) pour CA
  return { operation: 'amount', reason: 'default' };
}

// ═══════════════════════════════════════════════════════════════
// LIMIT (TOP N) EXTRACTION
// ═══════════════════════════════════════════════════════════════

function extractLimit(query: string): number | undefined {
  const patterns = [/top\s*(\d+)/i, /(\d+)\s*(?:meilleur|premier)/i];
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) return Math.min(parseInt(match[1], 10), 20);
  }
  if (query.toLowerCase().includes('meilleur') || query.toLowerCase().includes('top')) {
    return 5;
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════
// MAIN PARSER
// ═══════════════════════════════════════════════════════════════

/**
 * Parse complète d'une query NL vers structure métier
 */
export function parseNLQuery(
  query: string,
  tokenized: TokenizedQuery,
  period: ParsedPeriod,
  entityFilters: ResolvedEntityFilters
): ParsedNLQuery {
  // 1. Detect subject
  const { subject, reason: subjectReason } = detectSubject(tokenized);
  
  // 2. Detect operation
  const { operation, reason: operationReason } = detectOperation(tokenized, subject);
  
  // 3. Dimension = celle des entités résolues
  const dimension = entityFilters.dimension;
  const dimensionReason = entityFilters.apporteur 
    ? `entity:apporteur:${entityFilters.apporteur.name}`
    : entityFilters.technicien 
      ? `entity:technicien:${entityFilters.technicien.name}`
      : entityFilters.univers
        ? `entity:univers:${entityFilters.univers}`
        : 'default:global';
  
  // 4. Extract limit
  const limit = extractLimit(query);
  
  // 5. Compute confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let confidenceScore = 0;
  if (subjectReason !== 'default') confidenceScore++;
  if (operationReason !== 'default') confidenceScore++;
  if (dimension !== 'global') confidenceScore++;
  if (!period.isDefault) confidenceScore++;
  if (confidenceScore >= 3) confidence = 'high';
  else if (confidenceScore >= 1) confidence = 'medium';
  
  const parsed: ParsedNLQuery = {
    subject,
    operation,
    dimension,
    entityFilters: {
      apporteurId: entityFilters.apporteur?.id,
      apporteurName: entityFilters.apporteur?.name,
      technicienId: entityFilters.technicien?.id,
      technicienName: entityFilters.technicien?.name,
      univers: entityFilters.univers,
    },
    period,
    limit,
    confidence,
    debug: {
      subjectReason,
      operationReason,
      dimensionReason,
    },
  };
  
  console.log(`[nlQueryParser] Parsed query:`, JSON.stringify(parsed, null, 2));
  
  return parsed;
}

// ═══════════════════════════════════════════════════════════════
// METRIC MAPPING
// ═══════════════════════════════════════════════════════════════

interface MetricMapping {
  id: string;
  label: string;
  unit: 'euro' | 'percent' | 'count' | 'days';
}

const METRIC_MAP: Record<string, MetricMapping> = {
  // CA
  'ca:amount:global': { id: 'ca_global_ht', label: 'CA Global HT', unit: 'euro' },
  'ca:amount:apporteur': { id: 'ca_par_apporteur', label: 'CA par Apporteur', unit: 'euro' },
  'ca:amount:technicien': { id: 'ca_par_technicien', label: 'CA par Technicien', unit: 'euro' },
  'ca:amount:univers': { id: 'ca_par_univers', label: 'CA par Univers', unit: 'euro' },
  'ca:average:global': { id: 'ca_moyen_par_jour', label: 'CA Moyen par Jour', unit: 'euro' },
  'ca:average:technicien': { id: 'ca_moyen_par_tech', label: 'CA Moyen par Technicien', unit: 'euro' },
  'ca:ranking:technicien': { id: 'top_techniciens_ca', label: 'Top Techniciens CA', unit: 'euro' },
  'ca:ranking:apporteur': { id: 'top_apporteurs_ca', label: 'Top Apporteurs CA', unit: 'euro' },
  
  // SAV
  'sav:rate:global': { id: 'taux_sav_global', label: 'Taux SAV Global', unit: 'percent' },
  'sav:count:global': { id: 'nb_sav', label: 'Nombre de SAV', unit: 'count' },
  'sav:count:technicien': { id: 'nb_sav', label: 'Nombre de SAV', unit: 'count' },
  'sav:count:univers': { id: 'nb_sav', label: 'Nombre de SAV', unit: 'count' },
  
  // Dossiers
  'dossiers:count:global': { id: 'nb_dossiers_crees', label: 'Dossiers Créés', unit: 'count' },
  'dossiers:count:apporteur': { id: 'dossiers_par_apporteur', label: 'Dossiers par Apporteur', unit: 'count' },
  'dossiers:count:univers': { id: 'nb_dossiers_par_univers', label: 'Dossiers par Univers', unit: 'count' },
  'dossiers:ranking:apporteur': { id: 'dossiers_par_apporteur', label: 'Dossiers par Apporteur', unit: 'count' },
  
  // Devis
  'devis:rate:global': { id: 'taux_transformation_devis', label: 'Taux Transformation Devis', unit: 'percent' },
  'devis:count:global': { id: 'nb_devis', label: 'Nombre de Devis', unit: 'count' },
  
  // Interventions
  'interventions:count:global': { id: 'nb_interventions', label: "Nombre d'Interventions", unit: 'count' },
  'interventions:count:technicien': { id: 'nb_interventions', label: "Nombre d'Interventions", unit: 'count' },
  
  // Délais
  'delais:delay:global': { id: 'delai_premier_devis', label: 'Délai 1er Devis', unit: 'days' },
  
  // Recouvrement
  'recouvrement:amount:global': { id: 'reste_a_encaisser', label: 'Reste à Encaisser', unit: 'euro' },
  'recouvrement:rate:global': { id: 'taux_recouvrement', label: 'Taux de Recouvrement', unit: 'percent' },
};

/**
 * Résout le metricId à partir de la query parsée
 */
export function resolveMetricFromParsed(parsed: ParsedNLQuery): MetricMapping | null {
  // Construire la clé de lookup
  const key = `${parsed.subject}:${parsed.operation}:${parsed.dimension}`;
  
  console.log(`[nlQueryParser] Looking up metric for key: ${key}`);
  
  // Lookup direct
  if (METRIC_MAP[key]) {
    console.log(`[nlQueryParser] ✓ Found metric: ${METRIC_MAP[key].id}`);
    return METRIC_MAP[key];
  }
  
  // Fallback: essayer avec global
  const globalKey = `${parsed.subject}:${parsed.operation}:global`;
  if (METRIC_MAP[globalKey]) {
    console.log(`[nlQueryParser] ✓ Fallback to global metric: ${METRIC_MAP[globalKey].id}`);
    return METRIC_MAP[globalKey];
  }
  
  // Fallback: essayer avec amount
  const amountKey = `${parsed.subject}:amount:${parsed.dimension}`;
  if (METRIC_MAP[amountKey]) {
    console.log(`[nlQueryParser] ✓ Fallback to amount metric: ${METRIC_MAP[amountKey].id}`);
    return METRIC_MAP[amountKey];
  }
  
  const defaultKey = `${parsed.subject}:amount:global`;
  if (METRIC_MAP[defaultKey]) {
    console.log(`[nlQueryParser] ✓ Fallback to default metric: ${METRIC_MAP[defaultKey].id}`);
    return METRIC_MAP[defaultKey];
  }
  
  console.log(`[nlQueryParser] ✗ No metric found for key: ${key}`);
  return null;
}
