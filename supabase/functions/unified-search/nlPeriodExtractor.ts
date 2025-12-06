/**
 * NL Period Extractor - Extraction de période basée sur tokens
 * 
 * Gère les cas:
 * - "en avril" (sans année) → dernier avril clos
 * - "ce mois-ci"
 * - "cette année"
 * - "mois dernier"
 * - "année dernière"
 * - "en mars l'an dernier"
 */

import { type TokenizedQuery, hasToken, hasAnyToken, hasBigram, hasPhrase } from './nlTokenizer.ts';

export interface ParsedPeriod {
  from: string;
  to: string;
  label: string;
  isDefault: boolean;
}

const MOIS_MAP: Record<string, number> = {
  'janvier': 0, 'fevrier': 1, 'mars': 2, 'avril': 3, 'mai': 4, 'juin': 5,
  'juillet': 6, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'decembre': 11,
};

const MOIS_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                   'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function getMonthName(idx: number): string {
  return MOIS_NAMES[idx] || '';
}

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Extrait une année du texte normalisé (ex: "2024", "2023")
 */
function extractYear(normalized: string): number | null {
  const match = normalized.match(/20\d{2}/);
  return match ? parseInt(match[0]) : null;
}

/**
 * Vérifie si "l'an dernier" ou "année dernière" est mentionné
 */
function mentionsLastYear(tokenized: TokenizedQuery): boolean {
  return hasBigram(tokenized, 'an dernier') ||
         hasBigram(tokenized, 'annee derniere') ||
         hasPhrase(tokenized, 'l an dernier');
}

/**
 * Extrait la période depuis les tokens
 */
export function extractPeriodFromTokens(tokenized: TokenizedQuery, now: Date): ParsedPeriod {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const normalized = tokenized.normalized;
  
  // ════════════════════════════════════════════════════════════
  // 1. "cette année"
  // ════════════════════════════════════════════════════════════
  if (hasBigram(tokenized, 'cette annee')) {
    return {
      from: `${currentYear}-01-01`,
      to: `${currentYear}-12-31`,
      label: `Année ${currentYear}`,
      isDefault: false,
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // 2. "année dernière" / "l'an dernier" (sans mois spécifique)
  // ════════════════════════════════════════════════════════════
  if ((hasBigram(tokenized, 'annee derniere') || hasBigram(tokenized, 'an dernier')) &&
      !hasAnyToken(tokenized, Object.keys(MOIS_MAP))) {
    return {
      from: `${currentYear - 1}-01-01`,
      to: `${currentYear - 1}-12-31`,
      label: `Année ${currentYear - 1}`,
      isDefault: false,
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // 3. "ce mois" / "ce mois-ci"
  // ════════════════════════════════════════════════════════════
  if (hasBigram(tokenized, 'ce mois') || hasToken(tokenized, 'cemois')) {
    const lastDay = getLastDayOfMonth(currentYear, currentMonth);
    return {
      from: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      to: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`,
      label: `${getMonthName(currentMonth)} ${currentYear}`,
      isDefault: false,
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // 4. "mois dernier"
  // ════════════════════════════════════════════════════════════
  if (hasBigram(tokenized, 'mois dernier')) {
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const year = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastDay = getLastDayOfMonth(year, lastMonth);
    return {
      from: `${year}-${String(lastMonth + 1).padStart(2, '0')}-01`,
      to: `${year}-${String(lastMonth + 1).padStart(2, '0')}-${lastDay}`,
      label: `${getMonthName(lastMonth)} ${year}`,
      isDefault: false,
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // 5. Mois spécifique (ex: "en avril", "avril 2024", "mars l'an dernier")
  // ════════════════════════════════════════════════════════════
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAP)) {
    if (hasToken(tokenized, moisName)) {
      let year: number;
      
      // Année explicitement mentionnée ?
      const explicitYear = extractYear(normalized);
      if (explicitYear) {
        year = explicitYear;
      } else if (mentionsLastYear(tokenized)) {
        // "en mars l'an dernier"
        year = currentYear - 1;
      } else {
        // Logique "dernier mois clos":
        // Si le mois demandé est dans le futur par rapport au mois actuel → année précédente
        if (moisIndex > currentMonth) {
          year = currentYear - 1;
        } else {
          year = currentYear;
        }
      }
      
      const lastDay = getLastDayOfMonth(year, moisIndex);
      return {
        from: `${year}-${String(moisIndex + 1).padStart(2, '0')}-01`,
        to: `${year}-${String(moisIndex + 1).padStart(2, '0')}-${lastDay}`,
        label: `${getMonthName(moisIndex)} ${year}`,
        isDefault: false,
      };
    }
  }
  
  // ════════════════════════════════════════════════════════════
  // 6. Semestre / Trimestre (optionnel, simplifié)
  // ════════════════════════════════════════════════════════════
  if (hasToken(tokenized, 's1') || hasBigram(tokenized, 'premier semestre')) {
    return {
      from: `${currentYear}-01-01`,
      to: `${currentYear}-06-30`,
      label: `S1 ${currentYear}`,
      isDefault: false,
    };
  }
  if (hasToken(tokenized, 's2') || hasBigram(tokenized, 'second semestre') || hasBigram(tokenized, 'deuxieme semestre')) {
    return {
      from: `${currentYear}-07-01`,
      to: `${currentYear}-12-31`,
      label: `S2 ${currentYear}`,
      isDefault: false,
    };
  }
  
  // ════════════════════════════════════════════════════════════
  // 7. Default: 12 derniers mois glissants
  // ════════════════════════════════════════════════════════════
  const start = new Date(now);
  start.setMonth(start.getMonth() - 12);
  start.setDate(1);
  const end = new Date(currentYear, currentMonth + 1, 0);
  
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
    label: '12 derniers mois',
    isDefault: true,
  };
}
