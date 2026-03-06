/**
 * Planning V2 — Vue Jour Dispatch
 * Grille verticale (heures) × horizontale (techniciens)
 * Gère la coupure visuelle pause déjeuner + masquage des indisponibles
 */

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { HOUR_START, HOUR_END, HOUR_HEIGHT_PX, LUNCH_START, LUNCH_END, TECH_COLUMN_MIN_WIDTH, TIME_AXIS_WIDTH, GRID_TOTAL_HEIGHT, UNAVAILABLE_BLOCK_TYPES } from "../../constants";
import { TechColumnHeader } from "./TechColumnHeader";
import { TechContextMenu } from "./TechContextMenu";
import { AppointmentCard } from "./AppointmentCard";
import type { PartnerTechInfo } from "./AppointmentCard";
import { BlockCard } from "./BlockCard";
import { TimeAxis } from "./TimeAxis";
import { CurrentTimeLine } from "./CurrentTimeLine";
import { DetailDrawer } from "../shared/DetailDrawer";
import { dateKey } from "../../utils/dateUtils";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningAlert,
  TechDayLoad,
  DisplayDensity,
  HoverDisplaySettings,
} from "../../types";

interface DayDispatchViewProps {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  alerts: PlanningAlert[];
  loads: Map<string, TechDayLoad>;
  selectedDate: Date;
  density: DisplayDensity;
  hoverSettings: HoverDisplaySettings;
  showUnavailable: boolean;
}


/** Check if a tech is unavailable for the whole day:
 *  - has absence/congé/repos blocks covering ≥6h, OR
 *  - has 0 appointments and 0 work blocks (not scheduled at all), OR
 *  - ALL appointments are on a "REPOS" client/project (convention HelpConfort)
 */
function isTechUnavailable(
  techId: number,
  blocks: PlanningBlock[],
  appointments: PlanningAppointment[],
  dk: string
): boolean {
  const techBlocks = blocks.filter(
    (b) => b.techId === techId && dateKey(b.start) === dk
  );
  const unavailBlocks = techBlocks.filter((b) => UNAVAILABLE_BLOCK_TYPES.includes(b.type));

  // Explicit absence ≥6h
  if (unavailBlocks.length > 0) {
    const totalMin = unavailBlocks.reduce((sum, b) => {
      return sum + (b.end.getTime() - b.start.getTime()) / 60_000;
    }, 0);
    if (totalMin >= 360) return true;
  }

  const techAppts = appointments.filter(
    (a) => a.technicianIds.includes(techId) && dateKey(a.start) === dk
  );

  // No appointments and no blocks at all
  if (techAppts.length === 0 && techBlocks.length === 0) return true;

  // All appointments are on "REPOS" client → tech is resting
  if (techAppts.length > 0) {
    const allRepos = techAppts.every((a) => {
      const clientUpper = (a.client || "").toUpperCase().trim();
      const refUpper = (a.projectRef || "").toUpperCase().trim();
      return clientUpper.includes("REPOS") || refUpper.includes("REPOS");
    });
    if (allRepos) return true;
  }

  return false;
}

