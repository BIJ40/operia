/**
 * StatIA AI Search - Entity Resolver
 * Résolution d'entités métier dans une requête NL :
 * - techniciens (users)
 * - apporteurs (clients)
 * - agences (facultatif)
 *
 * Objectif : transformer "yoann", "maxime", "AXA" en IDs Apogée
 * pour alimenter les filtres StatIA.
 */

import { supabase } from '@/integrations/supabase/client';
import { logError, logWarn } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface TechnicianEntity {
  id: number | string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  displayName?: string | null;
}

export interface ApporteurEntity {
  id: number | string;
  name?: string | null;
  company?: string | null;
  label?: string | null;
}

export interface AgencyEntity {
  id: number | string;
  name?: string | null;
  city?: string | null;
  code?: string | null;
}

export interface ResolvedEntities {
  technicienId?: number | string;
  technicienName?: string;
  apporteurId?: number | string;
  apporteurName?: string;
  agenceId?: number | string;
  agenceName?: string;

  // pour gérer les cas ambigus côté UI
  technicienCandidates?: TechnicianEntity[];
  apporteurCandidates?: ApporteurEntity[];
  agenceCandidates?: AgencyEntity[];
  
  // Legacy aliases
  ambiguousTechniciens?: TechnicienCandidate[];
  ambiguousApporteurs?: ApporteurCandidate[];
}

export interface TechnicienCandidate extends TechnicianEntity {
  id: number;
  name?: string;
  firstname?: string;
  fullName: string;
  matchType: 'exact' | 'firstname' | 'lastname' | 'partial' | 'fuzzy';
  matchScore: number;
}

export interface ApporteurCandidate extends ApporteurEntity {
  id: number;
  displayName: string;
  raisonSociale?: string;
  matchType: 'exact' | 'partial' | 'fuzzy';
  matchScore: number;
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
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const MIN_SIMILARITY_STRICT = 0.88;
const MIN_SIMILARITY_FUZZY = 0.72;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

let techniciensCache: CachedTechnicien[] | null = null;
let apporteursCache: CachedApporteur[] | null = null;
let cacheTimestamp = 0;

// ═══════════════════════════════════════════════════════════════
// NORMALISATION BAS NIVEAU
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise un texte : minuscule, sans accents, sans ponctuation
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Similarité simple basée sur le coefficient de Dice (bi-grammes).
 * Suffisant pour des prénoms / noms / labels courts.
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = normalizeText(a);
  const s2 = normalizeText(b);
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const bigrams = (s: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) {
      out.push(s.slice(i, i + 2));
    }
    return out;
  };

  const b1 = bigrams(s1);
  const b2 = bigrams(s2);
  if (!b1.length || !b2.length) return 0;

  const set = new Set(b1);
  let common = 0;
  for (const g of b2) {
    if (set.has(g)) common++;
  }

  return (2 * common) / (b1.length + b2.length);
}

// Alias pour compatibilité
export const similarityRatio = stringSimilarity;

// ═══════════════════════════════════════════════════════════════
// EXTRACTION DE NOMS POTENTIELS
// ═══════════════════════════════════════════════════════════════

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

function extractPotentialNames(normalizedQuery: string): string[] {
  const words = normalizedQuery.split(' ');
  const candidates: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
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
// CHARGEMENT DES DONNÉES DEPUIS APOGÉE
// ═══════════════════════════════════════════════════════════════

async function loadTechniciens(agencySlug: string): Promise<CachedTechnicien[]> {
  const now = Date.now();
  
  if (techniciensCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return techniciensCache;
  }
  
  try {
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
    logError('ENTITY_RESOLVER', 'Error loading techniciens', { error: err });
    return techniciensCache || [];
  }
}

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
      logError('ENTITY_RESOLVER', 'Error loading apporteurs', { error });
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
    logError('ENTITY_RESOLVER', 'Error loading apporteurs', { error: err });
    return apporteursCache || [];
  }
}

