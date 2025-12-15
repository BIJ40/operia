/**
 * Token configuration for DocGen templates
 * Allows customizing title, description, and hints for each token
 */

export interface TokenConfig {
  token: string;        // The actual token name in the document (e.g., "SALAIRE")
  title: string;        // Custom display title (e.g., "Salaire mensuel brut")
  description: string;  // Help text with examples/instructions
  required?: boolean;   // Whether this field is required (default: true)
}

/**
 * Smart tokens that are auto-populated from database
 * These don't need user input
 */
export const SMART_TOKEN_PREFIXES = [
  "AGENCE_",
  "DIRIGEANT_",
  "COLLAB_",
  "DATE_",
  "USER_",
] as const;

/**
 * Check if a token is a smart token (auto-populated)
 */
export function isSmartToken(token: string): boolean {
  const upper = token.toUpperCase();
  return SMART_TOKEN_PREFIXES.some(prefix => upper.startsWith(prefix));
}

/**
 * Get smart token description
 */
export function getSmartTokenDescription(token: string): string {
  const upper = token.toUpperCase();
  const descriptions: Record<string, string> = {
    AGENCE_NOM: "Nom de l'agence (auto)",
    AGENCE_ADRESSE: "Adresse complète de l'agence (auto)",
    AGENCE_VILLE: "Ville de l'agence (auto)",
    AGENCE_CODE_POSTAL: "Code postal de l'agence (auto)",
    AGENCE_TEL: "Téléphone de l'agence (auto)",
    DIRIGEANT_NOM: "Nom du dirigeant (auto)",
    DIRIGEANT_PRENOM: "Prénom du dirigeant (auto)",
    DIRIGEANT_NOM_COMPLET: "Nom complet du dirigeant (auto)",
    COLLAB_NOM: "Nom du collaborateur (auto)",
    COLLAB_PRENOM: "Prénom du collaborateur (auto)",
    DATE_JOUR: "Jour actuel (auto)",
    DATE_MOIS: "Mois actuel (auto)",
    DATE_ANNEE: "Année actuelle (auto)",
    DATE_COMPLETE: "Date formatée complète (auto)",
    USER_NOM: "Nom de l'utilisateur connecté (auto)",
    USER_PRENOM: "Prénom de l'utilisateur connecté (auto)",
    USER_EMAIL: "Email de l'utilisateur connecté (auto)",
  };
  return descriptions[upper] || "Champ pré-rempli automatiquement";
}

/**
 * Check if tokens array contains TokenConfig objects or plain strings
 */
export function hasTokenConfigs(tokens: unknown[]): tokens is TokenConfig[] {
  if (!tokens || tokens.length === 0) return false;
  return typeof tokens[0] === "object" && tokens[0] !== null && "token" in tokens[0];
}

/**
 * Get token name from either string or TokenConfig
 */
export function getTokenName(item: string | TokenConfig): string {
  return typeof item === "string" ? item : item.token;
}

/**
 * Get token config, creating default if needed
 */
export function getTokenConfig(item: string | TokenConfig): TokenConfig {
  if (typeof item === "object" && item !== null && "token" in item) {
    return item;
  }
  
  // item is a string token
  const tokenStr = item as string;
  return {
    token: tokenStr,
    title: formatTokenLabel(tokenStr),
    description: "",
    required: true,
  };
}

/**
 * Format token name into readable label
 */
export function formatTokenLabel(token: string): string {
  // Known labels mapping
  const labels: Record<string, string> = {
    salaire: "Salaire mensuel brut",
    motif: "Motif",
    duree: "Durée",
    periode_essai: "Période d'essai",
    convention: "Convention collective",
    poste: "Poste occupé",
    date_debut: "Date de début",
    date_fin: "Date de fin",
    description: "Description",
    commentaire: "Commentaire",
    observations: "Observations",
  };
  
  const lower = token.toLowerCase();
  if (labels[lower]) return labels[lower];
  
  // Format: replace underscores, capitalize first letter of each word
  return token
    .replace(/_/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Extract all token names from mixed array
 */
export function extractTokenNames(tokens: (string | TokenConfig)[]): string[] {
  return tokens.map(getTokenName);
}

/**
 * Convert string tokens to TokenConfig array
 */
export function tokensToConfigs(tokens: (string | TokenConfig)[]): TokenConfig[] {
  return tokens.map(getTokenConfig);
}

/**
 * Merge new token list with existing configs (preserve user customizations)
 */
export function mergeTokenConfigs(
  existingConfigs: TokenConfig[],
  newTokenNames: string[]
): TokenConfig[] {
  const existingMap = new Map(existingConfigs.map(c => [c.token, c]));
  
  return newTokenNames.map(tokenName => {
    const existing = existingMap.get(tokenName);
    if (existing) return existing;
    return getTokenConfig(tokenName);
  });
}
