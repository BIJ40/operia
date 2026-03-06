/**
 * Planning V2 — Vue Semaine Planning
 * Même logique que la vue Jour mais sur 5 jours (Lun-Ven)
 * Layout : colonnes = jours, chaque jour contient les colonnes techniciens
 * Très compact : colonnes étroites, texte réduit
 */

import { useMemo, useRef, useState } from "react";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  HOUR_START,
  HOUR_END,
  HOUR_HEIGHT_PX,
  LUNCH_START,
  LUNCH_END,
  GRID_TOTAL_HEIGHT,
  WEEK_DAYS,
  UNAVAILABLE_BLOCK_TYPES,
} from "../../constants";
import { TimeAxis } from "../day/TimeAxis";
import { CurrentTimeLine } from "../day/CurrentTimeLine";
import { AppointmentCard } from "../day/AppointmentCard";
import type { PartnerTechInfo } from "../day/AppointmentCard";
import { BlockCard } from "../day/BlockCard";
import { DetailDrawer } from "../shared/DetailDrawer";
import { dateKey } from "../../utils/dateUtils";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningAlert,
  TechDayLoad,
  HoverDisplaySettings,
} from "../../types";

// Compact constants for week view
const WEEK_HOUR_HEIGHT = 50; // smaller than day view's 80
const WEEK_GRID_HEIGHT = (HOUR_END - HOUR_START) * WEEK_HOUR_HEIGHT;
const WEEK_TIME_AXIS_WIDTH = 36;

interface WeekPlanningViewProps {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  alerts: PlanningAlert[];
  loads: Map<string, TechDayLoad>;
  selectedDate: Date;
  hoverSettings: HoverDisplaySettings;
  showUnavailable: boolean;
}

function isTechUnavailableForDay(
  techId: number,
  blocks: PlanningBlock[],
  appointments: PlanningAppointment[],
  dk: string
): boolean {
  const techBlocks = blocks.filter(b => b.techId === techId && dateKey(b.start) === dk);
  const unavailBlocks = techBlocks.filter(b => UNAVAILABLE_BLOCK_TYPES.includes(b.type));
  if (unavailBlocks.length > 0) {
    const totalMin = unavailBlocks.reduce((s, b) => s + (b.end.getTime() - b.start.getTime()) / 60_000, 0);
    if (totalMin >= 360) return true;
  }
  // Un tech sans RDV n'est PAS absent — il est libre (charge 0%)
  const techAppts = appointments.filter(a => a.technicianIds.includes(techId) && dateKey(a.start) === dk);
  if (techAppts.length > 0) {
    const allRepos = techAppts.every(a => {
      const c = (a.client || "").toUpperCase();
      const r = (a.projectRef || "").toUpperCase();
      return c.includes("REPOS") || r.includes("REPOS");
    });
    if (allRepos) return true;
  }
  return false;
}

function computeOverlapLayout(appts: PlanningAppointment[]): Map<string, { colIndex: number; totalCols: number }> {
  const result = new Map<string, { colIndex: number; totalCols: number }>();
  if (appts.length === 0) return result;
  const sorted = [...appts].sort((a, b) => a.start.getTime() - b.start.getTime());
  const groups: PlanningAppointment[][] = [];
  let currentGroup: PlanningAppointment[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    if (sorted[i].start.getTime() < prev.end.getTime()) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);
  for (const group of groups) {
    const columns: number[] = [];
    const assignments = new Map<string, number>();
    for (const appt of group) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (appt.start.getTime() >= columns[c]) {
          columns[c] = appt.end.getTime();
          assignments.set(appt.id, c);
          placed = true;
          break;
        }
      }
      if (!placed) {
        assignments.set(appt.id, columns.length);
        columns.push(appt.end.getTime());
      }
    }
    const totalCols = columns.length;
    for (const appt of group) {
      result.set(appt.id, { colIndex: assignments.get(appt.id)!, totalCols });
    }
  }
  return result;
}

