/**
 * Planning V2 — Types pour la semaine type technicien
 */

export interface TechDaySchedule {
  dayOfWeek: number; // 0=Dimanche, 1=Lundi ... 6=Samedi
  isWorking: boolean;
  workStart: string; // "08:00"
  workEnd: string;   // "17:00"
  lunchStart: string; // "12:00"
  lunchEnd: string;   // "13:00"
}

export type TechWeeklySchedule = TechDaySchedule[];

/** Calcule les minutes de travail effectif pour un jour donné */
export function getWorkingMinutesForDay(schedule: TechDaySchedule | undefined): number {
  if (!schedule || !schedule.isWorking) return 0;

  const [wsh, wsm] = schedule.workStart.split(":").map(Number);
  const [weh, wem] = schedule.workEnd.split(":").map(Number);
  const [lsh, lsm] = schedule.lunchStart.split(":").map(Number);
  const [leh, lem] = schedule.lunchEnd.split(":").map(Number);

  const workMinutes = (weh * 60 + wem) - (wsh * 60 + wsm);
  const lunchMinutes = (leh * 60 + lem) - (lsh * 60 + lsm);

  return Math.max(0, workMinutes - Math.max(0, lunchMinutes));
}

/** Retourne le schedule pour un jour de la semaine (0-6) */
export function getScheduleForDayOfWeek(
  schedules: TechWeeklySchedule,
  dayOfWeek: number
): TechDaySchedule | undefined {
  return schedules.find((s) => s.dayOfWeek === dayOfWeek);
}

/** Schedule par défaut : Lun-Ven 8h-17h, pause 12h-13h */
export function getDefaultWeekSchedule(): TechWeeklySchedule {
  return [
    { dayOfWeek: 1, isWorking: true, workStart: "08:00", workEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 2, isWorking: true, workStart: "08:00", workEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 3, isWorking: true, workStart: "08:00", workEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 4, isWorking: true, workStart: "08:00", workEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 5, isWorking: true, workStart: "08:00", workEnd: "17:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 6, isWorking: false, workStart: "08:00", workEnd: "12:00", lunchStart: "12:00", lunchEnd: "13:00" },
    { dayOfWeek: 0, isWorking: false, workStart: "08:00", workEnd: "12:00", lunchStart: "12:00", lunchEnd: "13:00" },
  ];
}
