/**
 * NL Entity Resolver - Résolution des entités métier (apporteurs, techniciens, univers)
 * 
 * ÉTAPE CRITIQUE: Cette résolution DOIT se faire AVANT le scoring des métriques
 * pour permettre la détection correcte de la dimension.
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface EntityCandidate {
  id: number | string;
  name: string;
  normalizedName: string;
  type: 'apporteur' | 'technicien' | 'univers';
  score: number;
  matchedToken: string;
}

export interface ResolvedEntityFilters {
  apporteur?: { id: number | string; name: string };
  technicien?: { id: number | string; name: string };
  univers?: string;
  dimension: 'global' | 'apporteur' | 'technicien' | 'univers';
  ambiguous?: EntityCandidate[];
}

export interface EntityDictionary {
  apporteurs: Array<{ id: number | string; name: string; normalizedName: string }>;
  techniciens: Array<{ id: number | string; name: string; normalizedName: string }>;
  univers: string[];
}

// ═══════════════════════════════════════════════════════════════
// NORMALISATION
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise un texte pour matching robuste
 * - Supprime les accents
 * - Lowercase
 * - Supprime caractères spéciaux
 */
export function normalizeForMatching(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Supprime accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')     // Remplace caractères spéciaux par espace
    .replace(/\s+/g, ' ')              // Normalise espaces multiples
    .trim();
}

/**
 * Mots-clés à exclure lors du matching d'entités
 */
const EXCLUDED_QUERY_WORDS = new Set([
  // Interrogatifs
  'combien', 'quel', 'quelle', 'quels', 'quelles', 'comment', 'pourquoi',
  // Verbes courants
  'fait', 'ifait', 'genere', 'realise', 'rapporte', 'gagne', 'avoir', 'avons', 'avec', 'pour', 'sur', 'dans',
  // Mois
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
  // Périodes
  'cette', 'cette', 'annee', 'mois', 'dernier', 'derniere', 'semaine', 'trimestre', 'premier', 'deuxieme', 'troisieme', 'quatrieme',
  // Termes stats
  'ca', 'chiffre', 'affaires', 'affaire', 'facture', 'factures', 'dossier', 'dossiers', 'sav', 'taux', 'nombre', 'combien',
  'moyen', 'moyenne', 'total', 'global', 'par', 'apporteur', 'technicien', 'univers', 'client', 'partenaire',
  // Articles et prépositions
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'en',
]);

/**
 * Extrait les mots potentiellement des entités de la query
 */
export function extractEntityTokens(normalizedQuery: string): string[] {
  return normalizedQuery
    .split(' ')
    .filter(word => word.length >= 3 && !EXCLUDED_QUERY_WORDS.has(word));
}

// ═══════════════════════════════════════════════════════════════
// MATCHING D'ENTITÉS
// ═══════════════════════════════════════════════════════════════

const MIN_SCORE_EXACT = 1.0;
const MIN_SCORE_INCLUSION = 0.85;
const MIN_SCORE_FUZZY = 0.72;

/**
 * Calcule le score de similarité entre deux chaînes (bigram)
 */
function bigramSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  const bigrams = (s: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < s.length - 1; i++) {
      out.push(s.slice(i, i + 2));
    }
    return out;
  };
  
  const b1 = bigrams(a);
  const b2 = bigrams(b);
  if (!b1.length || !b2.length) return 0;
  
  const set = new Set(b1);
  let common = 0;
  for (const g of b2) {
    if (set.has(g)) common++;
  }
  return (2 * common) / (b1.length + b2.length);
}

/**
 * Trouve les entités correspondantes dans la query
 */
