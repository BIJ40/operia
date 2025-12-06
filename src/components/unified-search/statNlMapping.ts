/**
 * Mapping NL → Métriques StatIA
 * Service de parsing des requêtes en langage naturel vers des métriques StatIA
 */

import { StatNLMapping, ParsedStatQuery } from './types';

/**
 * Registre des métriques adressables en langage naturel
 */
export const STAT_NL_MAPPING: StatNLMapping[] = [
  {
    id: 'ca_par_technicien',
    label: 'CA par technicien',
    keywords: ['ca', 'chiffre', 'technicien', 'tech', 'ouvrier', 'intervenant', 'fait le plus', 'top', 'meilleur', 'rapporte'],
    examples: [
      'quel est le technicien qui a fait le plus de chiffre',
      'top technicien',
      'meilleur technicien',
      'qui a fait le plus de CA',
    ],
    supportedFilters: ['univers', 'periode', 'technicien'],
    dimensions: ['technicien', 'univers'],
  },
  {
    id: 'ca_par_univers',
    label: 'CA par univers',
    keywords: ['ca', 'chiffre', 'univers', 'métier', 'domaine', 'électricité', 'plomberie', 'serrurerie', 'vitrerie', 'volet'],
    examples: [
      'ca en électricité',
      'chiffre en plomberie',
      'combien en serrurerie',
    ],
    supportedFilters: ['univers', 'periode'],
    dimensions: ['univers'],
  },
  {
    id: 'nb_dossiers_crees',
    label: 'Nombre de dossiers',
    keywords: ['dossiers', 'nombre de dossiers', 'volume', 'combien', 'dossier', 'projets', 'affaires'],
    examples: [
      'combien j\'ai eu de dossiers',
      'nombre de dossiers en vitrerie',
      'volume de dossiers',
    ],
    supportedFilters: ['univers', 'periode'],
    dimensions: ['univers'],
  },
  {
    id: 'ca_moyen_par_tech',
    label: 'CA moyen par technicien',
    keywords: ['moyenne', 'ca moyen', 'rapportent', 'en moyenne', 'combien rapporte', 'moyen'],
    examples: [
      'en moyenne combien me rapporte un serrurier',
      'ca moyen d\'un technicien',
      'combien rapporte un électricien en moyenne',
    ],
    supportedFilters: ['univers', 'periode'],
    dimensions: ['technicien'],
  },
  {
    id: 'taux_sav_global',
    label: 'Taux de SAV',
    keywords: ['sav', 'service après vente', 'garantie', 'retour', 'taux sav', 'pourcentage sav'],
    examples: [
      'quel est mon taux de SAV',
      'pourcentage de SAV',
    ],
    supportedFilters: ['univers', 'periode'],
    dimensions: ['univers'],
  },
  {
    id: 'taux_transformation_devis',
    label: 'Taux de transformation devis',
    keywords: ['taux transformation', 'devis', 'transformation', 'conversion', 'taux devis'],
    examples: [
      'taux de transformation des devis',
      'combien de devis transformés',
    ],
    supportedFilters: ['periode'],
    dimensions: [],
  },
  {
    id: 'ca_global_ht',
    label: 'CA global HT',
    keywords: ['ca global', 'chiffre affaires', 'ca total', 'combien', 'fait'],
    examples: [
      'combien j\'ai fait de CA',
      'chiffre d\'affaires total',
    ],
    supportedFilters: ['periode'],
    dimensions: [],
  },
];

/**
 * Dictionnaire des univers pour extraction
 */
const UNIVERS_KEYWORDS: Record<string, string> = {
  'électricité': 'electricite',
  'electricite': 'electricite',
  'elec': 'electricite',
  'électrique': 'electricite',
  'plomberie': 'plomberie',
  'plomber': 'plomberie',
  'plombier': 'plomberie',
  'serrurerie': 'serrurerie',
  'serrurier': 'serrurerie',
  'serrure': 'serrurerie',
  'vitrerie': 'vitrerie',
  'vitrier': 'vitrerie',
  'vitre': 'vitrerie',
  'volet': 'volet_roulant',
  'volets': 'volet_roulant',
  'volet roulant': 'volet_roulant',
  'volets roulants': 'volet_roulant',
  'menuiserie': 'menuiserie',
  'menuisier': 'menuiserie',
  'peinture': 'peinture',
  'peintre': 'peinture',
  'carrelage': 'carrelage',
  'carreleur': 'carrelage',
  'maçonnerie': 'maconnerie',
  'maçon': 'maconnerie',
};

/**
 * Dictionnaire des périodes pour extraction
 */
const MOIS_MAPPING: Record<string, number> = {
  'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
  'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
  'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11,
  // Variantes
  'jan': 0, 'fev': 1, 'fév': 1, 'mar': 2, 'avr': 3,
  'juil': 6, 'aout': 7, 'sept': 8, 'oct': 9, 'nov': 10, 'dec': 11, 'déc': 11,
};

/**
 * Extrait l'univers d'une requête
 */
