/**
 * Utilitaires universels pour la gestion des techniciens
 */

// ==============================================
// CONSTANTES D'EXCLUSION
// ==============================================

/**
 * Types utilisateurs explicitement NON techniciens
 * Ces types ne génèrent JAMAIS de CA même s'ils apparaissent dans les visites
 */
export const EXCLUDED_USER_TYPES = ['commercial', 'admin', 'assistant', 'administratif'];

// ==============================================
// HELPERS DE NORMALISATION
// ==============================================

/**
 * Normalise is_on pour gérer tous les formats API
 * L'API Apogée peut retourner: true, 1, "1", "true"
 */
export function normalizeIsOn(value: unknown): boolean {
  if (value === true) return true;
  if (value === 1) return true;
  if (value === "1") return true;
  if (typeof value === 'string' && value.toLowerCase() === 'true') return true;
  return false;
}

/**
 * Vérifie si un type utilisateur doit être exclu des calculs CA
 */
export function isExcludedUserType(userType: string | null | undefined): boolean {
  if (!userType) return false;
  return EXCLUDED_USER_TYPES.includes(userType.toLowerCase().trim());
}

// ==============================================
// INTERFACES
// ==============================================

export interface TechnicienInfo {
  id: number;
  prenom: string;
  nom: string;
  actif: boolean;
  color: string;
}

export interface TechnicienResolved {
  label: string;
  color: string;
  actif: boolean;
}

// ==============================================
// FONCTIONS PRINCIPALES
// ==============================================

/**
 * Convertit apiGetUsers en dictionnaire TECHS normalisé
 * 
 * RÈGLES D'IDENTIFICATION TECHNICIEN:
 * 1. is_on normalisé = true (accepte true, 1, "1", "true")
 * 2. type NON dans EXCLUDED_USER_TYPES (commercial, admin, assistant, administratif)
 * 3. isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
 */
export function buildTechMap(usersData: any[]): Record<number, TechnicienInfo> {
  const TECHS: Record<number, TechnicienInfo> = {};

  if (!Array.isArray(usersData)) return TECHS;

  for (const u of usersData) {
    // RÈGLE 1: is_on doit être true (normalisé)
    if (!normalizeIsOn(u?.is_on)) continue;
    
    // RÈGLE 2: Exclure les types non-techniciens
    const userType = (u?.type || '').toString();
    if (isExcludedUserType(userType)) continue;
    
    // RÈGLE 3: Critères d'identification technicien
    const hasUniverses = Array.isArray(u?.data?.universes) && u.data.universes.length > 0;
    const isTechnicien = 
      u?.isTechnicien === true || 
      u?.isTechnicien === 1 ||
      u?.type === "technicien" ||
      userType.toLowerCase() === "technicien" ||
      (u?.type === "utilisateur" && hasUniverses) ||
      (userType.toLowerCase() === "utilisateur" && hasUniverses);
    
    if (!isTechnicien) continue;

    const isActive = normalizeIsOn(u?.is_on) || normalizeIsOn(u?.isActive);

    TECHS[u.id] = {
      id: u.id,
      prenom: (u.firstname || "").trim(),
      nom: (u.name || "").trim(),
      actif: isActive,
      color: u.data?.bgcolor?.hex || u.bgcolor?.hex || u.data?.color?.hex || u.color?.hex || "#808080",
    };
  }

  return TECHS;
}

/**
 * Convertit un ID technicien en {label, color, actif}
 */
export function resolveTech(techId: number | string, TECHS: Record<number, TechnicienInfo>): TechnicienResolved {
  const id = typeof techId === 'string' ? parseInt(techId, 10) : techId;
  const t = TECHS[id];
  
  if (!t) {
    return {
      label: "Technicien inconnu",
      color: "#999999",
      actif: false
    };
  }

  return {
    label: `${t.prenom} ${t.nom}`.trim(),
    color: t.color,
    actif: t.actif
  };
}
