/**
 * Utilitaires universels pour la gestion des techniciens
 */

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

/**
 * Convertit apiGetUsers en dictionnaire TECHS normalisé
 */
/**
 * Convertit apiGetUsers en dictionnaire TECHS normalisé
 * RÈGLE: Ne prendre que les users avec is_on === true (techniciens actifs)
 */
export function buildTechMap(usersData: any[]): Record<number, TechnicienInfo> {
  const TECHS: Record<number, TechnicienInfo> = {};

  if (!Array.isArray(usersData)) return TECHS;

  for (const u of usersData) {
    // FILTRE PRIMAIRE: is_on doit être true pour être considéré
    if (u?.is_on !== true) continue;
    
    // Ne garder que les techniciens
    // Règle: isTechnicien=true OU type="technicien" OU (type="utilisateur" ET universes non vide)
    const hasUniverses = Array.isArray(u?.data?.universes) && u.data.universes.length > 0;
    const isTechnicien = 
      u?.isTechnicien === true || 
      u?.type === "technicien" ||
      (u?.type === "utilisateur" && hasUniverses);
    if (!isTechnicien) continue;

    const isActive = u?.is_on === true || u?.isActive === true;

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
