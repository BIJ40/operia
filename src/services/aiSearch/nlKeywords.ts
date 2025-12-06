/**
 * StatIA AI Search - Base de mots-clés pondérés
 * Index précompilé pour performance O(1)
 */

import type { Keyword, KeywordCategory, KeywordMatch } from './types';

// ═══════════════════════════════════════════════════════════════
// DÉFINITION DES MOTS-CLÉS
// ═══════════════════════════════════════════════════════════════

const KEYWORDS_RAW: Keyword[] = [
  // ─────────────────────────────────────────────────────────────
  // MÉTRIQUES (poids élevé)
  // ─────────────────────────────────────────────────────────────
  { word: 'chiffre affaires', category: 'metric', weight: 1.0, aliases: ['ca', 'chiffre', 'affaires'] },
  { word: 'recouvrement', category: 'metric', weight: 1.0, aliases: ['recouv', 'encaisse'] },
  { word: 'encours', category: 'metric', weight: 0.9, aliases: ['en cours', 'reste'] },
  { word: 'impaye', category: 'metric', weight: 0.9, aliases: ['impayes', 'non paye'] },
  { word: 'sav', category: 'metric', weight: 1.0, aliases: ['service apres vente', 'garantie'] },
  { word: 'devis', category: 'metric', weight: 0.9, aliases: ['devis'] },
  { word: 'dossier', category: 'metric', weight: 0.8, aliases: ['dossiers', 'projets'] },
  { word: 'intervention', category: 'metric', weight: 0.8, aliases: ['interventions', 'rdv'] },
  { word: 'facture', category: 'metric', weight: 0.9, aliases: ['factures', 'facturation'] },
  { word: 'delai', category: 'metric', weight: 0.8, aliases: ['delais', 'temps'] },
  { word: 'productivite', category: 'metric', weight: 0.8 },
  { word: 'marge', category: 'metric', weight: 0.9, aliases: ['marges'] },
  { word: 'transformation', category: 'metric', weight: 0.8, aliases: ['transfo', 'conversion'] },
  
  // ─────────────────────────────────────────────────────────────
  // DIMENSIONS
  // ─────────────────────────────────────────────────────────────
  { word: 'technicien', category: 'dimension', weight: 0.9, aliases: ['tech', 'techs', 'techniciens'] },
  { word: 'apporteur', category: 'dimension', weight: 0.9, aliases: ['apporteurs', 'commanditaire', 'prescripteur'] },
  { word: 'univers', category: 'dimension', weight: 0.9, aliases: ['metier', 'domaine'] },
  { word: 'agence', category: 'dimension', weight: 0.9, aliases: ['agences'] },
  { word: 'client', category: 'dimension', weight: 0.7, aliases: ['clients'] },
  
  // ─────────────────────────────────────────────────────────────
  // INTENTS
  // ─────────────────────────────────────────────────────────────
  { word: 'top', category: 'intent', weight: 0.9, aliases: ['meilleur', 'premier', 'classement'] },
  { word: 'moyenne', category: 'intent', weight: 0.8, aliases: ['moyen', 'avg'] },
  { word: 'total', category: 'intent', weight: 0.8, aliases: ['somme', 'cumul'] },
  { word: 'taux', category: 'intent', weight: 0.9, aliases: ['pourcentage', 'ratio', '%'] },
  { word: 'evolution', category: 'intent', weight: 0.7, aliases: ['progression', 'tendance'] },
  { word: 'comparaison', category: 'intent', weight: 0.7, aliases: ['comparer', 'versus', 'vs'] },
  { word: 'repartition', category: 'intent', weight: 0.7, aliases: ['distribution', 'ventilation'] },
  
  // ─────────────────────────────────────────────────────────────
  // UNIVERS MÉTIER
  // ─────────────────────────────────────────────────────────────
  { word: 'plomberie', category: 'univers', weight: 1.0, aliases: ['plombier'] },
  { word: 'electricite', category: 'univers', weight: 1.0, aliases: ['elec', 'electrique'] },
  { word: 'vitrerie', category: 'univers', weight: 1.0, aliases: ['vitrier', 'vitre'] },
  { word: 'serrurerie', category: 'univers', weight: 1.0, aliases: ['serrurier'] },
  { word: 'peinture', category: 'univers', weight: 1.0, aliases: ['peintre'] },
  { word: 'plaquiste', category: 'univers', weight: 1.0, aliases: ['platre', 'placo'] },
  { word: 'chauffage', category: 'univers', weight: 1.0, aliases: ['chauffagiste'] },
  { word: 'climatisation', category: 'univers', weight: 1.0, aliases: ['clim', 'climatiseur'] },
  { word: 'menuiserie', category: 'univers', weight: 1.0, aliases: ['menuisier'] },
  { word: 'couverture', category: 'univers', weight: 1.0, aliases: ['couvreur', 'toiture'] },
  { word: 'recherche fuite', category: 'univers', weight: 1.0, aliases: ['rdf', 'fuite'] },
  
  // ─────────────────────────────────────────────────────────────
  // PÉRIODES
  // ─────────────────────────────────────────────────────────────
  { word: 'aujourd hui', category: 'period', weight: 0.9, aliases: ['ce jour'] },
  { word: 'hier', category: 'period', weight: 0.9 },
  { word: 'semaine', category: 'period', weight: 0.8, aliases: ['cette semaine', 'semaine derniere'] },
  { word: 'mois', category: 'period', weight: 0.8, aliases: ['ce mois', 'mois dernier', 'mensuel'] },
  { word: 'trimestre', category: 'period', weight: 0.8, aliases: ['ce trimestre', 'trimestriel'] },
  { word: 'annee', category: 'period', weight: 0.9, aliases: ['cette annee', 'annee derniere', 'annuel'] },
  { word: 'janvier', category: 'period', weight: 0.7 },
  { word: 'fevrier', category: 'period', weight: 0.7 },
  { word: 'mars', category: 'period', weight: 0.7 },
  { word: 'avril', category: 'period', weight: 0.7 },
  { word: 'mai', category: 'period', weight: 0.7 },
  { word: 'juin', category: 'period', weight: 0.7 },
  { word: 'juillet', category: 'period', weight: 0.7 },
  { word: 'aout', category: 'period', weight: 0.7 },
  { word: 'septembre', category: 'period', weight: 0.7 },
  { word: 'octobre', category: 'period', weight: 0.7 },
  { word: 'novembre', category: 'period', weight: 0.7 },
  { word: 'decembre', category: 'period', weight: 0.7 },
  { word: 'dernier', category: 'period', weight: 0.6, aliases: ['derniere', 'derniers', 'dernieres'] },
  { word: 'precedent', category: 'period', weight: 0.6, aliases: ['precedente'] },
  { word: 'depuis', category: 'period', weight: 0.6 },
  { word: 'jusqu', category: 'period', weight: 0.6, aliases: ['jusque', 'jusqu au'] },
  
  // ─────────────────────────────────────────────────────────────
  // ACTIONS (navigation)
  // ─────────────────────────────────────────────────────────────
  { word: 'ouvrir', category: 'action', weight: 0.9, aliases: ['ouvre', 'aller'] },
  { word: 'voir', category: 'action', weight: 0.8, aliases: ['afficher', 'montrer'] },
  { word: 'planning', category: 'action', weight: 0.8, aliases: ['agenda', 'calendrier'] },
  { word: 'tableau', category: 'action', weight: 0.7, aliases: ['tableaux', 'dashboard'] },
  { word: 'liste', category: 'action', weight: 0.7, aliases: ['lister'] },
  { word: 'mes', category: 'action', weight: 0.5 },
  
  // ─────────────────────────────────────────────────────────────
  // DOCUMENTATION
  // ─────────────────────────────────────────────────────────────
  { word: 'comment', category: 'doc', weight: 0.9 },
  { word: 'pourquoi', category: 'doc', weight: 0.8 },
  { word: 'aide', category: 'doc', weight: 0.9, aliases: ['aider', 'help'] },
  { word: 'guide', category: 'doc', weight: 0.8, aliases: ['tutoriel', 'tuto'] },
  { word: 'definition', category: 'doc', weight: 0.8, aliases: ['signifie', 'veut dire'] },
  { word: 'procedure', category: 'doc', weight: 0.8, aliases: ['process', 'etapes'] },
  { word: 'regle', category: 'doc', weight: 0.7, aliases: ['regles', 'politique'] },
];

