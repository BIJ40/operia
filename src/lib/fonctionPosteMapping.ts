/**
 * FICHIER CENTRAL — Mapping Fonction / Poste
 *
 * Source de vérité unique pour les constantes métier :
 * - Fonction = rôle dans l'entreprise (role_agence dans profiles, type dans collaborators)
 * - Poste    = spécialité terrain (poste dans profiles et collaborators)
 *
 * Règles :
 * - global_role   = permissions plateforme (N0→N6)
 * - role_agence   = fonction (technicien, administratif, commercial, dirigeant)
 * - poste         = spécialité (plombier, secretaire, polyvalent, gerant…)
 * - collaborators.role = @deprecated — lecture fallback uniquement
 * - collaborators.type = champ historique représentant la fonction.
 *     Canon métier = fonction. Ne pas introduire de nouveau champ "type" ailleurs.
 */

// ============================================================================
// FONCTIONS (= role_agence / type)
// ============================================================================

/** Valeurs canoniques des fonctions (lowercase pour profiles.role_agence) */
export const FONCTIONS = ['technicien', 'administratif', 'commercial', 'dirigeant'] as const;
export type Fonction = (typeof FONCTIONS)[number];

/** Valeurs DB pour collaborators.type (UPPERCASE historique) */
export const FONCTION_TO_DB_TYPE: Record<Fonction, string> = {
  technicien: 'TECHNICIEN',
  administratif: 'ADMINISTRATIF',
  commercial: 'COMMERCIAL',
  dirigeant: 'DIRIGEANT',
};

/** Labels d'affichage */
export const FONCTION_LABELS: Record<Fonction, string> = {
  technicien: 'Technicien',
  administratif: 'Administratif',
  commercial: 'Commercial',
  dirigeant: 'Dirigeant',
};

/** Options pour les selects UI */
export const FONCTION_OPTIONS = FONCTIONS.map((f) => ({
  value: f,
  label: FONCTION_LABELS[f],
}));

// ============================================================================
// POSTES (= spécialité)
// ============================================================================

/** Tous les postes canoniques (lowercase, stockés en DB) */
export const ALL_POSTES = [
  'plombier',
  'electricien',
  'menuisier',
  'peintre',
  'plaquiste',
  'polyvalent',
  'secretaire',
  'assistant_direction',
  'commercial',
  'gerant',
  'president',
] as const;
export type Poste = (typeof ALL_POSTES)[number];

/** Labels d'affichage des postes */
export const POSTE_LABELS: Record<Poste, string> = {
  plombier: 'Plombier',
  electricien: 'Électricien',
  menuisier: 'Menuisier',
  peintre: 'Peintre',
  plaquiste: 'Plaquiste',
  polyvalent: 'Polyvalent',
  secretaire: 'Secrétaire',
  assistant_direction: 'Assistant(e) de direction',
  commercial: 'Commercial',
  gerant: 'Gérant',
  president: 'Président',
};

/** Postes autorisés par fonction */
export const POSTES_PAR_FONCTION: Record<Fonction, Poste[]> = {
  technicien: ['plombier', 'electricien', 'menuisier', 'peintre', 'plaquiste', 'polyvalent'],
  administratif: ['secretaire', 'assistant_direction'],
  commercial: ['commercial'],
  dirigeant: ['gerant', 'president'],
};

/** Poste par défaut quand aucun n'est choisi */
export const DEFAULT_POSTE: Record<Fonction, Poste> = {
  technicien: 'polyvalent',
  administratif: 'secretaire',
  commercial: 'commercial',
  dirigeant: 'gerant',
};

// ============================================================================
// HELPERS
// ============================================================================

/** Retourne les postes autorisés pour une fonction donnée */
export function getPostesForFonction(fonction: string): { value: Poste; label: string }[] {
  const key = fonction.toLowerCase() as Fonction;
  const postes = POSTES_PAR_FONCTION[key];
  if (!postes) return [];
  return postes.map((p) => ({ value: p, label: POSTE_LABELS[p] }));
}

/** Retourne le poste par défaut pour une fonction */
export function getDefaultPoste(fonction: string): Poste | null {
  const key = fonction.toLowerCase() as Fonction;
  return DEFAULT_POSTE[key] ?? null;
}

/** Vérifie qu'un couple fonction/poste est cohérent */
export function validateFonctionPoste(
  fonction: string | null,
  poste: string | null
): { valid: boolean; message?: string } {
  if (!fonction) return { valid: true }; // pas de validation sans fonction
  if (!poste) return { valid: true }; // poste optionnel

  const key = fonction.toLowerCase() as Fonction;
  const allowed = POSTES_PAR_FONCTION[key];
  if (!allowed) return { valid: false, message: `Fonction inconnue : ${fonction}` };

  if (!allowed.includes(poste as Poste)) {
    return {
      valid: false,
      message: `Le poste "${poste}" n'est pas compatible avec la fonction "${FONCTION_LABELS[key] || fonction}"`,
    };
  }
  return { valid: true };
}

/** Convertit un type DB (UPPERCASE) en fonction (lowercase) */
export function dbTypeToFonction(dbType: string | null): Fonction | null {
  if (!dbType) return null;
  const lower = dbType.toLowerCase();
  // Handle legacy 'assistante' → 'administratif'
  if (lower === 'assistante') return 'administratif';
  if (FONCTIONS.includes(lower as Fonction)) return lower as Fonction;
  return null;
}

/** Convertit une fonction en type DB */
export function fonctionToDbType(fonction: string): string {
  const key = fonction.toLowerCase() as Fonction;
  return FONCTION_TO_DB_TYPE[key] ?? fonction.toUpperCase();
}

/**
 * Résout l'affichage principal d'un collaborateur.
 * Règle : poste si présent, sinon fonction.
 */
export function displayPosteOuFonction(
  poste: string | null | undefined,
  fonction: string | null | undefined
): string {
  if (poste && POSTE_LABELS[poste as Poste]) return POSTE_LABELS[poste as Poste];
  if (poste) return poste; // valeur libre
  if (fonction) {
    const key = (fonction.toLowerCase() === 'assistante' ? 'administratif' : fonction.toLowerCase()) as Fonction;
    return FONCTION_LABELS[key] ?? fonction;
  }
  return 'Non défini';
}

// ============================================================================
// WHITELIST MIGRATION — utilisé pour la migration role → poste
// ============================================================================

/** Mapping des anciennes valeurs de `role` vers les postes canoniques */
export const ROLE_TO_POSTE_WHITELIST: Record<string, Poste> = {
  plombier: 'plombier',
  electricien: 'electricien',
  électricien: 'electricien',
  menuisier: 'menuisier',
  peintre: 'peintre',
  plaquiste: 'plaquiste',
  polyvalent: 'polyvalent',
  secretaire: 'secretaire',
  secrétaire: 'secretaire',
  commercial: 'commercial',
  gerant: 'gerant',
  gérant: 'gerant',
  dirigeant: 'gerant',
  president: 'president',
  président: 'president',
};