// ═══════════════════════════════════════════════════════════════
// RÉSOLUTION TECHNICIEN
// ═══════════════════════════════════════════════════════════════

function buildTechnicianLabels(t: CachedTechnicien): string[] {
  const labels: string[] = [];
  if (t.normalizedFull) labels.push(t.normalizedFull);
  labels.push(`${t.normalizedFirstname} ${t.normalizedName}`);
  labels.push(`${t.normalizedName} ${t.normalizedFirstname}`);
  if (t.normalizedFirstname) labels.push(t.normalizedFirstname);
  if (t.normalizedName) labels.push(t.normalizedName);
  return labels.filter(l => l.trim().length > 0);
}

function determineMatchType(
  qNorm: string, 
  tech: CachedTechnicien, 
  score: number
): 'exact' | 'firstname' | 'lastname' | 'partial' | 'fuzzy' {
  if (qNorm === tech.normalizedFull) return 'exact';
  if (qNorm === `${tech.normalizedFirstname} ${tech.normalizedName}` || 
      qNorm === `${tech.normalizedName} ${tech.normalizedFirstname}`) return 'exact';
  if (qNorm === tech.normalizedFirstname) return 'firstname';
  if (qNorm === tech.normalizedName) return 'lastname';
  if (score >= MIN_SIMILARITY_STRICT) return 'partial';
  return 'fuzzy';
}

function matchTechnicien(
  query: string,
  techniciens: CachedTechnicien[]
): TechnicienCandidate[] {
  const normalizedQuery = normalizeText(query);
  const potentialNames = extractPotentialNames(normalizedQuery);
  const matches: TechnicienCandidate[] = [];
  
  for (const tech of techniciens) {
    const labels = buildTechnicianLabels(tech);
    let maxScore = 0;
    
    for (const name of potentialNames) {
      for (const label of labels) {
        const sim = stringSimilarity(name, label);
        if (sim > maxScore) maxScore = sim;
        
        // Bonus si le nom est inclus dans la query
        if (label && normalizedQuery.includes(label)) {
          maxScore = Math.max(maxScore, 1);
        }
      }
    }
    
    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      matches.push({
        id: tech.id,
        firstname: tech.firstname,
        name: tech.name,
        firstName: tech.firstname,
        lastName: tech.name,
        fullName: `${tech.firstname} ${tech.name}`.trim(),
        displayName: `${tech.firstname} ${tech.name}`.trim(),
        matchScore: maxScore,
        matchType: determineMatchType(normalizedQuery, tech, maxScore),
      });
    }
  }
  
  // Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  return matches;
}

// ═══════════════════════════════════════════════════════════════
// RÉSOLUTION APPORTEUR
// ═══════════════════════════════════════════════════════════════

function determineApporteurMatchType(score: number): 'exact' | 'partial' | 'fuzzy' {
  if (score >= 1) return 'exact';
  if (score >= MIN_SIMILARITY_STRICT) return 'partial';
  return 'fuzzy';
}

