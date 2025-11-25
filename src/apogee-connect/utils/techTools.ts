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
export function buildTechMap(usersData: any[]): Record<number, TechnicienInfo> {
  const TECHS: Record<number, TechnicienInfo> = {};

  if (!Array.isArray(usersData)) return TECHS;

  for (const u of usersData) {
    if (u?.isTechnicien !== true) continue;

    TECHS[u.id] = {
      id: u.id,
      prenom: (u.firstname || "").trim(),
      nom: (u.name || "").trim(),
      actif: u.isActive === true,
      color: u.color?.hex || "#808080"
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
