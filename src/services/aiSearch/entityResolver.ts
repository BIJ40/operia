/**
 * StatIA AI Search - Entity Resolver
 * Résout les noms de techniciens et apporteurs dans les requêtes
 */

import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ResolvedEntities {
  technicienId?: number;
  technicienName?: string;
  apporteurId?: number;
  apporteurName?: string;
  agenceId?: string;
  agenceName?: string;
  ambiguousTechniciens?: TechnicienCandidate[];
  ambiguousApporteurs?: ApporteurCandidate[];
}

export interface TechnicienCandidate {
  id: number;
  firstname: string;
  name: string;
  fullName: string;
  matchScore: number;
  matchType: 'exact' | 'firstname' | 'lastname' | 'fuzzy';
}

export interface ApporteurCandidate {
  id: number;
  name: string;
  raisonSociale?: string;
  displayName: string;
  matchScore: number;
  matchType: 'exact' | 'partial' | 'fuzzy';
}

interface CachedTechnicien {
  id: number;
  firstname: string;
  name: string;
  normalizedFirstname: string;
  normalizedName: string;
  normalizedFull: string;
}

interface CachedApporteur {
  id: number;
  nom: string;
  raisonSociale?: string;
  normalizedNom: string;
  normalizedRaisonSociale: string;
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

let techniciensCache: CachedTechnicien[] | null = null;
let apporteursCache: CachedApporteur[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════
// NORMALISATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise un texte : minuscule, sans accents, sans ponctuation
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime accents
    .replace(/[^a-z0-9\s]/g, ' ')    // Garde alphanumériques et espaces
    .replace(/\s+/g, ' ')            // Normalise espaces
    .trim();
}

/**
 * Extrait les mots d'une query qui ressemblent à des noms propres
 * (mots de 3+ lettres qui ne sont pas des keywords connus)
 */
const COMMON_WORDS = new Set([
  'quel', 'quelle', 'quels', 'quelles', 'combien', 'que', 'qui', 'quoi',
  'pour', 'par', 'avec', 'dans', 'sur', 'sous', 'entre', 'vers',
  'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'mes', 'tes', 'ses',
  'est', 'sont', 'etait', 'etaient', 'sera', 'seront', 'fait', 'fait',
  'rapporte', 'genere', 'realise', 'produit', 'obtenu', 'gagne',
  'chiffre', 'affaires', 'affaire', 'total', 'montant', 'somme',
  'technicien', 'techniciens', 'tech', 'techs',
  'apporteur', 'apporteurs', 'commanditaire', 'prescripteur',
  'univers', 'plomberie', 'electricite', 'vitrerie', 'serrurerie',
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  'mois', 'annee', 'trimestre', 'semaine', 'jour',
  'dernier', 'derniere', 'derniers', 'dernieres', 'cette', 'cet', 'cette',
  'top', 'meilleur', 'meilleurs', 'pire', 'pires', 'classement',
]);

export function extractPotentialNames(normalizedQuery: string): string[] {
  const words = normalizedQuery.split(' ');
  const candidates: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Skip common words and short words
    if (word.length < 3 || COMMON_WORDS.has(word)) continue;
    
    candidates.push(word);
    
    // Also try combinations (prénom + nom)
    if (i < words.length - 1) {
      const nextWord = words[i + 1];
      if (nextWord.length >= 2 && !COMMON_WORDS.has(nextWord)) {
        candidates.push(`${word} ${nextWord}`);
      }
    }
  }
  
  return candidates;
}

// ═══════════════════════════════════════════════════════════════
// FUZZY MATCHING
// ═══════════════════════════════════════════════════════════════

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calcule un ratio de similarité (0-1)
 */
export function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  
  return 1 - (distance / maxLen);
}

const FUZZY_THRESHOLD = 0.72;

// ═══════════════════════════════════════════════════════════════
// CHARGEMENT DES DONNÉES
// ═══════════════════════════════════════════════════════════════

/**
 * Charge et met en cache les techniciens depuis Apogée (via users)
 */
