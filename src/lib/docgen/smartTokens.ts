/**
 * Smart tokens pour DocGen - Tokens auto-remplis depuis les données existantes
 */

export const SMART_TOKEN_PREFIXES = {
  AGENCE: 'AGENCE_',
  COLLAB: 'COLLAB_',
  DIRIGEANT: 'DIRIGEANT_',
  DATE: 'DATE_',
  USER: 'USER_',
} as const;

export const SMART_TOKENS = {
  // Agence
  AGENCE_NOM: { label: "Nom de l'agence", source: 'agency.label' },
  AGENCE_ADRESSE: { label: "Adresse de l'agence", source: 'agency.adresse' },
  AGENCE_CP: { label: "Code postal agence", source: 'agency.code_postal' },
  AGENCE_VILLE: { label: "Ville agence", source: 'agency.ville' },
  AGENCE_EMAIL: { label: "Email agence", source: 'agency.contact_email' },
  AGENCE_TEL: { label: "Téléphone agence", source: 'agency.contact_phone' },
  
  // Dirigeant (N2 de l'agence)
  DIRIGEANT_NOM: { label: "Nom du dirigeant", source: 'dirigeant.last_name' },
  DIRIGEANT_PRENOM: { label: "Prénom du dirigeant", source: 'dirigeant.first_name' },
  DIRIGEANT_NOM_COMPLET: { label: "Nom complet du dirigeant", source: 'dirigeant.full_name' },
  
  // Collaborateur (si lié à l'instance)
  COLLAB_NOM: { label: "Nom du collaborateur", source: 'collaborator.last_name' },
  COLLAB_PRENOM: { label: "Prénom du collaborateur", source: 'collaborator.first_name' },
  COLLAB_NOM_COMPLET: { label: "Nom complet collaborateur", source: 'collaborator.full_name' },
  COLLAB_EMAIL: { label: "Email collaborateur", source: 'collaborator.email' },
  COLLAB_TEL: { label: "Téléphone collaborateur", source: 'collaborator.phone' },
  COLLAB_ADRESSE: { label: "Adresse collaborateur", source: 'collaborator.address' },
  COLLAB_CP: { label: "Code postal collaborateur", source: 'collaborator.postal_code' },
  COLLAB_VILLE: { label: "Ville collaborateur", source: 'collaborator.city' },
  COLLAB_POSTE: { label: "Poste/rôle", source: 'collaborator.role' },
  COLLAB_DATE_EMBAUCHE: { label: "Date d'embauche", source: 'collaborator.hiring_date' },
  
  // Dates
  DATE_JOUR: { label: "Jour actuel (ex: 15)", source: 'date.day' },
  DATE_MOIS: { label: "Mois en lettres (ex: décembre)", source: 'date.month' },
  DATE_ANNEE: { label: "Année (ex: 2025)", source: 'date.year' },
  DATE_COMPLETE: { label: "Date complète (ex: 15 décembre 2025)", source: 'date.full' },
  
  // Utilisateur connecté
  USER_NOM: { label: "Nom utilisateur connecté", source: 'user.last_name' },
  USER_PRENOM: { label: "Prénom utilisateur", source: 'user.first_name' },
  USER_EMAIL: { label: "Email utilisateur", source: 'user.email' },
} as const;

export type SmartTokenKey = keyof typeof SMART_TOKENS;

/**
 * Check if a token is a smart token (auto-filled)
 */
export function isSmartToken(token: string): boolean {
  return token in SMART_TOKENS || Object.values(SMART_TOKEN_PREFIXES).some(prefix => token.startsWith(prefix));
}

/**
 * Get smart token info if exists
 */
export function getSmartTokenInfo(token: string): { label: string; source: string } | null {
  if (token in SMART_TOKENS) {
    return SMART_TOKENS[token as SmartTokenKey];
  }
  return null;
}

/**
 * Separate tokens into smart (auto-filled) and manual
 */
export function categorizeTokens(tokens: string[]): {
  smartTokens: { token: string; label: string }[];
  manualTokens: string[];
} {
  const smartTokens: { token: string; label: string }[] = [];
  const manualTokens: string[] = [];

  for (const token of tokens) {
    const info = getSmartTokenInfo(token);
    if (info) {
      smartTokens.push({ token, label: info.label });
    } else {
      manualTokens.push(token);
    }
  }

  return { smartTokens, manualTokens };
}