function matchApporteur(
  query: string,
  apporteurs: CachedApporteur[]
): ApporteurCandidate[] {
  const normalizedQuery = normalizeText(query);
  const potentialNames = extractPotentialNames(normalizedQuery);
  const matches: ApporteurCandidate[] = [];
  
  // Check if common apporteur names appear directly in query
  const commonApporteurs = ['axa', 'groupama', 'maif', 'matmut', 'macif', 'generali', 'allianz'];
  for (const common of commonApporteurs) {
    if (normalizedQuery.includes(common) && !potentialNames.includes(common)) {
      potentialNames.push(common);
    }
  }
  
  for (const app of apporteurs) {
    let maxScore = 0;
    
    for (const name of potentialNames) {
      // Exact match on nom
      if (name === app.normalizedNom) {
        maxScore = 1;
        break;
      }
      
      // Exact match on raison sociale
      if (app.normalizedRaisonSociale && name === app.normalizedRaisonSociale) {
        maxScore = Math.max(maxScore, 0.95);
      }
      
      // Partial match (name contained in raison sociale or vice versa)
      if (app.normalizedRaisonSociale.includes(name) || app.normalizedNom.includes(name)) {
        maxScore = Math.max(maxScore, 0.85);
      }
      
      // Fuzzy match
      const nomRatio = stringSimilarity(name, app.normalizedNom);
      if (nomRatio >= MIN_SIMILARITY_FUZZY && nomRatio > maxScore) {
        maxScore = nomRatio;
      }
      
      if (app.normalizedRaisonSociale) {
        const rsRatio = stringSimilarity(name, app.normalizedRaisonSociale);
        if (rsRatio >= MIN_SIMILARITY_FUZZY && rsRatio > maxScore) {
          maxScore = rsRatio;
        }
      }
    }
    
    if (maxScore >= MIN_SIMILARITY_FUZZY) {
      matches.push({
        id: app.id,
        name: app.nom,
        company: app.raisonSociale,
        label: app.raisonSociale || app.nom,
        raisonSociale: app.raisonSociale,
        displayName: app.raisonSociale || app.nom,
        matchScore: maxScore,
        matchType: determineApporteurMatchType(maxScore),
      });
    }
  }
  
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  return matches;
}

// ═══════════════════════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════════════════════

/**
 * Résout les entités nommées (techniciens, apporteurs) dans une requête
 */
export async function resolveEntities(
  query: string,
  agencySlug?: string | null
): Promise<ResolvedEntities> {
  const result: ResolvedEntities = {};
  
  if (!agencySlug) {
    logWarn('ENTITY_RESOLVER', 'No agencySlug provided');
    return result;
  }
  
  // Load data in parallel
  const [techniciens, apporteurs] = await Promise.all([
    loadTechniciens(agencySlug),
    loadApporteurs(agencySlug),
  ]);
  
  // Match techniciens
  const techMatches = matchTechnicien(query, techniciens);
  
  if (techMatches.length === 1 && techMatches[0].matchScore >= MIN_SIMILARITY_STRICT) {
    // Single confident match
    result.technicienId = techMatches[0].id;
    result.technicienName = techMatches[0].fullName;
  } else if (techMatches.length > 1) {
    // Multiple matches - return ambiguity
    result.ambiguousTechniciens = techMatches.slice(0, 5);
    result.technicienCandidates = techMatches.slice(0, 5);
  } else if (techMatches.length === 1) {
    // Single low-confidence match - still ambiguous
    result.ambiguousTechniciens = techMatches;
    result.technicienCandidates = techMatches;
  }
  
  // Match apporteurs
  const appMatches = matchApporteur(query, apporteurs);
  
  if (appMatches.length === 1 && appMatches[0].matchScore >= MIN_SIMILARITY_STRICT) {
    result.apporteurId = appMatches[0].id;
    result.apporteurName = appMatches[0].displayName;
  } else if (appMatches.length > 1) {
    result.ambiguousApporteurs = appMatches.slice(0, 5);
    result.apporteurCandidates = appMatches.slice(0, 5);
  } else if (appMatches.length === 1) {
    result.ambiguousApporteurs = appMatches;
    result.apporteurCandidates = appMatches;
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
 * Check if query might contain unresolved names (for UI hints)
 */
export function hasPotentialUnresolvedName(query: string): boolean {
  const normalized = normalizeText(query);
  // Check for common French first names or patterns that suggest a name
  const namePatterns = [
    /\b(yoann|maxime|thomas|antoine|julien|nicolas|alexandre|pierre|paul|jean|marie|sophie|marine|lucie)\b/i,
    /\b[A-Z][a-z]+\s+[A-Z]\./i, // "Thomas L."
    /\b(de|le|la|du)\s+[A-Z]/i, // "de Martin"
  ];
  
  return namePatterns.some(p => p.test(query) || p.test(normalized));
}
