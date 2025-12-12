/**
 * Utilitaires de calcul de temps pour le planning
 */

import type { PlanningEvent } from "./events";

function overlapMinutes(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): number {
  const s = Math.max(aStart.getTime(), bStart.getTime());
  const e = Math.min(aEnd.getTime(), bEnd.getTime());
  return Math.max(0, Math.round((e - s) / 60_000));
}

export interface LunchBlock {
  start: Date;
  end: Date;
}

export function buildLunchBlocks(weekStart: Date): LunchBlock[] {
  const blocks: LunchBlock[] = [];
  for (let d = 0; d < 5; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    
    const s = new Date(day);
    s.setHours(12, 0, 0, 0);
    
    const e = new Date(day);
    e.setHours(13, 0, 0, 0);
    
    blocks.push({ start: s, end: e });
  }
  return blocks;
}

/**
 * Calcule le temps de travail hebdo en minutes
 * Exclut le chevauchement avec la pause méridiane 12:00-13:00
 */
export function computeWeeklyWorkMinutes(events: PlanningEvent[], weekStart: Date): number {
  const lunch = buildLunchBlocks(weekStart);
  const work = events.filter((e) => e.refType === "visite-interv");

  let total = 0;
  let minusLunch = 0;

  for (const ev of work) {
    total += Math.round((ev.end.getTime() - ev.start.getTime()) / 60_000);
    for (const lb of lunch) {
      minusLunch += overlapMinutes(ev.start, ev.end, lb.start, lb.end);
    }
  }

  return Math.max(0, total - minusLunch);
}

export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/**
 * Obtient les jours de la semaine (lun→ven)
 */
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let d = 0; d < 5; d++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + d);
    days.push(day);
  }
  return days;
}
