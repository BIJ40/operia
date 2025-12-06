/**
 * NL Tokenizer - Tokenisation structurée pour routing NL
 * 
 * Élimine tous les includes() naïfs en faveur de tokens/bigrams/trigrams
 */

export interface TokenizedQuery {
  raw: string;
  normalized: string;
  tokens: string[];      // mots individuels ["ca", "en", "avril"]
  bigrams: string[];     // ["ca en", "en avril"]
  trigrams: string[];    // ["ca en avril"]
}

/**
 * Normalise une chaîne : minuscules, sans accents, sans ponctuation excessive
 */
export function normalizeForTokens(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, ' ')           // Apostrophes → espace
    .replace(/[^\w\sàâäéèêëïîôùûüç€%]/g, ' ') // Keep alphanumeric + some special
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenise une requête en mots, bigrams et trigrams
 */
export function tokenizeQuery(query: string): TokenizedQuery {
  const normalized = normalizeForTokens(query);
  
  // Tokens = mots individuels (minimum 1 caractère pour garder "€", "%", etc.)
  const tokens = normalized
    .split(/\s+/)
    .filter(t => t.length >= 1)
    .map(t => t.toLowerCase());
  
  // Bigrams
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  
  // Trigrams
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
  }
  
  return {
    raw: query,
    normalized,
    tokens,
    bigrams,
    trigrams,
  };
}

/**
 * Vérifie si un token exact est présent
 */
export function hasToken(tokenized: TokenizedQuery, word: string): boolean {
  const w = word.toLowerCase();
  return tokenized.tokens.includes(w);
}

/**
 * Vérifie si au moins un des tokens est présent
 */
export function hasAnyToken(tokenized: TokenizedQuery, words: string[]): boolean {
  return words.some(w => hasToken(tokenized, w));
}

/**
 * Vérifie si TOUS les tokens sont présents
 */
export function hasAllTokens(tokenized: TokenizedQuery, words: string[]): boolean {
  return words.every(w => hasToken(tokenized, w));
}

/**
 * Vérifie si un bigram est présent
 */
export function hasBigram(tokenized: TokenizedQuery, bigram: string): boolean {
  return tokenized.bigrams.includes(bigram.toLowerCase());
}

/**
 * Vérifie si un trigram est présent
 */
export function hasTrigram(tokenized: TokenizedQuery, trigram: string): boolean {
  return tokenized.trigrams.includes(trigram.toLowerCase());
}

/**
 * Vérifie si une phrase (bigram ou trigram) est présente
 */
export function hasPhrase(tokenized: TokenizedQuery, phrase: string): boolean {
  const words = phrase.toLowerCase().split(/\s+/);
  if (words.length === 1) return hasToken(tokenized, words[0]);
  if (words.length === 2) return hasBigram(tokenized, phrase);
  if (words.length === 3) return hasTrigram(tokenized, phrase);
  
  // Pour les phrases plus longues, vérifier que tous les tokens sont présents dans l'ordre
  // (simplification: on vérifie juste la présence de tous les mots)
  return hasAllTokens(tokenized, words);
}