export function WeekPlanningView({
  technicians,
  appointments,
  blocks,
  alerts,
  loads,
  selectedDate,
  hoverSettings,
  showUnavailable,
}: WeekPlanningViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() =>
    Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedAppt, setSelectedAppt] = useState<PlanningAppointment | null>(null);

  // Tech lookup
  const techMap = useMemo(() => {
    const m = new Map<number, PlanningTechnician>();
    for (const t of technicians) m.set(t.id, t);
    return m;
  }, [technicians]);

  // Per-day visible techs (filter unavailable per day, not globally)
  const visibleTechsByDay = useMemo(() => {
    const map = new Map<string, PlanningTechnician[]>();
    for (const day of weekDays) {
      const dk = dateKey(day);
      if (showUnavailable) {
        map.set(dk, technicians);
      } else {
        map.set(dk, technicians.filter(tech =>
          !isTechUnavailableForDay(tech.id, blocks, appointments, dk)
        ));
      }
    }
    return map;
  }, [technicians, showUnavailable, weekDays, blocks, appointments]);

  // Conflict IDs
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of alerts) {
      if (a.type === "conflict" && a.appointmentId) ids.add(a.appointmentId);
    }
    return ids;
  }, [alerts]);

  const lunchTop = (LUNCH_START - HOUR_START) * WEEK_HOUR_HEIGHT;
  const lunchHeight = (LUNCH_END - LUNCH_START) * WEEK_HOUR_HEIGHT;

  return (
    <>
       <div className="h-full overflow-auto" ref={scrollRef}>
        <div className="flex min-w-0 w-full">
          {/* Time axis - sticky left */}
          <div
            className="sticky left-0 z-30 bg-card border-r border-border shrink-0"
            style={{ width: WEEK_TIME_AXIS_WIDTH }}
          >
            <div className="h-[52px] border-b border-border" />
            <div className="relative" style={{ height: WEEK_GRID_HEIGHT }}>
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div
                  key={i}
                  className="absolute text-[9px] text-muted-foreground text-right pr-1"
                  style={{ top: i * WEEK_HOUR_HEIGHT - 5, width: WEEK_TIME_AXIS_WIDTH }}
                >
                  {HOUR_START + i}h
                </div>
              ))}
            </div>
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dk = dateKey(day);
            const today = isToday(day);
            const dayAppts = appointments.filter(a => dateKey(a.start) === dk);
            const dayBlocks = blocks.filter(b => dateKey(b.start) === dk);

            const dayVisibleTechs = visibleTechsByDay.get(dk) ?? [];

            return (
              <div
                key={dk}
                className={`flex-1 min-w-0 border-r-2 border-border/60 ${today ? "bg-primary/[0.02]" : ""}`}
              >
                {/* Day header - sticky top */}
                <div className={`sticky top-0 z-20 border-b border-border text-center py-1.5 px-1 ${today ? "bg-primary/10" : "bg-card"}`}>
                  <div className="text-[10px] uppercase text-muted-foreground font-medium">
                    {format(day, "EEE", { locale: fr })}
                  </div>
                  <div className={`text-xs font-semibold ${today ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d MMM", { locale: fr })}
                  </div>
                </div>

                {/* Tech sub-columns within this day */}
                <div className="flex" style={{ height: WEEK_GRID_HEIGHT }}>
                  {dayVisibleTechs.map((tech) => {
                    const techAppts = dayAppts.filter(a => a.technicianIds.includes(tech.id));
                    const techBlocks = dayBlocks.filter(b => b.techId === tech.id);
                    const isUnavail = isTechUnavailableForDay(tech.id, dayBlocks, dayAppts, dk);
                    const layout = computeOverlapLayout(techAppts);

                    return (
                      <div
                        key={tech.id}
                        className={`relative border-r border-border/30 flex-1 min-w-0 ${isUnavail ? "opacity-30 bg-muted/20" : ""}`}
                        >
                      >
                        {/* Initials header at top of column */}
                        <div
                          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-0.5"
                          style={{ height: 18 }}
                        >
                          <span
                            className="text-[8px] font-bold text-white px-1 rounded"
                            style={{ backgroundColor: tech.color }}
                          >
                            {tech.initials}
                          </span>
                        </div>

                        {/* Hour grid lines */}
                        {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                          <div
                            key={i}
                            className="absolute w-full border-b border-border/30"
                            style={{ top: i * WEEK_HOUR_HEIGHT + WEEK_HOUR_HEIGHT - 1, height: 1 }}
                          />
                        ))}

                        {/* Lunch */}
                        <div
                          className="absolute left-0 right-0 pointer-events-none"
                          style={{
                            top: lunchTop,
                            height: lunchHeight,
                            background: "repeating-linear-gradient(135deg, transparent, transparent 3px, hsl(var(--muted) / 0.4) 3px, hsl(var(--muted) / 0.4) 4px)",
                          }}
                        />

                        {/* Blocks */}
                        {techBlocks.map((block) => (
                          <BlockCard
                            key={block.id}
                            block={block}
                            selectedDate={day}
                            stackIndex={0}
                            hourHeight={WEEK_HOUR_HEIGHT}
                            compact
                            onViewDetails={(b) => {
                              toast.info(b.label, {
                                description: `${b.type} — ${format(b.start, "HH:mm")} à ${format(b.end, "HH:mm")}`,
                              });
                            }}
                          />
                        ))}

                        {/* Appointments */}
                        {techAppts.map((appt) => {
                          const info = layout.get(appt.id) ?? { colIndex: 0, totalCols: 1 };
                          const partners: PartnerTechInfo[] = appt.isBinome
                            ? appt.technicianIds
                                .filter(tid => tid !== tech.id)
                                .map(tid => {
                                  const t = techMap.get(tid);
                                  return t
                                    ? { id: t.id, initials: t.initials, color: t.color, name: t.name }
                                    : { id: tid, initials: "??", color: "#888", name: `Tech #${tid}` };
                                })
                            : [];
                          return (
                            <AppointmentCard
                              key={appt.id}
                              appointment={appt}
                              techColor={tech.color}
                              density="compact"
                              hasConflict={conflictIds.has(appt.id)}
                              selectedDate={day}
                              hoverSettings={hoverSettings}
                              onViewDetails={setSelectedAppt}
                              partnerTechs={partners}
                              colIndex={info.colIndex}
                              totalCols={info.totalCols}
                              hourHeight={WEEK_HOUR_HEIGHT}
                            />
                          );
                        })}

                        {/* Current time line */}
                        {today && <CurrentTimeLine selectedDate={day} hourHeight={WEEK_HOUR_HEIGHT} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DetailDrawer
        appointment={selectedAppt}
        technicians={technicians}
        open={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
      />
    </>
  );
}
