import type { PlanningEvent } from "@/shared/types/apogeePlanning";

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, Math.round((e - s) / 60_000));
}

/**
 * Calcule le temps de travail hebdo en minutes (hors pause méridiane 12h-13h)
 */
export function computeWeeklyWorkMinutes(events: PlanningEvent[], weekStart: Date): number {
  // Calcul du chevauchement avec la pause 12:00-13:00 lun->ven
  const lunchOverlaps = (ev: PlanningEvent): number => {
    let overlap = 0;
    for (let d = 0; d < 5; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);

      const lunchStart = new Date(day);
      lunchStart.setHours(12, 0, 0, 0);
      const lunchEnd = new Date(day);
      lunchEnd.setHours(13, 0, 0, 0);

      overlap += overlapMinutes(ev.start, ev.end, lunchStart, lunchEnd);
    }
    return overlap;
  };

  // Filtrer uniquement les events de type travail
  const workEvents = events.filter(e => e.refType === "visite-interv");

  const total = workEvents.reduce(
    (sum, e) => sum + Math.round((e.end.getTime() - e.start.getTime()) / 60_000),
    0
  );
  const minusLunch = workEvents.reduce((sum, e) => sum + lunchOverlaps(e), 0);

  return Math.max(0, total - minusLunch);
}

/**
 * Formate des minutes en "Xh00"
 */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}
