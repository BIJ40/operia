// ═══════════════════════════════════════════════════════════════
// StatIA Intent V4 - Embedded in Edge Function
// ═══════════════════════════════════════════════════════════════

export type MetricSubject =
  | 'ca'
  | 'sav'
  | 'interventions'
  | 'dossiers'
  | 'delai'
  | 'taux_sav'
  | 'taux_marge'
  | 'panier_moyen';

export type MetricOperation = 'amount' | 'count' | 'ratio' | 'delay';

export type MetricDimension =
  | 'global'
  | 'apporteur'
  | 'technicien'
  | 'univers'
  | 'agence';

export type PeriodType = 'month' | 'year' | 'range' | 'all';

export interface ParsedPeriod {
  type: PeriodType;
  month?: number;
  year?: number;
}

export interface ParsedFilters {
  apporteur?: string;
  technicien?: string;
  univers?: string;
  agence?: string;
}

export interface ParsedQuery {
  raw: string;
  normalized: string;
  subject: MetricSubject;
  operation: MetricOperation;
  dimension: MetricDimension;
  period: ParsedPeriod;
  filters: ParsedFilters;
}

export interface EntityDictionaries {
  apporteurs: string[];
  techniciens: string[];
  univers: string[];
  agences: string[];
}

export interface NlContext {
  dictionaries: EntityDictionaries;
  defaultYear: number;
}

// --- Utils ---
export function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTHS_FR: Record<string, number> = {
  janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
  juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12,
};

// --- 1. Détection sujet + opération ---
export function detectSubjectAndOperation(q: string): { subject: MetricSubject; operation: MetricOperation } {
  const l = q.toLowerCase();

  if (l.includes('ca') || l.includes("chiffre d affaire") || l.includes("chiffre d'affaires") || l.includes("j'ai fait") || l.includes('jai fait') || l.includes('combien j ai fait')) {
    return { subject: 'ca', operation: 'amount' };
  }

  if (l.includes('sav')) {
    if (l.includes('taux') || l.includes('ratio') || l.includes('pourcentage')) {
      return { subject: 'taux_sav', operation: 'ratio' };
    }
    return { subject: 'sav', operation: 'count' };
  }

  if (l.includes('delai') || l.includes('délai') || l.includes('temps moyen')) {
    return { subject: 'delai', operation: 'delay' };
  }

  if (l.includes('intervention')) {
    return { subject: 'interventions', operation: 'count' };
  }

  if (l.includes('dossier')) {
    return { subject: 'dossiers', operation: 'count' };
  }

  if (l.includes('marge')) {
    return { subject: 'taux_marge', operation: 'ratio' };
  }

  if (l.includes('panier moyen')) {
    return { subject: 'panier_moyen', operation: 'amount' };
  }

  if (l.includes('combien')) {
    return { subject: 'ca', operation: 'amount' };
  }

  return { subject: 'interventions', operation: 'count' };
}

