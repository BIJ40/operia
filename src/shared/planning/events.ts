/**
 * Construction des événements planning à partir des créneaux normalisés
 */

import { unwrapArray, isActiveUser, type NormalizedCreneau } from "./normalize";

export interface TechOption {
  id: number;
  label: string;
  color?: string;
}

export interface PlanningEvent {
  id: string;
  refType: string;
  userId: number;
  start: Date;
  end: Date;
  title: string;
  color?: string;
}

/**
 * Détecte si un utilisateur est un technicien
 * RÈGLE IDENTIQUE À techTools.ts:
 * - isTechnicien=true OU
 * - type="technicien" OU  
 * - (type="utilisateur" ET universes non vide)
 */
function isTechnicienUser(u: Record<string, unknown>): boolean {
  const type = String(u.type ?? "").toLowerCase();
  const data = u.data as Record<string, unknown> | undefined;
  const universes = data?.universes;
  const hasUniverses = Array.isArray(universes) && universes.length > 0;
  
  return (
    u.isTechnicien === true ||
    type === "technicien" ||
    (type === "utilisateur" && hasUniverses)
  );
}

/**
 * Construit la liste des techniciens pour le planning
 * RÈGLE: même détection de technicien que les stats, mais SANS filtrer sur is_on
 * (on affiche tous les techniciens, actifs ou non).
 */
export function buildTechOptions(rawUsers: unknown): TechOption[] {
  const users = unwrapArray(rawUsers);
  return users
    .filter((u) => {
      const obj = u as Record<string, unknown>;
      // Ne PAS filtrer sur is_on ici : on veut la liste complète
      return isTechnicienUser(obj);
    })
    .map((u) => {
      const obj = u as Record<string, unknown>;
      const firstname = String(obj.firstname ?? "").trim();
      const name = String(obj.name ?? "").trim();
      const label = `${firstname} ${name}`.trim() || `#${obj.id}`;
      
      // Extraction couleur avec fallbacks (même logique que techTools)
      const data = obj.data as Record<string, unknown> | undefined;
      const bgcolor = data?.bgcolor as Record<string, string> | undefined;
      const color =
        bgcolor?.hex ||
        (obj.bgcolor as Record<string, string> | undefined)?.hex ||
        (data?.color as Record<string, string> | undefined)?.hex ||
        (obj.color as Record<string, string> | undefined)?.hex ||
        "#808080";
      
      return {
        id: Number(obj.id),
        label,
        color,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export function buildEvents(
  creneaux: NormalizedCreneau[],
  techId?: number,
  weekStart?: Date,
  weekEnd?: Date
): PlanningEvent[] {
  const out: PlanningEvent[] = [];
  
  for (const c of creneaux ?? []) {
    const start = new Date(c.date);
    if (isNaN(start.getTime())) continue;
    
    const end = new Date(start.getTime() + c.duree * 60_000);

    // Filtrage par semaine
    if (weekStart && start < weekStart) continue;
    if (weekEnd && start > weekEnd) continue;

    // Un event par userId
    for (const uid of c.usersIds ?? []) {
      if (techId && uid !== techId) continue;
      
      out.push({
        id: `${c.id}:${uid}`,
        refType: c.refType,
        userId: uid,
        start,
        end,
        title: getEventTitle(c.refType),
      });
    }
  }
  
  return out;
}

function getEventTitle(refType: string): string {
  switch (refType) {
    case "visite-interv": return "Intervention";
    case "conge": return "Congé";
    case "rappel": return "Rappel";
    default: return refType;
  }
}
