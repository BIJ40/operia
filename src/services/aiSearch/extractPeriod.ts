/**
 * StatIA AI Search - Extraction de période NL
 * Parser robuste pour expressions temporelles françaises
 */

import type { ParsedPeriod } from './types';
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subMonths, subYears, subDays, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const MOIS_MAP: Record<string, number> = {
  'janvier': 0, 'jan': 0, 'janv': 0,
  'fevrier': 1, 'fev': 1, 'fevr': 1,
  'mars': 2, 'mar': 2,
  'avril': 3, 'avr': 3,
  'mai': 4,
  'juin': 5, 'jun': 5,
  'juillet': 6, 'juil': 6, 'jul': 6,
  'aout': 7, 'aou': 7,
  'septembre': 8, 'sept': 8, 'sep': 8,
  'octobre': 9, 'oct': 9,
  'novembre': 10, 'nov': 10,
  'decembre': 11, 'dec': 11,
};

// ═══════════════════════════════════════════════════════════════
// PARSING PRINCIPAL
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait une période d'une requête normalisée
 * Retourne null si aucune période détectée (le moteur appliquera un fallback)
 */
export function extractPeriod(normalizedQuery: string, now = new Date()): ParsedPeriod | null {
  const q = normalizedQuery.toLowerCase();
  
  // ─────────────────────────────────────────────────────────────
  // PATTERNS EXPLICITES
  // ─────────────────────────────────────────────────────────────
  
  // "cette année", "annee en cours"
  if (/cette\s+annee|annee\s+en\s+cours|annee\s+courante/.test(q)) {
    return createPeriod(startOfYear(now), endOfYear(now), 'Cette année');
  }
  
  // "année dernière", "annee precedente", "N-1"
  if (/annee\s+(?:derniere|precedente)|n\s*-\s*1/.test(q)) {
    const lastYear = subYears(now, 1);
    return createPeriod(startOfYear(lastYear), endOfYear(lastYear), 'Année dernière');
  }
  
  // "ce mois", "mois en cours"
  if (/ce\s+mois|mois\s+(?:en\s+cours|courant|actuel)/.test(q)) {
    return createPeriod(startOfMonth(now), endOfMonth(now), 'Ce mois');
  }
  
  // "mois dernier", "mois precedent"
  if (/mois\s+(?:dernier|precedent)/.test(q)) {
    const lastMonth = subMonths(now, 1);
    return createPeriod(startOfMonth(lastMonth), endOfMonth(lastMonth), 'Mois dernier');
  }
  
  // "cette semaine"
  if (/cette\s+semaine|semaine\s+(?:en\s+cours|courante)/.test(q)) {
    return createPeriod(startOfWeek(now, { locale: fr }), endOfWeek(now, { locale: fr }), 'Cette semaine');
  }
  
  // "semaine dernière"
  if (/semaine\s+(?:derniere|precedente)/.test(q)) {
    const lastWeek = subWeeks(now, 1);
    return createPeriod(startOfWeek(lastWeek, { locale: fr }), endOfWeek(lastWeek, { locale: fr }), 'Semaine dernière');
  }
  
  // "aujourd'hui", "ce jour"
  if (/aujourd\s*hui|ce\s+jour/.test(q)) {
    return createPeriod(now, now, "Aujourd'hui");
  }
  
  // "hier"
  if (/\bhier\b/.test(q)) {
    const yesterday = subDays(now, 1);
    return createPeriod(yesterday, yesterday, 'Hier');
  }
  
  // "12 derniers mois", "douze derniers mois"
  if (/(?:12|douze)\s+derniers?\s+mois/.test(q)) {
    return createPeriod(subMonths(now, 12), now, '12 derniers mois');
  }
  
  // "X derniers mois"
  const lastNMonthsMatch = q.match(/(\d+)\s+derniers?\s+mois/);
  if (lastNMonthsMatch) {
    const n = parseInt(lastNMonthsMatch[1], 10);
    if (n > 0 && n <= 60) {
      return createPeriod(subMonths(now, n), now, `${n} derniers mois`);
    }
  }
  
  // "X derniers jours"
  const lastNDaysMatch = q.match(/(\d+)\s+derniers?\s+jours/);
  if (lastNDaysMatch) {
    const n = parseInt(lastNDaysMatch[1], 10);
    if (n > 0 && n <= 365) {
      return createPeriod(subDays(now, n), now, `${n} derniers jours`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PATTERNS "DEPUIS [mois]"
  // ─────────────────────────────────────────────────────────────
  
  const depuisMatch = q.match(/depuis\s+(?:le\s+)?(?:debut\s+)?(\w+)(?:\s+(\d{4}))?/);
  if (depuisMatch) {
    const moisNum = MOIS_MAP[depuisMatch[1]];
    if (moisNum !== undefined) {
      const year = depuisMatch[2] ? parseInt(depuisMatch[2], 10) : now.getFullYear();
      const startDate = new Date(year, moisNum, 1);
      const label = `Depuis ${capitalizeFirst(depuisMatch[1])} ${year}`;
      return createPeriod(startDate, now, label);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PATTERNS "AU [jour] [mois]" (jusqu'au)
  // ─────────────────────────────────────────────────────────────
  
  const auDateMatch = q.match(/(?:au|jusqu\s*au|jusqu'au)\s+(\d{1,2})\s+(\w+)(?:\s+(\d{4}))?/);
  if (auDateMatch) {
    const day = parseInt(auDateMatch[1], 10);
    const moisNum = MOIS_MAP[auDateMatch[2]];
    if (moisNum !== undefined && day >= 1 && day <= 31) {
      const year = auDateMatch[3] ? parseInt(auDateMatch[3], 10) : now.getFullYear();
      const endDate = new Date(year, moisNum, day);
      const startDate = startOfYear(endDate);
      const label = `Jusqu'au ${day} ${capitalizeFirst(auDateMatch[2])} ${year}`;
      return createPeriod(startDate, endDate, label);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PATTERNS "[mois] [année]" (mois spécifique)
  // ─────────────────────────────────────────────────────────────
  
  for (const [moisName, moisNum] of Object.entries(MOIS_MAP)) {
    const pattern = new RegExp(`\\b${moisName}(?:\\s+(\\d{4}))?\\b`);
    const match = q.match(pattern);
    if (match) {
      const year = match[1] ? parseInt(match[1], 10) : now.getFullYear();
      const monthDate = new Date(year, moisNum, 1);
      return createPeriod(startOfMonth(monthDate), endOfMonth(monthDate), `${capitalizeFirst(moisName)} ${year}`);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PATTERNS "[mois] - [mois]" (plage de mois)
  // ─────────────────────────────────────────────────────────────
  
  const rangeMatch = q.match(/(\w+)\s*(?:-|a|au)\s*(\w+)(?:\s+(\d{4}))?/);
  if (rangeMatch) {
    const mois1 = MOIS_MAP[rangeMatch[1]];
    const mois2 = MOIS_MAP[rangeMatch[2]];
    if (mois1 !== undefined && mois2 !== undefined) {
      const year = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : now.getFullYear();
      const startDate = new Date(year, mois1, 1);
      const endDate = endOfMonth(new Date(year, mois2, 1));
      const label = `${capitalizeFirst(rangeMatch[1])} - ${capitalizeFirst(rangeMatch[2])} ${year}`;
      return createPeriod(startDate, endDate, label);
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // PATTERN ANNÉE SEULE "2024", "en 2023"
  // ─────────────────────────────────────────────────────────────
  
  const yearMatch = q.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1], 10);
    if (year >= 2000 && year <= 2099) {
      const yearDate = new Date(year, 0, 1);
      return createPeriod(startOfYear(yearDate), endOfYear(yearDate), `Année ${year}`);
    }
  }
  
  // Aucune période détectée
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Période par défaut (12 derniers mois)
 */
export function getDefaultPeriod(now = new Date()): ParsedPeriod {
  return {
    from: format(subMonths(now, 12), 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
    label: '12 derniers mois',
    isDefault: true,
  };
}

/**
 * Période année courante
 */
export function getCurrentYearPeriod(now = new Date()): ParsedPeriod {
  return {
    from: format(startOfYear(now), 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
    label: `Année ${now.getFullYear()}`,
    isDefault: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function createPeriod(from: Date, to: Date, label: string): ParsedPeriod {
  return {
    from: format(from, 'yyyy-MM-dd'),
    to: format(to, 'yyyy-MM-dd'),
    label,
    isDefault: false,
  };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