async function loadTechniciens(agencySlug: string): Promise<CachedTechnicien[]> {
  const now = Date.now();
  
  if (techniciensCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return techniciensCache;
  }
  
  try {
    // Call edge function to get users from Apogée
    const { data, error } = await supabase.functions.invoke('proxy-apogee', {
      body: {
        endpoint: 'apiGetUsers',
        agencySlug,
        params: {},
      },
    });
    
    if (error) {
      console.error('[EntityResolver] Error loading techniciens:', error);
      return techniciensCache || [];
    }
    
    const users = data?.data || [];
    
    techniciensCache = users
      .filter((u: any) => {
        // Only active technicians
        if (u?.is_on !== true) return false;
        const hasUniverses = Array.isArray(u?.data?.universes) && u.data.universes.length > 0;
        return u?.isTechnicien === true || 
               u?.type === 'technicien' ||
               (u?.type === 'utilisateur' && hasUniverses);
      })
      .map((u: any) => ({
        id: u.id,
        firstname: (u.firstname || '').trim(),
        name: (u.name || '').trim(),
        normalizedFirstname: normalizeText(u.firstname || ''),
        normalizedName: normalizeText(u.name || ''),
        normalizedFull: normalizeText(`${u.firstname || ''} ${u.name || ''}`),
      }));
    
    cacheTimestamp = now;
    return techniciensCache;
  } catch (err) {
    console.error('[EntityResolver] Error loading techniciens:', err);
    return techniciensCache || [];
  }
}

/**
 * Charge et met en cache les apporteurs depuis Apogée (via clients)
 */
