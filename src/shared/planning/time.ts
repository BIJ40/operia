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
/**
 * Fusionne les intervalles de temps qui se chevauchent
 */
function mergeIntervals(intervals: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
  if (intervals.length === 0) return [];

  // Trier par date de début
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Si chevauchement ou contigu, on fusionne
    if (current.start.getTime() <= last.end.getTime()) {
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calcule le temps de travail hebdo en minutes
 * Fusionne les créneaux qui se chevauchent pour ne pas compter deux fois
 * Exclut le chevauchement avec la pause méridiane 12:00-13:00
 */
export function computeWeeklyWorkMinutes(events: PlanningEvent[], weekStart: Date): number {
  const lunch = buildLunchBlocks(weekStart);
  const work = events.filter((e) => e.refType === "visite-interv");

  // Fusionner les créneaux qui se chevauchent
  const intervals = work.map((e) => ({ start: e.start, end: e.end }));
  const merged = mergeIntervals(intervals);

  let total = 0;
  let minusLunch = 0;

  for (const interval of merged) {
    total += Math.round((interval.end.getTime() - interval.start.getTime()) / 60_000);
    for (const lb of lunch) {
      minusLunch += overlapMinutes(interval.start, interval.end, lb.start, lb.end);
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