function extractUnivers(query: string): string | undefined {
  const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [keyword, univers] of Object.entries(UNIVERS_KEYWORDS)) {
    const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedQuery.includes(normalizedKeyword)) {
      return univers;
    }
  }
  return undefined;
}

/**
 * Extrait la période d'une requête
 */
function extractPeriode(query: string): { start: Date; end: Date } | undefined {
  const normalizedQuery = query.toLowerCase();
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // "cette année"
  if (normalizedQuery.includes('cette année') || normalizedQuery.includes('cette annee')) {
    return {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    };
  }
  
  // "année dernière" / "l'année passée"
  if (normalizedQuery.includes('année dernière') || normalizedQuery.includes('annee derniere') || normalizedQuery.includes('année passée')) {
    return {
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
    };
  }
  
  // "ce mois" / "ce mois-ci"
  if (normalizedQuery.includes('ce mois')) {
    return {
      start: new Date(currentYear, now.getMonth(), 1),
      end: new Date(currentYear, now.getMonth() + 1, 0),
    };
  }
  
  // "mois dernier"
  if (normalizedQuery.includes('mois dernier')) {
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const year = now.getMonth() === 0 ? currentYear - 1 : currentYear;
    return {
      start: new Date(year, lastMonth, 1),
      end: new Date(year, lastMonth + 1, 0),
    };
  }
  
  // "en avril", "au mois d'avril", etc.
  for (const [moisName, moisIndex] of Object.entries(MOIS_MAPPING)) {
    const patterns = [
      `en ${moisName}`,
      `mois de ${moisName}`,
      `mois d'${moisName}`,
      `au ${moisName}`,
      `${moisName} `,
    ];
    
    for (const pattern of patterns) {
      if (normalizedQuery.includes(pattern)) {
        // Vérifier si une année est mentionnée
        const yearMatch = normalizedQuery.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        
        return {
          start: new Date(year, moisIndex, 1),
          end: new Date(year, moisIndex + 1, 0),
        };
      }
    }
  }
  
  // Plage de mois "juin / juillet", "de juin à juillet"
  const rangePatterns = [
    /(?:de\s+)?(\w+)\s*(?:\/|à|a)\s*(\w+)/,
    /(?:sur\s+)?(\w+)\s*(?:\/|et)\s*(\w+)/,
  ];
  
  for (const pattern of rangePatterns) {
    const match = normalizedQuery.match(pattern);
    if (match) {
      const [, month1, month2] = match;
      const index1 = MOIS_MAPPING[month1];
      const index2 = MOIS_MAPPING[month2];
      
      if (index1 !== undefined && index2 !== undefined) {
        const yearMatch = normalizedQuery.match(/20\d{2}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : currentYear;
        
        return {
          start: new Date(year, index1, 1),
          end: new Date(year, index2 + 1, 0),
        };
      }
    }
  }
  
  return undefined;
}

/**
 * Détecte si une requête concerne des statistiques
 */
export function detectStatsIntent(query: string): boolean {
  const normalizedQuery = query.toLowerCase();
  
  const statsKeywords = [
    'combien', 'ca', 'chiffre', 'dossiers', 'en moyenne', 
    'le plus', 'top', 'meilleur', 'technicien', 'taux',
    'sav', 'transformation', 'volume', 'nombre', 'rapporte',
    'statistique', 'stat', 'kpi', 'indicateur',
  ];
  
  return statsKeywords.some(keyword => normalizedQuery.includes(keyword));
}

/**
 * Parse une requête en langage naturel et retourne la métrique StatIA correspondante
 */
export function parseStatQuery(query: string): ParsedStatQuery | null {
  const normalizedQuery = query.toLowerCase();
  
  // Trouver la métrique la plus probable
  let bestMatch: { mapping: StatNLMapping; score: number } | null = null;
  
  for (const mapping of STAT_NL_MAPPING) {
    let score = 0;
    
    // Score basé sur les keywords
    for (const keyword of mapping.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += keyword.length; // Poids basé sur la longueur du mot-clé
      }
    }
    
    // Bonus pour les exemples similaires
    for (const example of mapping.examples) {
      const normalizedExample = example.toLowerCase();
      const words = normalizedExample.split(/\s+/);
      const matchingWords = words.filter(word => normalizedQuery.includes(word));
      score += matchingWords.length * 2;
    }
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { mapping, score };
    }
  }
  
  if (!bestMatch) {
    return null;
  }
  
  // Extraire les filtres
  const univers = extractUnivers(query);
  const periode = extractPeriode(query);
  
  // Calculer la confiance
  const maxPossibleScore = bestMatch.mapping.keywords.length * 10 + bestMatch.mapping.examples.length * 10;
  const confidence = Math.min(bestMatch.score / maxPossibleScore, 1);
  
  return {
    metricId: bestMatch.mapping.id,
    metricLabel: bestMatch.mapping.label,
    filters: {
      univers,
      periode,
    },
    confidence,
  };
}
