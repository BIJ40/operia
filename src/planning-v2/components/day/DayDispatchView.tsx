/**
 * Planning V2 — Vue Jour Dispatch
 * Grille verticale (heures) × horizontale (techniciens)
 */

import { useMemo, useRef } from "react";
import { HOUR_START, HOUR_END, HOUR_HEIGHT_PX, TECH_COLUMN_MIN_WIDTH, TIME_AXIS_WIDTH, GRID_TOTAL_HEIGHT } from "../../constants";
import { TechColumnHeader } from "./TechColumnHeader";
import { AppointmentCard } from "./AppointmentCard";
import { BlockCard } from "./BlockCard";
import { TimeAxis } from "./TimeAxis";
import { CurrentTimeLine } from "./CurrentTimeLine";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningAlert,
  TechDayLoad,
  DisplayDensity,
} from "../../types";

interface DayDispatchViewProps {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  alerts: PlanningAlert[];
  loads: Map<string, TechDayLoad>;
  selectedDate: Date;
  density: DisplayDensity;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DayDispatchView({
  technicians,
  appointments,
  blocks,
  alerts,
  loads,
  selectedDate,
  density,
}: DayDispatchViewProps) {
  const dk = dateKey(selectedDate);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filtrer les rendez-vous du jour
  const dayAppointments = useMemo(
    () => appointments.filter((a) => dateKey(a.start) === dk),
    [appointments, dk]
  );
  const dayBlocks = useMemo(
    () => blocks.filter((b) => dateKey(b.start) === dk),
    [blocks, dk]
  );

  // Grouper par technicien
  const apptsByTech = useMemo(() => {
    const map = new Map<number, PlanningAppointment[]>();
    for (const a of dayAppointments) {
      for (const tid of a.technicianIds) {
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(a);
      }
    }
    return map;
  }, [dayAppointments]);

  const blocksByTech = useMemo(() => {
    const map = new Map<number, PlanningBlock[]>();
    for (const b of dayBlocks) {
      if (!map.has(b.techId)) map.set(b.techId, []);
      map.get(b.techId)!.push(b);
    }
    return map;
  }, [dayBlocks]);

  // Conflits indexés par appointmentId
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (const a of alerts) {
      if (a.type === "conflict" && a.appointmentId) ids.add(a.appointmentId);
    }
    return ids;
  }, [alerts]);

  return (
    <div className="h-full overflow-auto" ref={scrollRef}>
      <div className="inline-flex min-w-full">
        {/* ── Time Axis (sticky left) ── */}
        <div
          className="sticky left-0 z-30 bg-card border-r border-border shrink-0"
          style={{ width: TIME_AXIS_WIDTH }}
        >
          {/* Header spacer */}
          <div className="h-[88px] border-b border-border" />
          {/* Time labels */}
          <div className="relative" style={{ height: GRID_TOTAL_HEIGHT }}>
            <TimeAxis />
          </div>
        </div>

        {/* ── Technician Columns ── */}
        {technicians.map((tech) => {
          const techAppts = apptsByTech.get(tech.id) ?? [];
          const techBlocks = blocksByTech.get(tech.id) ?? [];
          const load = loads.get(`${tech.id}:${dk}`);

          return (
            <div
              key={tech.id}
              className="shrink-0 border-r border-border"
              style={{ minWidth: TECH_COLUMN_MIN_WIDTH, width: TECH_COLUMN_MIN_WIDTH }}
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-20 bg-card border-b border-border">
                <TechColumnHeader tech={tech} load={load} density={density} />
              </div>

              {/* Grid body */}
              <div className="relative" style={{ height: GRID_TOTAL_HEIGHT }}>
                {/* Hour grid lines */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div
                    key={i}
                    className="absolute w-full border-b border-border/40"
                    style={{ top: i * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX - 1, height: 1 }}
                  />
                ))}

                {/* Half-hour dashed lines */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div
                    key={`half-${i}`}
                    className="absolute w-full border-b border-dashed border-border/20"
                    style={{ top: i * HOUR_HEIGHT_PX + HOUR_HEIGHT_PX / 2, height: 1 }}
                  />
                ))}

                {/* Blocks */}
                {techBlocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    selectedDate={selectedDate}
                  />
                ))}

                {/* Appointments */}
                {techAppts.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    techColor={tech.color}
                    density={density}
                    hasConflict={conflictIds.has(appt.id)}
                    selectedDate={selectedDate}
                  />
                ))}

                {/* Current time line */}
                <CurrentTimeLine selectedDate={selectedDate} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
