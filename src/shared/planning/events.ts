/**
 * Construction des événements planning à partir des créneaux normalisés
 */

import { unwrapArray, isActiveUser, type NormalizedCreneau } from "./normalize";
import type { EnrichedCreneau } from "@/shared/api/apogee/usePlanningData";

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
  clientName?: string;
  clientCity?: string;
  projectRef?: string;
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
 * Construit la liste des techniciens ACTIFS pour le planning
 * RÈGLE: type technicien (isTechnicienUser) ET is_on === true
 */
export function buildTechOptions(rawUsers: unknown): TechOption[] {
  const users = unwrapArray(rawUsers);
  return users
    .filter((u) => {
      const obj = u as Record<string, unknown>;
      // Doit être un technicien ET is_on === true
      return isTechnicienUser(obj) && isActiveUser(obj);
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
  creneaux: (NormalizedCreneau | EnrichedCreneau)[],
  techId?: number,
  weekStart?: Date,
  weekEnd?: Date
): PlanningEvent[] {
  const out: PlanningEvent[] = [];

  // Normaliser bornes de semaine (si fournies)
  const weekStartTs = weekStart ? weekStart.getTime() : undefined;
  const weekEndTs = weekEnd ? weekEnd.getTime() : undefined;

  for (const c of creneaux ?? []) {
    const slotStart = new Date(c.date);
    if (isNaN(slotStart.getTime())) continue;

    const slotEnd = new Date(slotStart.getTime() + c.duree * 60_000);

    // Appliquer un premier filtre large sur la semaine (intervalle entier en dehors de la semaine)
    if (weekStartTs !== undefined && slotEnd.getTime() < weekStartTs) continue;
    if (weekEndTs !== undefined && slotStart.getTime() > weekEndTs) continue;

    // Récupérer les infos client si disponibles (EnrichedCreneau)
    const enriched = c as EnrichedCreneau;
    const clientName = enriched.clientName;
    const clientCity = enriched.clientCity;
    const projectRef = enriched.projectRef;
    const interventionType = enriched.interventionType;

    // On découpe le créneau en événements quotidiens pour que les congés longs
    // s'affichent sur chaque jour de la semaine
    const dayCursor = new Date(slotStart);
    dayCursor.setHours(0, 0, 0, 0);

    while (dayCursor.getTime() <= slotEnd.getTime()) {
      // Filtre semaine: ignorer les jours en dehors des bornes
      if (weekStartTs !== undefined && dayCursor.getTime() < weekStartTs) {
        dayCursor.setDate(dayCursor.getDate() + 1);
        continue;
      }
      if (weekEndTs !== undefined && dayCursor.getTime() > weekEndTs) break;

      // Limites de la journée 07:00 - 19:00
      const dayStart = new Date(dayCursor);
      dayStart.setHours(7, 0, 0, 0);
      const dayEnd = new Date(dayCursor);
      dayEnd.setHours(19, 0, 0, 0);

      const segStart = new Date(
        Math.max(slotStart.getTime(), dayStart.getTime())
      );
      const segEnd = new Date(
        Math.min(slotEnd.getTime(), dayEnd.getTime())
      );

      if (segEnd.getTime() > segStart.getTime()) {
        // Filtrer les congés de moins de 4h (240 minutes)
        const segDurationMinutes = (segEnd.getTime() - segStart.getTime()) / 60_000;
        if (c.refType === "conge" && segDurationMinutes < 240) {
          dayCursor.setDate(dayCursor.getDate() + 1);
          continue;
        }
        
        for (const uid of c.usersIds ?? []) {
          if (techId && uid !== techId) continue;

          out.push({
            id: `${c.id}:${uid}:${dayCursor.getTime()}`,
            refType: c.refType,
            userId: uid,
            start: segStart,
            end: segEnd,
            title: getEventTitle(interventionType || c.refType),
            clientName,
            clientCity,
            projectRef,
          });
        }
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }
  }

  return out;
}

function getEventTitle(refType: string): string {
  const normalized = (refType || "").toLowerCase().trim();
  switch (normalized) {
    // Types d'intervention visite-interv enrichis
    case "visite-interv": return ""; // Affiche rien, le détail client/projet suffit
    case "depannage": return "Dépannage";
    case "travaux": 
    case "tvx": return "Travaux";
    case "rt":
    case "rdvtech":
    case "releve technique": return "RDV Technique";
    case "sav": return "SAV";
    case "th": return "TH";
    case "diagnostic": return "Diagnostic";
    // Types du nouveau endpoint apiGetPlanningCreneaux
    case "conge": return "Congé / Absence";
    case "rappel": return "Tâche";
    case "absence": return "Congé / Absence";
    case "tache": return "Tâche";
    case "rdv": return "RDV";
    default: return "";
  }
}
