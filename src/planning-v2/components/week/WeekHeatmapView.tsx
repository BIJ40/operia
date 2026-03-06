/**
 * Planning V2 — Vue Semaine Heatmap
 * Grille techniciens (lignes) × jours Lun-Ven (colonnes)
 * Chaque cellule = charge en %, code couleur, nb RDV
 */

import { useMemo, useState } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeWeeklyHeatmap } from "../../services/computeLoad";
import { WEEK_DAYS } from "../../constants";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningAlert,
  WeekHeatmapCell,
  LoadStatus,
} from "../../types";

interface WeekHeatmapViewProps {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  alerts: PlanningAlert[];
  selectedDate: Date;
  showUnavailable: boolean;
  onDayClick?: (date: Date) => void;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Colors for load status
function getCellStyle(cell: WeekHeatmapCell): { bg: string; text: string; border: string } {
  if (cell.status === "absent") {
    return { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))", border: "hsl(var(--border))" };
  }
  if (cell.status === "overload") {
    return { bg: "hsl(0 72% 51% / 0.15)", text: "hsl(0 72% 40%)", border: "hsl(0 72% 51% / 0.3)" };
  }
  if (cell.status === "light") {
    return { bg: "hsl(142 71% 45% / 0.10)", text: "hsl(142 71% 30%)", border: "hsl(142 71% 45% / 0.2)" };
  }
  // normal
  return { bg: "hsl(221 83% 53% / 0.10)", text: "hsl(221 83% 40%)", border: "hsl(221 83% 53% / 0.2)" };
}

function getLoadBarColor(status: LoadStatus): string {
  if (status === "overload") return "hsl(0 72% 51%)";
  if (status === "light") return "hsl(142 71% 45%)";
  if (status === "absent") return "hsl(var(--muted-foreground))";
  return "hsl(221 83% 53%)";
}

function isTechAbsentAllWeek(
  techId: number,
  cells: WeekHeatmapCell[]
): boolean {
  const techCells = cells.filter(c => c.techId === techId);
  return techCells.length > 0 && techCells.every(c => c.status === "absent" || c.rdvCount === 0);
}

export function WeekHeatmapView({
  technicians,
  appointments,
  blocks,
  alerts,
  selectedDate,
  showUnavailable,
  onDayClick,
}: WeekHeatmapViewProps) {
  // Week = Mon-Fri
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = useMemo(() => {
    return Array.from({ length: WEEK_DAYS }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const weekDateKeys = useMemo(() => weekDays.map(dateKey), [weekDays]);

  // Compute heatmap
  const cells = useMemo(() => {
    const techIds = technicians.map(t => t.id);
    return computeWeeklyHeatmap(techIds, weekDateKeys, appointments, blocks, alerts);
  }, [technicians, weekDateKeys, appointments, blocks, alerts]);

  // Index cells
  const cellMap = useMemo(() => {
    const m = new Map<string, WeekHeatmapCell>();
    for (const c of cells) {
      m.set(`${c.techId}:${c.date}`, c);
    }
    return m;
  }, [cells]);

  // Filter techs
  const visibleTechs = useMemo(() => {
    if (showUnavailable) return technicians;
    return technicians.filter(t => {
      // Check if tech has any activity this week
      const techCells = cells.filter(c => c.techId === t.id);
      return techCells.some(c => c.rdvCount > 0 || c.status !== "absent");
    });
  }, [technicians, showUnavailable, cells]);

  // Compute weekly totals per tech
  const weeklyTotals = useMemo(() => {
    const m = new Map<number, { rdvCount: number; avgCharge: number }>();
    for (const tech of technicians) {
      const techCells = cells.filter(c => c.techId === tech.id && c.status !== "absent");
      const totalRdv = techCells.reduce((s, c) => s + c.rdvCount, 0);
      const avgCharge = techCells.length > 0
        ? Math.round(techCells.reduce((s, c) => s + c.load, 0) / techCells.length)
        : 0;
      m.set(tech.id, { rdvCount: totalRdv, avgCharge });
    }
    return m;
  }, [technicians, cells]);

  return (
    <div className="h-full overflow-auto p-4">
      <div className="min-w-[700px]">
        {/* Header row */}
        <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `180px repeat(${WEEK_DAYS}, 1fr) 80px` }}>
          <div className="text-xs font-medium text-muted-foreground px-2 py-2">
            Technicien
          </div>
          {weekDays.map((day) => (
            <button
              key={dateKey(day)}
              onClick={() => onDayClick?.(day)}
              className="text-center py-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="text-[10px] uppercase text-muted-foreground font-medium">
                {format(day, "EEE", { locale: fr })}
              </div>
              <div className="text-sm font-semibold text-foreground">
                {format(day, "d MMM", { locale: fr })}
              </div>
            </button>
          ))}
          <div className="text-center py-2">
            <div className="text-[10px] uppercase text-muted-foreground font-medium">Total</div>
            <div className="text-sm font-semibold text-foreground">Semaine</div>
          </div>
        </div>

        {/* Tech rows */}
        {visibleTechs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Aucun technicien actif cette semaine
          </div>
        ) : (
          visibleTechs.map((tech) => {
            const totals = weeklyTotals.get(tech.id);
            return (
              <div
                key={tech.id}
                className="grid gap-1 mb-1"
                style={{ gridTemplateColumns: `180px repeat(${WEEK_DAYS}, 1fr) 80px` }}
              >
                {/* Tech name */}
                <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-card border border-border">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: tech.color }}
                  >
                    {tech.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{tech.name}</div>
                    {tech.univers.length > 0 && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {tech.univers.slice(0, 2).join(", ")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const dk = dateKey(day);
                  const cell = cellMap.get(`${tech.id}:${dk}`);
                  if (!cell) {
                    return <div key={dk} className="rounded-md bg-muted/30 border border-border" />;
                  }

                  const style = getCellStyle(cell);
                  const barColor = getLoadBarColor(cell.status);

                  return (
                    <Tooltip key={dk}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onDayClick?.(day)}
                          className="rounded-md border p-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02] hover:shadow-sm cursor-pointer min-h-[64px]"
                          style={{
                            backgroundColor: style.bg,
                            borderColor: style.border,
                          }}
                        >
                          {cell.status === "absent" ? (
                            <span className="text-[10px] font-medium text-muted-foreground">Absent</span>
                          ) : (
                            <>
                              <span className="text-lg font-bold" style={{ color: style.text }}>
                                {cell.rdvCount}
                              </span>
                              <div className="w-full h-1.5 rounded-full bg-black/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, cell.load)}%`,
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-medium" style={{ color: style.text }}>
                                {cell.load}%
                              </span>
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">{tech.name} — {format(day, "EEEE d MMM", { locale: fr })}</p>
                          <p>{cell.rdvCount} RDV · Charge {cell.load}%</p>
                          {cell.travelMinutes > 0 && <p>Trajet : {cell.travelMinutes} min</p>}
                          {cell.alertsCount > 0 && (
                            <p className="text-destructive">{cell.alertsCount} alerte(s)</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}

                {/* Weekly total */}
                <div className="rounded-md border border-border bg-card p-2 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-sm font-bold text-foreground">
                    {totals?.rdvCount ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground">RDV</span>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    ~{totals?.avgCharge ?? 0}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}