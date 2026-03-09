/**
 * Planning V2 — Grille visuelle mini-planning pour les suggestions IA
 * Affiche le planning réel des techs qualifiés + créneaux suggérés clignotants
 */

import { useMemo, useState } from "react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HOUR_START, HOUR_END, LUNCH_START, LUNCH_END } from "../../constants";
import type { PlanningTechnician, PlanningAppointment, PlanningBlock } from "../../types";
import type { Suggestion } from "@/hooks/usePlanningAugmente";

// ─── Constants ──────────────────────────────────────────────────────────────
const MINI_HOUR_HEIGHT = 40; // px per hour (compact)
const MINI_COL_WIDTH = 140; // px per tech column
const MINI_TIME_AXIS = 40; // px
const TOTAL_HOURS = HOUR_END - HOUR_START;
const GRID_HEIGHT = TOTAL_HOURS * MINI_HOUR_HEIGHT;

type SuggestGridView = "day" | "week";

interface SuggestPlanningGridProps {
  suggestions: Suggestion[];
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  onApply: (s: Suggestion) => void;
  isApplying: boolean;
  /** Currently selected suggestion for highlight (rank) */
  selectedRank?: number | null;
  onSelectSuggestion?: (s: Suggestion) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseSlotDate(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

function timeToHour(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h + (m || 0) / 60;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SuggestPlanningGrid({
  suggestions,
  technicians,
  appointments,
  blocks,
  onApply,
  isApplying,
  selectedRank,
  onSelectSuggestion,
}: SuggestPlanningGridProps) {
  const [view, setView] = useState<SuggestGridView>("day");

  // Collect unique tech IDs from suggestions
  const suggestedTechIds = useMemo(
    () => [...new Set(suggestions.map((s) => s.tech_id))],
    [suggestions]
  );

  // Get the relevant techs (only those in suggestions)
  const relevantTechs = useMemo(
    () => technicians.filter((t) => suggestedTechIds.includes(t.id)),
    [technicians, suggestedTechIds]
  );

  // Determine date range from suggestions
  const { dates, firstDate } = useMemo(() => {
    if (suggestions.length === 0) return { dates: [], firstDate: new Date() };
    const allDates = suggestions.map((s) => s.date).sort();
    const first = parseSlotDate(allDates[0]);

    if (view === "day") {
      // Show the day of the first suggestion
      return { dates: [allDates[0]], firstDate: first };
    }

    // Week view: Mon-Fri of the first suggestion's week
    const weekStart = startOfWeek(first, { weekStartsOn: 1 });
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      weekDates.push(dateKey(addDays(weekStart, i)));
    }
    return { dates: weekDates, firstDate: first };
  }, [suggestions, view]);

  if (relevantTechs.length === 0 || suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
          <Button
            variant={view === "day" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2.5"
            onClick={() => setView("day")}
          >
            Jour
          </Button>
          <Button
            variant={view === "week" ? "default" : "ghost"}
            size="sm"
            className="h-6 text-[10px] px-2.5"
            onClick={() => setView("week")}
          >
            Semaine
          </Button>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {view === "day"
            ? format(firstDate, "EEEE d MMMM", { locale: fr })
            : `Semaine du ${format(startOfWeek(firstDate, { weekStartsOn: 1 }), "d MMM", { locale: fr })}`}
        </span>
      </div>

      {/* Grid */}
      <ScrollArea className="border border-border rounded-lg bg-card" style={{ maxHeight: 420 }}>
        <div className="inline-flex min-w-full">
          {/* Time axis */}
          <div className="sticky left-0 z-10 bg-card border-r border-border shrink-0" style={{ width: MINI_TIME_AXIS }}>
            <div className="h-7 border-b border-border" />
            <div className="relative" style={{ height: GRID_HEIGHT }}>
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute w-full flex items-start justify-center"
                  style={{ top: i * MINI_HOUR_HEIGHT, height: MINI_HOUR_HEIGHT }}
                >
                  <span className="text-[8px] font-medium text-muted-foreground mt-[-4px] select-none">
                    {String(HOUR_START + i).padStart(2, "0")}h
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Columns: per tech (day view) or per tech×day (week view) */}
          {view === "day" ? (
            // Day view: one column per tech
            relevantTechs.map((tech) => (
              <TechDayColumn
                key={tech.id}
                tech={tech}
                dateStr={dates[0]}
                appointments={appointments}
                blocks={blocks}
                suggestions={suggestions.filter((s) => s.tech_id === tech.id && s.date === dates[0])}
                onApply={onApply}
                isApplying={isApplying}
                selectedRank={selectedRank}
                onSelectSuggestion={onSelectSuggestion}
              />
            ))
          ) : (
            // Week view: one column per day, with rows showing all techs
            dates.map((dateStr) => {
              const daySuggestions = suggestions.filter((s) => s.date === dateStr);
              const dayTechIds = [...new Set(daySuggestions.map((s) => s.tech_id))];
              const dayTechs = relevantTechs.filter((t) => dayTechIds.includes(t.id));
              const hasAnySuggestion = daySuggestions.length > 0;

              return (
                <div key={dateStr} className={`shrink-0 border-r border-border ${!hasAnySuggestion ? "opacity-40" : ""}`}>
                  {/* Day header */}
                  <div className="h-7 border-b border-border flex items-center justify-center px-1 bg-muted/30">
                    <span className="text-[9px] font-medium text-foreground capitalize">
                      {format(parseSlotDate(dateStr), "EEE d", { locale: fr })}
                    </span>
                    {daySuggestions.length > 0 && (
                      <Badge variant="default" className="text-[7px] px-1 py-0 h-3 ml-1">
                        {daySuggestions.length}
                      </Badge>
                    )}
                  </div>
                  {/* Stacked tech sub-columns */}
                  <div className="flex">
                    {(dayTechs.length > 0 ? dayTechs : relevantTechs.slice(0, 1)).map((tech) => (
                      <TechDayColumn
                        key={`${tech.id}-${dateStr}`}
                        tech={tech}
                        dateStr={dateStr}
                        appointments={appointments}
                        blocks={blocks}
                        suggestions={daySuggestions.filter((s) => s.tech_id === tech.id)}
                        onApply={onApply}
                        isApplying={isApplying}
                        selectedRank={selectedRank}
                        onSelectSuggestion={onSelectSuggestion}
                        compact
                      />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Tech Day Column ────────────────────────────────────────────────────────

function TechDayColumn({
  tech,
  dateStr,
  appointments,
  blocks,
  suggestions,
  onApply,
  isApplying,
  selectedRank,
  onSelectSuggestion,
  compact = false,
}: {
  tech: PlanningTechnician;
  dateStr: string;
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  suggestions: Suggestion[];
  onApply: (s: Suggestion) => void;
  isApplying: boolean;
  selectedRank?: number | null;
  onSelectSuggestion?: (s: Suggestion) => void;
  compact?: boolean;
}) {
  const colWidth = compact ? 100 : MINI_COL_WIDTH;

  // Filter appointments for this tech on this date
  const dayAppts = useMemo(
    () =>
      appointments.filter(
        (a) => a.technicianIds.includes(tech.id) && dateKey(a.start) === dateStr
      ),
    [appointments, tech.id, dateStr]
  );

  const dayBlocks = useMemo(
    () =>
      blocks.filter(
        (b) => b.techId === tech.id && dateKey(b.start) === dateStr
      ),
    [blocks, tech.id, dateStr]
  );

  const lunchTop = (LUNCH_START - HOUR_START) * MINI_HOUR_HEIGHT;
  const lunchHeight = (LUNCH_END - LUNCH_START) * MINI_HOUR_HEIGHT;

  return (
    <div className="shrink-0 border-r border-border/50" style={{ width: colWidth }}>
      {/* Header */}
      {!compact && (
        <div className="h-7 border-b border-border flex items-center gap-1 px-1.5 bg-muted/30">
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white shrink-0"
            style={{ backgroundColor: tech.color }}
          >
            {tech.initials}
          </div>
          <span className="text-[9px] font-medium text-foreground truncate">{tech.name.split(" ")[0]}</span>
        </div>
      )}
      {compact && (
        <div className="h-0" /> /* No extra header in compact/week mode, day header is above */
      )}

      {/* Grid body */}
      <div className="relative" style={{ height: GRID_HEIGHT }}>
        {/* Hour grid lines */}
        {Array.from({ length: TOTAL_HOURS }, (_, i) => (
          <div
            key={i}
            className="absolute w-full border-b border-border/20"
            style={{ top: (i + 1) * MINI_HOUR_HEIGHT - 1, height: 1 }}
          />
        ))}

        {/* Lunch zone */}
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: lunchTop,
            height: lunchHeight,
            background: "repeating-linear-gradient(135deg, transparent, transparent 3px, hsl(var(--muted) / 0.4) 3px, hsl(var(--muted) / 0.4) 4px)",
          }}
        />

        {/* Existing blocks (absences, etc.) */}
        {dayBlocks.map((block) => {
          const startH = block.start.getHours() + block.start.getMinutes() / 60;
          const endH = block.end.getHours() + block.end.getMinutes() / 60;
          const top = (startH - HOUR_START) * MINI_HOUR_HEIGHT;
          const height = Math.max((endH - startH) * MINI_HOUR_HEIGHT, 4);
          return (
            <div
              key={block.id}
              className="absolute left-0.5 right-0.5 rounded-sm bg-muted/60 border border-border/30"
              style={{ top, height }}
              title={block.label}
            >
              <span className="text-[7px] text-muted-foreground px-0.5 truncate block">{block.label}</span>
            </div>
          );
        })}

        {/* Existing appointments */}
        {dayAppts.map((appt) => {
          const startH = appt.start.getHours() + appt.start.getMinutes() / 60;
          const endH = appt.end.getHours() + appt.end.getMinutes() / 60;
          const top = (startH - HOUR_START) * MINI_HOUR_HEIGHT;
          const height = Math.max((endH - startH) * MINI_HOUR_HEIGHT, 8);
          return (
            <div
              key={appt.id}
              className="absolute left-0.5 right-0.5 rounded-sm border overflow-hidden"
              style={{
                top,
                height,
                backgroundColor: `${tech.color}20`,
                borderColor: `${tech.color}50`,
              }}
              title={`${appt.client} ${format(appt.start, "HH:mm")}-${format(appt.end, "HH:mm")}`}
            >
              <div className="px-0.5 py-px">
                <div className="text-[7px] font-medium text-foreground truncate leading-tight">
                  {appt.client}
                </div>
                {height > 16 && (
                  <div className="text-[6px] text-muted-foreground">
                    {format(appt.start, "HH:mm")}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ★ SUGGESTED SLOTS — blinking! */}
        {suggestions.map((s) => {
          const startH = timeToHour(s.hour);
          const endH = startH + s.duration / 60;
          const top = (startH - HOUR_START) * MINI_HOUR_HEIGHT;
          const height = Math.max((endH - startH) * MINI_HOUR_HEIGHT, 12);
          const isSelected = selectedRank === s.rank;

          return (
            <div
              key={`suggest-${s.rank}`}
              className={`absolute left-0.5 right-0.5 rounded-sm border-2 border-dashed cursor-pointer transition-all
                ${isSelected
                  ? "border-primary bg-primary/20 z-20 shadow-md"
                  : "border-primary/60 bg-primary/10 hover:bg-primary/20 z-10"
                }
                animate-[pulse_1.5s_ease-in-out_infinite]`}
              style={{ top, height }}
              onClick={() => onSelectSuggestion?.(s)}
              title={`Suggestion #${s.rank} — ${s.hour} (${s.duration}min) — Score ${s.score}%`}
            >
              <div className="px-1 py-0.5 flex items-center justify-between h-full">
                <div className="min-w-0">
                  <div className="text-[8px] font-bold text-primary truncate">
                    #{s.rank} · {s.hour}
                  </div>
                  {height > 20 && (
                    <div className="text-[7px] text-primary/70">
                      {s.duration}min · {s.score}%
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Button
                    size="sm"
                    className="h-5 text-[8px] px-1.5 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onApply(s);
                    }}
                    disabled={isApplying}
                  >
                    {isApplying ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
