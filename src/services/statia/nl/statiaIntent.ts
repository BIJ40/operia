// --- Types de base ---

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
  month?: number; // 1-12
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

// Mois FR → index
const MONTHS_FR: Record<string, number> = {
  janvier: 1,
  fevrier: 2,
  février: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  aout: 8,
  août: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  decembre: 12,
  décembre: 12,
};

// --- 1. Détection sujet + opération ---

export function detectSubjectAndOperation(
  q: string
): { subject: MetricSubject; operation: MetricOperation } {
  const l = q.toLowerCase();

  // CA / chiffre d'affaires
  if (
    l.includes('ca') ||
    l.includes("chiffre d affaire") ||
    l.includes("chiffre d'affaires") ||
    l.includes("j'ai fait") ||
    l.includes('jai fait')
  ) {
    return { subject: 'ca', operation: 'amount' };
  }

  // SAV
  if (l.includes('sav')) {
    if (l.includes('taux') || l.includes('ratio') || l.includes('pourcentage')) {
      return { subject: 'taux_sav', operation: 'ratio' };
    }
    return { subject: 'sav', operation: 'count' };
  }

  // Délai
  if (l.includes('delai') || l.includes('délai') || l.includes('temps moyen')) {
    return { subject: 'delai', operation: 'delay' };
  }

  // Interventions
  if (l.includes('intervention')) {
    return { subject: 'interventions', operation: 'count' };
  }

  // Dossiers
  if (l.includes('dossier')) {
    return { subject: 'dossiers', operation: 'count' };
  }

  // Taux de marge
  if (l.includes('marge')) {
    return { subject: 'taux_marge', operation: 'ratio' };
  }

  // Panier moyen
  if (l.includes('panier moyen')) {
    return { subject: 'panier_moyen', operation: 'amount' };
  }

  // Fallback raisonnable
  if (l.includes('combien')) {
    return { subject: 'ca', operation: 'amount' };
  }

  return { subject: 'interventions', operation: 'count' };
}

// --- 2. Détection période ---

export function detectPeriod(q: string, defaultYear: number): ParsedPeriod {
  const l = q.toLowerCase();

  // Année explicite (4 chiffres)
  const yearMatch = l.match(/20[0-9]{2}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : defaultYear;

  // Mois texte
  for (const [name, month] of Object.entries(MONTHS_FR)) {
    if (l.includes(name)) {
      return { type: 'month', month, year };
    }
  }

  // Pattern 10/2025
  const m = l.match(/(0?[1-9]|1[0-2])\s*\/\s*(20[0-9]{2})/);
  if (m) {
    return { type: 'month', month: parseInt(m[1], 10), year: parseInt(m[2], 10) };
  }

  // Mot-clés année
  if (l.includes('cette annee') || l.includes('cette année') || l.includes('sur l annee')) {
    return { type: 'year', year };
  }

  if (l.includes('tout le temps') || l.includes('depuis le debut')) {
    return { type: 'all' };
  }

  // Défaut : mois en cours (year = defaultYear, month non renseigné → géré côté moteur)
  return { type: 'month', year };
}

// --- 3. Détection dimension + filtres (entités) ---

function detectEntityFromDict(
  qNorm: string,
  dict: string[]
): string | undefined {
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
  // Apporteur
  const apporteur = detectEntityFromDict(qNorm, dictionaries.apporteurs);
  if (apporteur) {
    return { dimension: 'apporteur', filters: { apporteur } };
  }

  // Technicien
  const technicien = detectEntityFromDict(qNorm, dictionaries.techniciens);
  if (technicien) {
    return { dimension: 'technicien', filters: { technicien } };
  }

  // Univers
  const univers = detectEntityFromDict(qNorm, dictionaries.univers);
  if (univers) {
    return { dimension: 'univers', filters: { univers } };
  }

  // Agence
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
  const { dimension, filters } = detectDimensionAndFilters(
    normalized,
    ctx.dictionaries
  );

  return {
    raw: query,
    normalized,
    subject,
    operation,
    dimension,
    period,
    filters,
  };
}
