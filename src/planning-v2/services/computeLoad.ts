/**
 * Planning V2 — Calcul de charge, conflits, trous
 */

import {
  HOUR_START,
  HOUR_END,
  DEFAULT_MAX_DAILY_MINUTES,
  CHARGE_LIGHT_THRESHOLD,
  CHARGE_OVERLOAD_THRESHOLD,
} from "../constants";
import type { TechDaySchedule } from "../types/schedule";
import { getWorkingMinutesForDay } from "../types/schedule";
import type {
  PlanningAppointment,
  PlanningBlock,
  PlanningAlert,
  TechDayLoad,
  GapSlot,
  WeekHeatmapCell,
  LoadStatus,
} from "../types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function minutesOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): number {
  const overlapStart = Math.max(a.start.getTime(), b.start.getTime());
  const overlapEnd = Math.min(a.end.getTime(), b.end.getTime());
  return Math.max(0, (overlapEnd - overlapStart) / 60_000);
}

// ─── Charge journalière par technicien ──────────────────────────────────────

export function computeTechDayLoad(
  techId: number,
  date: string,
  appointments: PlanningAppointment[],
  blocks: PlanningBlock[],
  maxDaily: number = DEFAULT_MAX_DAILY_MINUTES
): TechDayLoad {
  const dayAppts = appointments.filter(
    (a) => a.technicianIds.includes(techId) && dateKey(a.start) === date
  );
  const dayBlocks = blocks.filter(
    (b) => b.techId === techId && dateKey(b.start) === date
  );

  const interventionMinutes = dayAppts.reduce((s, a) => s + a.durationMinutes, 0);
  const blockedMinutes = dayBlocks.reduce((s, b) => {
    const dur = (b.end.getTime() - b.start.getTime()) / 60_000;
    return s + Math.max(0, dur);
  }, 0);

  const totalOccupied = interventionMinutes + blockedMinutes;
  const dayTotalMinutes = (HOUR_END - HOUR_START) * 60; // 720
  const freeMinutes = Math.max(0, dayTotalMinutes - totalOccupied);
  const chargePercent = Math.min(100, Math.round((totalOccupied / maxDaily) * 100));

  // Détection conflits
  const hasConflict = detectConflictsForDay(dayAppts).length > 0;
  const hasAmplitudeOverflow = totalOccupied > maxDaily;

  // Calcul des trous
  const gapSlots = computeGaps(date, dayAppts, dayBlocks);

  return {
    techId,
    date,
    rdvCount: dayAppts.length,
    interventionMinutes,
    blockedMinutes,
    travelMinutes: 0, // calculé séparément
    freeMinutes,
    chargePercent,
    gapSlots,
    hasConflict,
    hasSkillMismatch: false,
    hasAmplitudeOverflow,
  };
}

// ─── Détection conflits ─────────────────────────────────────────────────────

export function computeScheduleConflicts(
  appointments: PlanningAppointment[],
  blocks: PlanningBlock[]
): PlanningAlert[] {
  const alerts: PlanningAlert[] = [];

  // Grouper par technicien + jour
  const byTechDay = new Map<string, PlanningAppointment[]>();
  for (const a of appointments) {
    for (const tid of a.technicianIds) {
      const key = `${tid}:${dateKey(a.start)}`;
      if (!byTechDay.has(key)) byTechDay.set(key, []);
      byTechDay.get(key)!.push(a);
    }
  }

  for (const [key, appts] of byTechDay) {
    const conflicts = detectConflictsForDay(appts);
    const [techIdStr] = key.split(":");
    const techId = Number(techIdStr);

    for (const [a, b] of conflicts) {
      alerts.push({
        id: `conflict-${a.id}-${b.id}`,
        type: "conflict",
        severity: "error",
        message: `Chevauchement : ${a.client} et ${b.client}`,
        appointmentId: a.id,
        techId,
      });
    }
  }

  return alerts;
}

function detectConflictsForDay(
  appts: PlanningAppointment[]
): [PlanningAppointment, PlanningAppointment][] {
  const conflicts: [PlanningAppointment, PlanningAppointment][] = [];
  const sorted = [...appts].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (minutesOverlap(sorted[i], sorted[j]) > 0) {
        conflicts.push([sorted[i], sorted[j]]);
      }
    }
  }
  return conflicts;
}

// ─── Calcul des trous exploitables ──────────────────────────────────────────

function computeGaps(
  date: string,
  appts: PlanningAppointment[],
  blocks: PlanningBlock[]
): GapSlot[] {
  const dayStart = new Date(`${date}T0${HOUR_START}:00:00`);
  const dayEnd = new Date(`${date}T${HOUR_END}:00:00`);

  // Fusionner tous les blocs occupés
  const occupied: { start: Date; end: Date }[] = [
    ...appts.map((a) => ({ start: a.start, end: a.end })),
    ...blocks.map((b) => ({ start: b.start, end: b.end })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const gaps: GapSlot[] = [];
  let cursor = dayStart.getTime();

  for (const slot of occupied) {
    const slotStart = Math.max(slot.start.getTime(), dayStart.getTime());
    const slotEnd = Math.min(slot.end.getTime(), dayEnd.getTime());
    if (slotStart > cursor) {
      const gapDur = (slotStart - cursor) / 60_000;
      if (gapDur >= 30) {
        gaps.push({
          start: new Date(cursor),
          end: new Date(slotStart),
          durationMinutes: gapDur,
        });
      }
    }
    cursor = Math.max(cursor, slotEnd);
  }

  // Trou final
  if (cursor < dayEnd.getTime()) {
    const gapDur = (dayEnd.getTime() - cursor) / 60_000;
    if (gapDur >= 30) {
      gaps.push({
        start: new Date(cursor),
        end: dayEnd,
        durationMinutes: gapDur,
      });
    }
  }

  return gaps;
}

// ─── Heatmap semaine ────────────────────────────────────────────────────────

export function computeWeeklyHeatmap(
  techIds: number[],
  dates: string[],
  appointments: PlanningAppointment[],
  blocks: PlanningBlock[],
  alerts: PlanningAlert[]
): WeekHeatmapCell[] {
  const cells: WeekHeatmapCell[] = [];

  for (const techId of techIds) {
    for (const date of dates) {
      const load = computeTechDayLoad(techId, date, appointments, blocks);

      // Absent = jour entier bloqué
      const dayBlocks = blocks.filter(
        (b) => b.techId === techId && dateKey(b.start) === date
      );
      const isAbsent = dayBlocks.some(
        (b) => b.type === "conge" || b.type === "absence"
      ) && load.rdvCount === 0;

      let status: LoadStatus = "normal";
      if (isAbsent) status = "absent";
      else if (load.chargePercent >= CHARGE_OVERLOAD_THRESHOLD) status = "overload";
      else if (load.chargePercent <= CHARGE_LIGHT_THRESHOLD) status = "light";

      const dayAlerts = alerts.filter(
        (a) => a.techId === techId && a.date === date
      );

      cells.push({
        techId,
        date,
        load: load.chargePercent,
        rdvCount: load.rdvCount,
        travelMinutes: load.travelMinutes,
        status,
        alertsCount: dayAlerts.length,
      });
    }
  }

  return cells;
}
