/**
 * StatIA AI Search - Normalisation NL
 * Une seule normalisation par requête pour performance optimale
 */

// ═══════════════════════════════════════════════════════════════
// NORMALISATION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise une requête utilisateur pour le matching
 * - Minuscules
 * - Suppression accents
 * - Normalisation ponctuation
 * - Correction typos courantes
 */
export function normalizeQuery(query: string): string {
  if (!query || typeof query !== 'string') return '';
  
  let normalized = query
    .toLowerCase()
    .trim()
    // Normalisation unicode
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Ponctuation → espaces
    .replace(/[.,;:!?'"()[\]{}]/g, ' ')
    // Tirets → espaces
    .replace(/[-–—]/g, ' ')
    // Apostrophes normalisées
    .replace(/['`']/g, "'")
    // Espaces multiples → simple
    .replace(/\s+/g, ' ')
    .trim();

  // Corrections typos courantes
  normalized = applyTypoCorrections(normalized);

  return normalized;
}

// ═══════════════════════════════════════════════════════════════
// CORRECTIONS TYPOS
// ═══════════════════════════════════════════════════════════════

const TYPO_MAP: Record<string, string> = {
  // Stats
  'chifre': 'chiffre',
  'chifres': 'chiffres',
  'chiffres d affaires': 'chiffre affaires',
  'ca': 'chiffre affaires',
  'c.a.': 'chiffre affaires',
  'c a': 'chiffre affaires',
  
  // Recouvrement
  'recouvremnt': 'recouvrement',
  'recouvrment': 'recouvrement',
  'encour': 'encours',
  'en cours': 'encours',
  'impaye': 'impaye',
  'impayes': 'impayes',
  
  // SAV
  's.a.v.': 'sav',
  's a v': 'sav',
  'service apres vente': 'sav',
  'apres vente': 'sav',
  
  // Techniciens
  'technicen': 'technicien',
  'techniciens': 'technicien',
  'techs': 'technicien',
  'tech': 'technicien',
  
  // Apporteurs
  'apporteur': 'apporteur',
  'apporteurs': 'apporteur',
  'commanditaire': 'apporteur',
  'commanditaires': 'apporteur',
  'prescripteur': 'apporteur',
  
  // Univers
  'electricite': 'electricite',
  'elec': 'electricite',
  'plombrie': 'plomberie',
  'plomebrie': 'plomberie',
  'vitreri': 'vitrerie',
  'serrurrie': 'serrurerie',
  'peintre': 'peinture',
  'plaquist': 'plaquiste',
  'clim': 'climatisation',
  'chauffag': 'chauffage',
  
  // Périodes
  'anee': 'annee',
  'anne': 'annee',
  'moi': 'mois',
  'semain': 'semaine',
  'trimestre': 'trimestre',
  'trismestre': 'trimestre',
  
  // Devis
  'devi': 'devis',
  'deivs': 'devis',
  
  // Dossiers
  'dossie': 'dossier',
  'dosier': 'dossier',
  
  // Interventions
  'interv': 'intervention',
  'interventions': 'intervention',
  
  // Actions
  'ouvre': 'ouvrir',
  'affiche': 'afficher',
  'montre': 'montrer',
  'voir': 'voir',
};

function applyTypoCorrections(text: string): string {
  let result = text;
  
  // Appliquer les corrections (ordre: plus long d'abord)
  const sortedEntries = Object.entries(TYPO_MAP)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [typo, correction] of sortedEntries) {
    // Remplacer les mots entiers uniquement
    const regex = new RegExp(`\\b${escapeRegex(typo)}\\b`, 'g');
    result = result.replace(regex, correction);
  }
  
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ═══════════════════════════════════════════════════════════════
// TOKENISATION
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait les tokens significatifs d'une requête normalisée
 */
export function tokenize(normalizedQuery: string): string[] {
  const STOP_WORDS = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'a', 'au', 'aux',
    'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'ce', 'cette', 'ces', 'cet',
    'qui', 'que', 'quoi', 'dont', 'ou',
    'est', 'sont', 'a', 'ont', 'ete', 'etre', 'avoir',
    'pour', 'par', 'avec', 'sans', 'sur', 'sous', 'dans', 'en',
    'plus', 'moins', 'tres', 'bien', 'mal',
    'si', 'ne', 'pas', 'rien', 'tout', 'tous', 'toutes',
    'quel', 'quelle', 'quels', 'quelles',
    'combien', 'comment', 'pourquoi', 'quand',
  ]);
  
  return normalizedQuery
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOP_WORDS.has(token));
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION NOMBRES
// ═══════════════════════════════════════════════════════════════

/**
 * Extrait les nombres d'une requête (pour top N, dates, montants)
 */
export function extractNumbers(query: string): number[] {
  const matches = query.match(/\d+/g);
  return matches ? matches.map(Number) : [];
}

/**
 * Extrait un top N (ex: "top 5", "les 10 premiers")
 */
export function extractTopN(query: string): number | null {
  const patterns = [
    /top\s*(\d+)/i,
    /les?\s*(\d+)\s*(premier|meilleur)/i,
    /(\d+)\s*(premier|meilleur)/i,
    /classement\s*(\d+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n <= 100) return n;
    }
  }
  
  return null;
}
