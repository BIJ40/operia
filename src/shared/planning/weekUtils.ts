import { startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PlanningEvent } from "@/shared/types/apogeePlanning";

/**
 * Retourne le lundi 00:00 et dimanche 23:59:59 de la semaine contenant `date`
 */
export function getWeekRange(date: Date): { weekStart: Date; weekEnd: Date } {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Dimanche
  return { weekStart, weekEnd };
}

/**
 * Formate la plage de semaine pour affichage
 */
export function formatWeekRange(weekStart: Date, weekEnd: Date): string {
  const start = format(weekStart, "d MMM", { locale: fr });
  const end = format(weekEnd, "d MMM yyyy", { locale: fr });
  return `Semaine du ${start} au ${end}`;
}

/**
 * Génère les 5 blocs pause méridiane (lun→ven) 12:00–13:00
 */
export function buildLunchBreakBlocks(weekStart: Date): PlanningEvent[] {
  const blocks: PlanningEvent[] = [];
  
  for (let d = 0; d < 5; d++) {
    const day = addDays(weekStart, d);
    
    const lunchStart = new Date(day);
    lunchStart.setHours(12, 0, 0, 0);
    
    const lunchEnd = new Date(day);
    lunchEnd.setHours(13, 0, 0, 0);
    
    blocks.push({
      id: `lunch-${d}`,
      refType: "pause",
      start: lunchStart,
      end: lunchEnd,
      userId: 0,
      title: "Pause méridienne",
      color: "#94a3b8", // slate-400
      creneauId: -1,
      dureeMin: 60,
    });
  }
  
  return blocks;
}

/**
 * Jours de la semaine (lun→ven)
 */
export function getWeekDays(weekStart: Date): { date: Date; label: string; shortLabel: string }[] {
  const days = [];
  for (let d = 0; d < 5; d++) {
    const date = addDays(weekStart, d);
    days.push({
      date,
      label: format(date, "EEEE d", { locale: fr }),
      shortLabel: format(date, "EEE d", { locale: fr }),
    });
  }
  return days;
}