export function findEntitiesInQuery(
  normalizedQuery: string,
  dictionary: EntityDictionary
): ResolvedEntityFilters {
  const tokens = extractEntityTokens(normalizedQuery);
  console.log(`[nlEntityResolver] Query tokens for entity matching: [${tokens.join(', ')}]`);
  
  const candidates: EntityCandidate[] = [];
  
  // 1. Match apporteurs
  for (const ap of dictionary.apporteurs) {
    let bestScore = 0;
    let matchedToken = '';
    
    for (const token of tokens) {
      // Match exact
      if (token === ap.normalizedName) {
        bestScore = Math.max(bestScore, 1.0);
        matchedToken = token;
        continue;
      }
      
      // Token inclus dans le nom de l'apporteur (ou inverse)
      if (ap.normalizedName.includes(token) && token.length >= 4) {
        const inclusionScore = token.length / ap.normalizedName.length;
        if (inclusionScore > bestScore) {
          bestScore = Math.max(inclusionScore, 0.85);
          matchedToken = token;
        }
      }
      if (token.includes(ap.normalizedName) && ap.normalizedName.length >= 4) {
        if (0.9 > bestScore) {
          bestScore = 0.9;
          matchedToken = token;
        }
      }
      
      // Similarité bigram
      const sim = bigramSimilarity(token, ap.normalizedName);
      if (sim > bestScore && sim >= MIN_SCORE_FUZZY) {
        bestScore = sim;
        matchedToken = token;
      }
    }
    
    if (bestScore >= MIN_SCORE_FUZZY) {
      candidates.push({
        id: ap.id,
        name: ap.name,
        normalizedName: ap.normalizedName,
        type: 'apporteur',
        score: bestScore,
        matchedToken,
      });
    }
  }
  
  // 2. Match techniciens
  for (const tech of dictionary.techniciens) {
    let bestScore = 0;
    let matchedToken = '';
    
    for (const token of tokens) {
      // Match exact
      if (token === tech.normalizedName) {
        bestScore = Math.max(bestScore, 1.0);
        matchedToken = token;
        continue;
      }
      
      // Inclusion
      if (tech.normalizedName.includes(token) && token.length >= 4) {
        if (0.85 > bestScore) {
          bestScore = 0.85;
          matchedToken = token;
        }
      }
      
      // Similarité bigram
      const sim = bigramSimilarity(token, tech.normalizedName);
      if (sim > bestScore && sim >= MIN_SCORE_FUZZY) {
        bestScore = sim;
        matchedToken = token;
      }
    }
    
    if (bestScore >= MIN_SCORE_FUZZY) {
      candidates.push({
        id: tech.id,
        name: tech.name,
        normalizedName: tech.normalizedName,
        type: 'technicien',
        score: bestScore,
        matchedToken,
      });
    }
  }
  
  // 3. Match univers (statiques)
  for (const univ of dictionary.univers) {
    const normUniv = normalizeForMatching(univ);
    for (const token of tokens) {
      if (token === normUniv || normUniv.includes(token) && token.length >= 4) {
        candidates.push({
          id: univ,
          name: univ,
          normalizedName: normUniv,
          type: 'univers',
          score: token === normUniv ? 1.0 : 0.9,
          matchedToken: token,
        });
        break;
      }
    }
  }
  
  // 4. Tri par score
  candidates.sort((a, b) => b.score - a.score);
  
  console.log(`[nlEntityResolver] Found ${candidates.length} entity candidates:`);
  for (const c of candidates.slice(0, 5)) {
    console.log(`  - ${c.type}: ${c.name} (score=${c.score.toFixed(2)}, token=${c.matchedToken})`);
  }
  
  // 5. Sélection du meilleur candidat
  if (candidates.length === 0) {
    return { dimension: 'global' };
  }
  
  const best = candidates[0];
  
  // Vérifier l'ambiguïté (plusieurs candidats avec scores proches)
  const strongCandidates = candidates.filter(c => c.score >= 0.85 && c.score >= best.score - 0.1);
  if (strongCandidates.length > 1 && strongCandidates.some(c => c.type !== best.type)) {
    // Ambiguïté entre types différents → on garde le meilleur score
    console.log(`[nlEntityResolver] Ambiguous candidates, selecting best: ${best.name} (${best.type})`);
  }
  
  // Construire le résultat
  const result: ResolvedEntityFilters = { dimension: 'global' };
  
  if (best.type === 'apporteur' && best.score >= MIN_SCORE_FUZZY) {
    result.apporteur = { id: best.id, name: best.name };
    result.dimension = 'apporteur';
    console.log(`[nlEntityResolver] ✓ Apporteur resolved: ${best.name} (id=${best.id})`);
  } else if (best.type === 'technicien' && best.score >= MIN_SCORE_FUZZY) {
    result.technicien = { id: best.id, name: best.name };
    result.dimension = 'technicien';
    console.log(`[nlEntityResolver] ✓ Technicien resolved: ${best.name} (id=${best.id})`);
  } else if (best.type === 'univers' && best.score >= MIN_SCORE_FUZZY) {
    result.univers = best.name;
    result.dimension = 'univers';
    console.log(`[nlEntityResolver] ✓ Univers resolved: ${best.name}`);
  }
  
  // Si plusieurs candidats forts, signaler l'ambiguïté
  if (strongCandidates.length > 1) {
    result.ambiguous = strongCandidates;
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTION DU DICTIONNAIRE
// ═══════════════════════════════════════════════════════════════

/**
 * Construit un dictionnaire d'entités normalisées à partir des données Apogée
 */
export function buildEntityDictionary(
  clients: Array<{ id: number | string; name?: string | null; raisonSociale?: string | null; displayName?: string | null; company?: string | null; societe?: string | null }>,
  users: Array<{ id: number | string; firstname?: string | null; prenom?: string | null; name?: string | null; lastname?: string | null; nom?: string | null }>
): EntityDictionary {
  // Apporteurs (clients/commanditaires)
  const apporteurs = clients
    .map(c => {
      const name = c.name || c.raisonSociale || c.displayName || c.company || c.societe || '';
      return {
        id: c.id,
        name: name,
        normalizedName: normalizeForMatching(name),
      };
    })
    .filter(a => a.normalizedName.length >= 3);
  
  // Techniciens (users)
  const techniciens = users
    .map(u => {
      const firstName = (u.firstname || u.prenom || '').trim();
      const lastName = (u.name || u.lastname || u.nom || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');
      return {
        id: u.id,
        name: fullName,
        normalizedName: normalizeForMatching(fullName),
      };
    })
    .filter(t => t.normalizedName.length >= 3);
  
  // Univers (statiques)
  const univers = [
    'PLOMBERIE', 'VITRERIE', 'SERRURERIE', 'ELECTRICITE', 
    'MENUISERIE', 'PEINTURE', 'MACONNERIE', 'COUVERTURE', 'CARRELAGE',
  ];
  
  console.log(`[nlEntityResolver] Dictionary built: ${apporteurs.length} apporteurs, ${techniciens.length} techniciens, ${univers.length} univers`);
  
  return { apporteurs, techniciens, univers };
}