async function loadApporteurs(agencySlug: string): Promise<CachedApporteur[]> {
  const now = Date.now();
  
  if (apporteursCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return apporteursCache;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('proxy-apogee', {
      body: {
        endpoint: 'apiGetClients',
        agencySlug,
        params: { type: 'apporteur' },
      },
    });
    
    if (error) {
      console.error('[EntityResolver] Error loading apporteurs:', error);
      return apporteursCache || [];
    }
    
    const clients = data?.data || [];
    
    apporteursCache = clients
      .filter((c: any) => c?.type === 'apporteur' || c?.isApporteur)
      .map((c: any) => ({
        id: c.id,
        nom: c.nom || c.name || '',
        raisonSociale: c.raisonSociale || c.raison_sociale || '',
        normalizedNom: normalizeText(c.nom || c.name || ''),
        normalizedRaisonSociale: normalizeText(c.raisonSociale || c.raison_sociale || ''),
      }));
    
    cacheTimestamp = now;
    return apporteursCache;
  } catch (err) {
    console.error('[EntityResolver] Error loading apporteurs:', err);
    return apporteursCache || [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MATCHING TECHNICIENS
// ═══════════════════════════════════════════════════════════════

function matchTechnicien(
  query: string,
  techniciens: CachedTechnicien[]
): TechnicienCandidate[] {
  const normalizedQuery = normalizeText(query);
  const potentialNames = extractPotentialNames(normalizedQuery);
  const matches: TechnicienCandidate[] = [];
  
  for (const tech of techniciens) {
    let bestScore = 0;
    let bestType: TechnicienCandidate['matchType'] = 'fuzzy';
    
    for (const name of potentialNames) {
      // Exact match on full name
      if (name === tech.normalizedFull) {
        bestScore = 1;
        bestType = 'exact';
        break;
      }
      
      // Exact match on firstname
      if (name === tech.normalizedFirstname && tech.normalizedFirstname.length >= 3) {
        const score = 0.95;
        if (score > bestScore) {
          bestScore = score;
          bestType = 'firstname';
        }
      }
      
      // Exact match on lastname
      if (name === tech.normalizedName && tech.normalizedName.length >= 3) {
        const score = 0.9;
        if (score > bestScore) {
          bestScore = score;
          bestType = 'lastname';
        }
      }
      
      // Fuzzy match on full name
      const fullRatio = similarityRatio(name, tech.normalizedFull);
      if (fullRatio >= FUZZY_THRESHOLD && fullRatio > bestScore) {
        bestScore = fullRatio;
        bestType = 'fuzzy';
      }
      
      // Fuzzy match on firstname
      const firstRatio = similarityRatio(name, tech.normalizedFirstname);
      if (firstRatio >= FUZZY_THRESHOLD && firstRatio > bestScore) {
        bestScore = firstRatio * 0.9; // Slightly lower score for partial match
        bestType = 'fuzzy';
      }
      
      // Fuzzy match on lastname
      const lastRatio = similarityRatio(name, tech.normalizedName);
      if (lastRatio >= FUZZY_THRESHOLD && lastRatio > bestScore) {
        bestScore = lastRatio * 0.85;
        bestType = 'fuzzy';
      }
    }
    
    if (bestScore >= FUZZY_THRESHOLD) {
      matches.push({
        id: tech.id,
        firstname: tech.firstname,
        name: tech.name,
        fullName: `${tech.firstname} ${tech.name}`.trim(),
        matchScore: bestScore,
        matchType: bestType,
      });
    }
  }
  
  // Sort by score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// ═══════════════════════════════════════════════════════════════
// MATCHING APPORTEURS
// ═══════════════════════════════════════════════════════════════

function matchApporteur(
  query: string,
  apporteurs: CachedApporteur[]
): ApporteurCandidate[] {
  const normalizedQuery = normalizeText(query);
  const potentialNames = extractPotentialNames(normalizedQuery);
  const matches: ApporteurCandidate[] = [];
  
  // Also check if common apporteur names appear directly in query
  const commonApporteurs = ['axa', 'groupama', 'maif', 'matmut', 'macif', 'generali', 'allianz'];
  for (const common of commonApporteurs) {
    if (normalizedQuery.includes(common)) {
      potentialNames.push(common);
    }
  }
  
  for (const app of apporteurs) {
    let bestScore = 0;
    let bestType: ApporteurCandidate['matchType'] = 'fuzzy';
    
    for (const name of potentialNames) {
      // Exact match on nom
      if (name === app.normalizedNom) {
        bestScore = 1;
        bestType = 'exact';
        break;
      }
      
      // Exact match on raison sociale
      if (app.normalizedRaisonSociale && name === app.normalizedRaisonSociale) {
        const score = 0.95;
        if (score > bestScore) {
          bestScore = score;
          bestType = 'exact';
        }
      }
      
      // Partial match (name contained in raison sociale or vice versa)
      if (app.normalizedRaisonSociale.includes(name) || app.normalizedNom.includes(name)) {
        const score = 0.85;
        if (score > bestScore) {
          bestScore = score;
          bestType = 'partial';
        }
      }
      
      // Fuzzy match
      const nomRatio = similarityRatio(name, app.normalizedNom);
      if (nomRatio >= FUZZY_THRESHOLD && nomRatio > bestScore) {
        bestScore = nomRatio;
        bestType = 'fuzzy';
      }
      
      if (app.normalizedRaisonSociale) {
        const rsRatio = similarityRatio(name, app.normalizedRaisonSociale);
        if (rsRatio >= FUZZY_THRESHOLD && rsRatio > bestScore) {
          bestScore = rsRatio;
          bestType = 'fuzzy';
        }
      }
    }
    
    if (bestScore >= FUZZY_THRESHOLD) {
      matches.push({
        id: app.id,
        name: app.nom,
        raisonSociale: app.raisonSociale,
        displayName: app.raisonSociale || app.nom,
        matchScore: bestScore,
        matchType: bestType,
      });
    }
  }
  
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

/**
 * Résout les entités nommées (techniciens, apporteurs) dans une requête
 */
export async function resolveEntities(
  query: string,
  agencySlug: string
): Promise<ResolvedEntities> {
  const result: ResolvedEntities = {};
  
  if (!agencySlug) {
    console.warn('[EntityResolver] No agencySlug provided');
    return result;
  }
  
  // Load data in parallel
  const [techniciens, apporteurs] = await Promise.all([
    loadTechniciens(agencySlug),
    loadApporteurs(agencySlug),
  ]);
  
  // Match techniciens
  const techMatches = matchTechnicien(query, techniciens);
  
  if (techMatches.length === 1 && techMatches[0].matchScore >= 0.85) {
    // Single confident match
    result.technicienId = techMatches[0].id;
    result.technicienName = techMatches[0].fullName;
  } else if (techMatches.length > 1) {
    // Multiple matches - return ambiguity
    result.ambiguousTechniciens = techMatches.slice(0, 5);
  } else if (techMatches.length === 1) {
    // Single low-confidence match - still ambiguous
    result.ambiguousTechniciens = techMatches;
  }
  
  // Match apporteurs
  const appMatches = matchApporteur(query, apporteurs);
  
  if (appMatches.length === 1 && appMatches[0].matchScore >= 0.85) {
    result.apporteurId = appMatches[0].id;
    result.apporteurName = appMatches[0].displayName;
  } else if (appMatches.length > 1) {
    result.ambiguousApporteurs = appMatches.slice(0, 5);
  } else if (appMatches.length === 1) {
    result.ambiguousApporteurs = appMatches;
  }
  
  return result;
}

/**
 * Invalide le cache des entités
 */
export function invalidateEntityCache(): void {
  techniciensCache = null;
  apporteursCache = null;
  cacheTimestamp = 0;
}

/**
 * Vérifie si la query contient potentiellement un nom propre non résolu
 */
export function hasPotentialUnresolvedName(query: string): boolean {
  const normalizedQuery = normalizeText(query);
  const potentialNames = extractPotentialNames(normalizedQuery);
  return potentialNames.length > 0;
}