// --- 2. Détection période ---
export function detectPeriod(q: string, defaultYear: number): ParsedPeriod {
  const l = q.toLowerCase();

  const yearMatch = l.match(/20[0-9]{2}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : defaultYear;

  for (const [name, month] of Object.entries(MONTHS_FR)) {
    if (l.includes(name)) {
      return { type: 'month', month, year };
    }
  }

  const m = l.match(/(0?[1-9]|1[0-2])\s*\/\s*(20[0-9]{2})/);
  if (m) {
    return { type: 'month', month: parseInt(m[1], 10), year: parseInt(m[2], 10) };
  }

  if (l.includes('cette annee') || l.includes('cette année') || l.includes('sur l annee')) {
    return { type: 'year', year };
  }

  if (l.includes('tout le temps') || l.includes('depuis le debut')) {
    return { type: 'all' };
  }

  return { type: 'month', year };
}

// --- 3. Détection dimension + filtres (entités) ---
function detectEntityFromDict(qNorm: string, dict: string[]): string | undefined {
  for (const value of dict) {
    const n = normalize(value);
    if (!n || n.length < 3) continue;
    if (qNorm.includes(n)) return value;
  }
  return undefined;
}

export function detectDimensionAndFilters(
  qNorm: string,
  dictionaries: EntityDictionaries
): { dimension: MetricDimension; filters: ParsedFilters } {
  const apporteur = detectEntityFromDict(qNorm, dictionaries.apporteurs);
  if (apporteur) {
    return { dimension: 'apporteur', filters: { apporteur } };
  }

  const technicien = detectEntityFromDict(qNorm, dictionaries.techniciens);
  if (technicien) {
    return { dimension: 'technicien', filters: { technicien } };
  }

  const univers = detectEntityFromDict(qNorm, dictionaries.univers);
  if (univers) {
    return { dimension: 'univers', filters: { univers } };
  }

  const agence = detectEntityFromDict(qNorm, dictionaries.agences);
  if (agence) {
    return { dimension: 'agence', filters: { agence } };
  }

  return { dimension: 'global', filters: {} };
}

// --- 4. Parse global ---
export function parseStatiaQuery(query: string, ctx: NlContext): ParsedQuery {
  const normalized = normalize(query);

  const { subject, operation } = detectSubjectAndOperation(normalized);
  const period = detectPeriod(normalized, ctx.defaultYear);
  const { dimension, filters } = detectDimensionAndFilters(normalized, ctx.dictionaries);

  return { raw: query, normalized, subject, operation, dimension, period, filters };
}

// ═══════════════════════════════════════════════════════════════
// Metric Registry V4
// ═══════════════════════════════════════════════════════════════

export type MetricId = string;
export type MetricUnit = 'euro' | 'count' | 'ratio' | 'days';

export interface MetricDefinition {
  id: MetricId;
  subject: MetricSubject;
  operation: MetricOperation;
  dimension: MetricDimension;
  unit: MetricUnit;
  label: string;
  engineKey: string;
}

export const METRICS: MetricDefinition[] = [
  { id: 'CA_GLOBAL_MENSUEL', subject: 'ca', operation: 'amount', dimension: 'global', unit: 'euro', label: 'CA global mensuel', engineKey: 'ca_global_ht' },
  { id: 'CA_GLOBAL_ANNUEL', subject: 'ca', operation: 'amount', dimension: 'global', unit: 'euro', label: 'CA global annuel', engineKey: 'ca_global_annuel' },
  { id: 'CA_PAR_APPORT_MENSUEL', subject: 'ca', operation: 'amount', dimension: 'apporteur', unit: 'euro', label: 'CA par apporteur mensuel', engineKey: 'ca_par_apporteur' },
  { id: 'CA_PAR_APPORT_ANNUEL', subject: 'ca', operation: 'amount', dimension: 'apporteur', unit: 'euro', label: 'CA par apporteur annuel', engineKey: 'ca_par_apporteur' },
  { id: 'CA_PAR_TECH_MENSUEL', subject: 'ca', operation: 'amount', dimension: 'technicien', unit: 'euro', label: 'CA par technicien mensuel', engineKey: 'ca_par_technicien' },
  { id: 'CA_PAR_TECH_ANNUEL', subject: 'ca', operation: 'amount', dimension: 'technicien', unit: 'euro', label: 'CA par technicien annuel', engineKey: 'ca_par_technicien' },
  { id: 'CA_PAR_UNIVERS_MENSUEL', subject: 'ca', operation: 'amount', dimension: 'univers', unit: 'euro', label: 'CA par univers mensuel', engineKey: 'ca_par_univers' },
  { id: 'CA_PAR_UNIVERS_ANNUEL', subject: 'ca', operation: 'amount', dimension: 'univers', unit: 'euro', label: 'CA par univers annuel', engineKey: 'ca_par_univers' },
  { id: 'NOMBRE_SAV_MENSUEL', subject: 'sav', operation: 'count', dimension: 'global', unit: 'count', label: 'Nombre de SAV mensuel', engineKey: 'nb_sav_global' },
  { id: 'TAUX_SAV_ANNUEL', subject: 'taux_sav', operation: 'ratio', dimension: 'global', unit: 'ratio', label: 'Taux de SAV annuel', engineKey: 'taux_sav_global' },
  { id: 'TAUX_SAV_PAR_APPORT_ANNUEL', subject: 'taux_sav', operation: 'ratio', dimension: 'apporteur', unit: 'ratio', label: 'Taux de SAV par apporteur annuel', engineKey: 'taux_sav_par_apporteur' },
  { id: 'NB_INTER_MENSUEL', subject: 'interventions', operation: 'count', dimension: 'global', unit: 'count', label: "Nombre d'interventions mensuel", engineKey: 'nb_interventions' },
  { id: 'NB_DOSSIERS_ANNUEL', subject: 'dossiers', operation: 'count', dimension: 'global', unit: 'count', label: 'Nombre de dossiers annuel', engineKey: 'nb_dossiers_crees' },
  { id: 'NB_DOSSIERS_PAR_APPORT_MENSUEL', subject: 'dossiers', operation: 'count', dimension: 'apporteur', unit: 'count', label: 'Nombre de dossiers par apporteur mensuel', engineKey: 'nb_dossiers_par_apporteur' },
  { id: 'DELAI_MOYEN_DEVIS_TRAVAUX', subject: 'delai', operation: 'delay', dimension: 'global', unit: 'days', label: 'Délai moyen devis → travaux', engineKey: 'delai_premier_devis' },
  { id: 'PANIER_MOYEN_MENSUEL', subject: 'panier_moyen', operation: 'amount', dimension: 'global', unit: 'euro', label: 'Panier moyen mensuel', engineKey: 'panier_moyen' },
  { id: 'TAUX_MARGE_ANNUEL', subject: 'taux_marge', operation: 'ratio', dimension: 'global', unit: 'ratio', label: 'Taux de marge annuel', engineKey: 'taux_marge' },
  { id: 'TOP_APPORT_CA_ANNUEL', subject: 'ca', operation: 'amount', dimension: 'apporteur', unit: 'euro', label: 'Top apporteurs par CA annuel', engineKey: 'top_apporteurs_ca' },
  { id: 'TOP_TECH_CA_GLOBAL', subject: 'ca', operation: 'amount', dimension: 'technicien', unit: 'euro', label: 'Top techniciens par CA', engineKey: 'top_techniciens_ca' },
];

export function selectMetricV4(parsed: ParsedQuery): MetricDefinition | null {
  let best: { metric: MetricDefinition; score: number } | null = null;

  for (const metric of METRICS) {
    let score = 0;

    if (metric.subject === parsed.subject) score += 3;
    if (metric.operation === parsed.operation) score += 2;
    if (metric.dimension === parsed.dimension) score += 2;

    if (parsed.filters.apporteur && metric.dimension === 'apporteur') score += 1;
    if (parsed.filters.technicien && metric.dimension === 'technicien') score += 1;
    if (parsed.filters.univers && metric.dimension === 'univers') score += 1;
    if (parsed.filters.agence && metric.dimension === 'agence') score += 1;

    if (!best || score > best.score) {
      best = { metric, score };
    }
  }

  return best?.metric ?? null;
}