/** Compute side-by-side column layout for overlapping appointments */
function computeOverlapLayout(appts: PlanningAppointment[]): Map<string, { colIndex: number; totalCols: number }> {
  const result = new Map<string, { colIndex: number; totalCols: number }>();
  if (appts.length === 0) return result;

  const sorted = [...appts].sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());

  // Build overlap groups (connected components)
  const groups: PlanningAppointment[][] = [];
  let currentGroup: PlanningAppointment[] = [sorted[0]];
  let groupEnd = sorted[0].end.getTime();

  for (let i = 1; i < sorted.length; i++) {
    const appt = sorted[i];
    if (appt.start.getTime() < groupEnd) {
      // Overlaps with current group
      currentGroup.push(appt);
      groupEnd = Math.max(groupEnd, appt.end.getTime());
    } else {
      groups.push(currentGroup);
      currentGroup = [appt];
      groupEnd = appt.end.getTime();
    }
  }
  groups.push(currentGroup);

  // For each group, assign column indices greedily
  for (const group of groups) {
    const columns: number[] = []; // end times per column
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

export function DayDispatchView({
  technicians,
  appointments,
  blocks,
  alerts,
  loads,
  selectedDate,
  density,
  hoverSettings,
  showUnavailable,
}: DayDispatchViewProps) {
  const dk = dateKey(selectedDate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedAppt, setSelectedAppt] = useState<PlanningAppointment | null>(null);

  // Filtrer les rendez-vous du jour
  const dayAppointments = useMemo(
    () => appointments.filter((a) => dateKey(a.start) === dk),
    [appointments, dk]
  );
  const dayBlocks = useMemo(
    () => blocks.filter((b) => dateKey(b.start) === dk),
    [blocks, dk]
  );

  // Identifier les techs indisponibles
  const unavailableTechIds = useMemo(() => {
    const ids = new Set<number>();
    for (const tech of technicians) {
      if (isTechUnavailable(tech.id, dayBlocks, dayAppointments, dk)) ids.add(tech.id);
    }
    return ids;
  }, [technicians, dayBlocks, dayAppointments, dk]);

  // Filtrer les techs visibles
  const visibleTechs = useMemo(() => {
    if (showUnavailable) return technicians;
    return technicians.filter((t) => !unavailableTechIds.has(t.id));
  }, [technicians, showUnavailable, unavailableTechIds]);

  const hiddenCount = technicians.length - visibleTechs.length;

  // Tech lookup map for partner info
  const techMap = useMemo(() => {
    const map = new Map<number, PlanningTechnician>();
    for (const t of technicians) map.set(t.id, t);
    return map;
  }, [technicians]);

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

  // Lunch break position
  const lunchTop = (LUNCH_START - HOUR_START) * HOUR_HEIGHT_PX;
  const lunchHeight = (LUNCH_END - LUNCH_START) * HOUR_HEIGHT_PX;

  return (
    <>
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
          {visibleTechs.map((tech) => {
            const techAppts = apptsByTech.get(tech.id) ?? [];
            const techBlocks = blocksByTech.get(tech.id) ?? [];
            const load = loads.get(`${tech.id}:${dk}`);
            const isUnavailable = unavailableTechIds.has(tech.id);

            // Collect all pictosInterv for this tech's appointments today
            const techZones = techAppts.flatMap(a => a.pictosInterv ?? []);

            return (
              <div
                key={tech.id}
                className={`shrink-0 border-r border-border ${isUnavailable ? "opacity-50" : ""}`}
                style={{ minWidth: TECH_COLUMN_MIN_WIDTH, width: TECH_COLUMN_MIN_WIDTH }}
              >
                {/* Sticky header */}
                <div className="sticky top-0 z-20 bg-card border-b border-border">
                  <TechContextMenu tech={tech}>
                    <div>
                      <TechColumnHeader tech={tech} load={load} density={density} isUnavailable={isUnavailable} zones={techZones} />
                    </div>
                  </TechContextMenu>
                    </div>
                  </TechContextMenu>
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

                  {/* Lunch break zone */}
                  <div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      top: lunchTop,
                      height: lunchHeight,
                      background: "repeating-linear-gradient(135deg, transparent, transparent 4px, hsl(var(--muted) / 0.5) 4px, hsl(var(--muted) / 0.5) 5px)",
                    }}
                  />

                  {/* Blocks — compact types get stacked as icons */}
                  {(() => {
                    const COMPACT_TYPES = ["tache", "rappel", "atelier", "formation"];
                    // Group compact blocks by start hour to compute stack index
                    const stackCounters = new Map<string, number>();
                    return techBlocks.map((block) => {
                      let stackIndex = 0;
                      if (COMPACT_TYPES.includes(block.type)) {
                        const hourKey = `${block.start.getHours()}:${block.start.getMinutes()}`;
                        stackIndex = stackCounters.get(hourKey) ?? 0;
                        stackCounters.set(hourKey, stackIndex + 1);
                      }
                      return (
                        <BlockCard
                          key={block.id}
                          block={block}
                          selectedDate={selectedDate}
                          stackIndex={stackIndex}
                          onViewDetails={(b) => {
                            // Open detail for the block - reuse the appointment detail or show toast
                            toast.info(`${b.label}`, {
                              description: `${b.type} — ${format(b.start, "HH:mm")} à ${format(b.end, "HH:mm")}`,
                            });
                          }}
                        />
                      );
                    });
                  })()}

                  {/* Appointments — side by side when overlapping */}
                  {(() => {
                    const layout = computeOverlapLayout(techAppts);
                    return techAppts.map((appt) => {
                      const info = layout.get(appt.id) ?? { colIndex: 0, totalCols: 1 };
                      const partners: PartnerTechInfo[] = appt.isBinome
                        ? appt.technicianIds
                            .filter((tid) => tid !== tech.id)
                            .map((tid) => {
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
                          density={density}
                          hasConflict={conflictIds.has(appt.id)}
                          selectedDate={selectedDate}
                          hoverSettings={hoverSettings}
                          onViewDetails={setSelectedAppt}
                          partnerTechs={partners}
                          colIndex={info.colIndex}
                          totalCols={info.totalCols}
                        />
                      );
                    });
                  })()}

                  {/* Current time line */}
                  <CurrentTimeLine selectedDate={selectedDate} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Drawer */}
      <DetailDrawer
        appointment={selectedAppt}
        technicians={technicians}
        open={!!selectedAppt}
        onClose={() => setSelectedAppt(null)}
      />
    </>
  );
}
