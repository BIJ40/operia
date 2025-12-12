/**
 * Construction des événements planning à partir des créneaux normalisés
 */

import { unwrapArray, isActiveUser, isTechnician, type NormalizedCreneau } from "./normalize";

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

export function buildTechOptions(rawUsers: unknown): TechOption[] {
  const users = unwrapArray(rawUsers);
  return users
    .filter(isActiveUser)
    .filter(isTechnician)
    .map((u) => {
      const obj = u as Record<string, unknown>;
      const firstname = String(obj.firstname ?? "").trim();
      const name = String(obj.name ?? "").trim();
      const label = `${firstname} ${name}`.trim() || `#${obj.id}`;
      
      // Extraction couleur avec fallbacks
      let color: string | undefined;
      const data = obj.data as Record<string, unknown> | undefined;
      if (data?.bgcolor) {
        const bgcolor = data.bgcolor as Record<string, string>;
        color = bgcolor.hex8 ?? bgcolor.hex;
      }
      
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