// ═══════════════════════════════════════════════════════════════
// INDEX PRÉCOMPILÉ (Map pour O(1))
// ═══════════════════════════════════════════════════════════════

const KEYWORD_INDEX = new Map<string, Keyword>();

// Construire l'index au chargement du module
(function buildIndex() {
  for (const kw of KEYWORDS_RAW) {
    // Mot principal
    KEYWORD_INDEX.set(kw.word, kw);
    
    // Aliases
    if (kw.aliases) {
      for (const alias of kw.aliases) {
        // L'alias pointe vers le keyword parent (poids légèrement réduit)
        KEYWORD_INDEX.set(alias, { ...kw, word: alias, weight: kw.weight * 0.95 });
      }
    }
  }
})();

// ═══════════════════════════════════════════════════════════════
// API PUBLIQUE
// ═══════════════════════════════════════════════════════════════

/**
 * Recherche un mot-clé dans l'index (O(1))
 */
export function findKeyword(word: string): Keyword | undefined {
  return KEYWORD_INDEX.get(word.toLowerCase());
}

/**
 * Trouve tous les mots-clés dans une requête normalisée
 */
export function findAllKeywords(normalizedQuery: string): KeywordMatch[] {
  const matches: KeywordMatch[] = [];
  const words = normalizedQuery.split(/\s+/);
  
  // Recherche multi-mots d'abord (plus spécifiques)
  for (let i = 0; i < words.length; i++) {
    // Essayer 3 mots, puis 2, puis 1
    for (let len = 3; len >= 1; len--) {
      if (i + len > words.length) continue;
      
      const phrase = words.slice(i, i + len).join(' ');
      const keyword = findKeyword(phrase);
      
      if (keyword) {
        matches.push({
          keyword,
          position: i,
          matchedText: phrase,
        });
        // Sauter les mots matchés
        i += len - 1;
        break;
      }
    }
  }
  
  return matches;
}

