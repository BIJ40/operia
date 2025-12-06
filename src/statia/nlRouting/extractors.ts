/**
 * StatIA NL Routing - Extractors
 * Fonctions d'extraction d'entités depuis le texte naturel
 */

import { ParsedPeriod, DimensionType, IntentType } from './types';
import { 
  UNIVERS_ALIASES, 
  MOIS_MAPPING, 
  DIMENSION_KEYWORDS, 
  INTENT_KEYWORDS,
  TYPO_CORRECTIONS,
} from './dictionaries';

// ============= TEXT NORMALIZATION =============

/**
 * Normalise le texte pour une meilleure extraction
 */
export function normalizeQuery(query: string): string {
  let normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ' ')
    .trim();
  
  // Apply typo corrections
  for (const [typo, correction] of Object.entries(TYPO_CORRECTIONS)) {
    normalized = normalized.replace(new RegExp(typo, 'gi'), correction);
  }
  
  return normalized;
}

// ============= UNIVERS EXTRACTION =============

/**
 * Extrait l'univers de la requête
 */
export function extractUnivers(query: string): string | undefined {
  const normalized = normalizeQuery(query);
  
  // Sort by length descending to match longest first (e.g., "recherche de fuite" before "fuite")
  const sortedAliases = Object.entries(UNIVERS_ALIASES)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, univers] of sortedAliases) {
    const normalizedAlias = alias.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(normalizedAlias)) {
      return univers;
    }
  }
  return undefined;
}

// ============= PERIOD EXTRACTION =============

function getMonthName(monthIndex: number): string {
  const names = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];
  return names[monthIndex] || '';
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

/**
 * Extrait la période de la requête
 */
export function extractPeriode(query: string, now = new Date()): ParsedPeriod | undefined {
  const normalized = normalizeQuery(query);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // "cette année"
  if (normalized.includes('cette annee') || normalized.includes('cette année')) {
    return {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
      label: `Année ${currentYear}`,
      isDefault: false,
    };
  }

  // "année dernière" / "l'année passée"
  if (normalized.includes('annee derniere') || normalized.includes("l'annee derniere") ||
      normalized.includes('année dernière') || normalized.includes('année passée')) {
    return {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
      label: `Année ${currentYear - 1}`,
      isDefault: false,
    };
  }

  // "exercice 2024" / "exercice 2023"
  const exerciceMatch = normalized.match(/exercice\s*(20\d{2})/);
  if (exerciceMatch) {
    const year = parseInt(exerciceMatch[1]);
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      label: `Exercice ${year}`,
      isDefault: false,
    };
  }

  // "dernier exercice"
  if (normalized.includes('dernier exercice')) {
    return {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
      label: `Exercice ${currentYear - 1}`,
      isDefault: false,
    };
  }

  // "ce mois" / "ce mois-ci"
  if (normalized.includes('ce mois')) {
    return {
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentMonth + 1, 0),
      label: `${getMonthName(currentMonth)} ${currentYear}`,
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
      label: `${getMonthName(lastMonth)} ${year}`,
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

  // Range pattern "juin / juillet", "de juin à juillet"
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

  // Single month "en janvier", "au mois de janvier", "sur janvier"
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    const patterns = [
      new RegExp(`en ${moisName}\\b`, 'i'),
      new RegExp(`mois de ${moisName}\\b`, 'i'),
      new RegExp(`mois d'${moisName}\\b`, 'i'),
      new RegExp(`au ${moisName}\\b`, 'i'),
      new RegExp(`sur ${moisName}\\b`, 'i'),
      new RegExp(`\\b${moisName}\\s+20\\d{2}\\b`, 'i'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        const yearMatch = normalized.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        return {
          start: new Date(year, moisIndex, 1),
          end: new Date(year, moisIndex + 1, 0),
          label: `${getMonthName(moisIndex)} ${year}`,
          isDefault: false,
        };
      }
    }
  }

  return undefined;
}

// ============= TOP N EXTRACTION =============

/**
 * Extrait le nombre de résultats pour un classement (top N)
 */
export function extractTopN(query: string): number | undefined {
  const normalized = normalizeQuery(query);
  
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

  // Default "meilleurs" without number = 3
  if (normalized.includes('meilleur') || normalized.includes('top')) {
    return 3;
  }

  return undefined;
}

// ============= TECHNICIAN NAME EXTRACTION =============

/**
 * Extrait un nom de technicien potentiel
 */
export function extractTechnicienName(query: string): string | undefined {
  const reservedWords = new Set([
    'ca', 'janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre',
    'electricite', 'électricité', 'plomberie', 'serrurerie', 'vitrerie',
    'volet', 'volets', 'top', 'meilleur', 'technicien', 'tech',
    'apporteur', 'univers', 'dossier', 'combien', 'moyenne', 'sav',
    'cette', 'année', 'annee', 'mois', 'dernier', 'premiers',
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

// ============= DIMENSION & INTENT DETECTION =============

/**
 * Détecte la dimension de la requête
 */
export function detectDimension(query: string): DimensionType {
  const normalized = normalizeQuery(query);

  for (const [dimension, keywords] of Object.entries(DIMENSION_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return dimension as DimensionType;
    }
  }

  // Fallback: if univers is detected → dimension univers
  if (extractUnivers(query)) {
    return 'univers';
  }

  return 'global';
}

/**
 * Détecte l'intent de la requête
 */
export function detectIntent(query: string): IntentType {
  const normalized = normalizeQuery(query);

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return intent as IntentType;
    }
  }

  return 'valeur';
}

// ============= COMPARISON EXTRACTION =============

/**
 * Extrait une demande de comparaison N-1
 */
export function extractComparison(query: string): { baseline: 'N-1' | 'previous_period' } | null {
  const normalized = normalizeQuery(query);
  
  if (normalized.includes('par rapport') || 
      normalized.includes('vs') || 
      normalized.includes('compare') ||
      normalized.includes('evolution') ||
      normalized.includes('progression')) {
    
    if (normalized.includes('an dernier') || 
        normalized.includes('annee derniere') ||
        normalized.includes('l\'an passe')) {
      return { baseline: 'N-1' };
    }
    
    return { baseline: 'previous_period' };
  }
  
  return null;
}