/**
 * Calcule le score stats d'une requête basé sur les mots-clés matchés
 */
export function computeStatsScore(matches: KeywordMatch[]): number {
  const categoryWeights: Record<KeywordCategory, number> = {
    metric: 0.4,
    dimension: 0.2,
    intent: 0.2,
    period: 0.1,
    univers: 0.1,
    action: -0.3,  // Réduit le score stats
    doc: -0.4,     // Réduit le score stats
    filter: 0.05,
  };
  
  let score = 0;
  const seen = new Set<string>();
  
  for (const match of matches) {
    // Éviter les doublons
    if (seen.has(match.keyword.word)) continue;
    seen.add(match.keyword.word);
    
    const catWeight = categoryWeights[match.keyword.category] || 0;
    score += match.keyword.weight * catWeight;
  }
  
  // Normaliser entre 0 et 1
  return Math.max(0, Math.min(1, score));
}

/**
 * Détecte la catégorie dominante parmi les matches
 */
export function getDominantCategory(matches: KeywordMatch[]): KeywordCategory | null {
  const counts: Partial<Record<KeywordCategory, number>> = {};
  
  for (const match of matches) {
    const cat = match.keyword.category;
    counts[cat] = (counts[cat] || 0) + match.keyword.weight;
  }
  
  let maxCat: KeywordCategory | null = null;
  let maxScore = 0;
  
  for (const [cat, score] of Object.entries(counts)) {
    if (score > maxScore) {
      maxScore = score;
      maxCat = cat as KeywordCategory;
    }
  }
  
  return maxCat;
}

/**
 * Extrait les univers métier détectés
 */
export function extractUniversFromMatches(matches: KeywordMatch[]): string[] {
  return matches
    .filter(m => m.keyword.category === 'univers')
    .map(m => m.keyword.word.toUpperCase());
}

/**
 * Extrait la dimension principale détectée
 */
export function extractDimensionFromMatches(matches: KeywordMatch[]): string | null {
  const dimMatch = matches.find(m => m.keyword.category === 'dimension');
  return dimMatch?.keyword.word || null;
}
