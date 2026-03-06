/**
 * Planning V2 — Carte rendez-vous (3 densités) + tooltip + context menu
 * Coupe visuellement les RDV qui chevauchent la pause déjeuner (12h-13h)
 */

import { AlertTriangle, Users } from "lucide-react";
import { HOUR_START, HOUR_HEIGHT_PX, LUNCH_START, LUNCH_END, TYPE_LABELS, TYPE_BADGE_COLORS } from "../../constants";
import type { PlanningAppointment, DisplayDensity, HoverDisplaySettings } from "../../types";
import { format } from "date-fns";
import { AppointmentHoverTooltip } from "./AppointmentHoverTooltip";
import { AppointmentContextMenu } from "./AppointmentContextMenu";

interface AppointmentCardProps {
  appointment: PlanningAppointment;
  techColor: string;
  density: DisplayDensity;
  hasConflict: boolean;
  selectedDate: Date;
  hoverSettings: HoverDisplaySettings;
  onViewDetails?: (a: PlanningAppointment) => void;
}

/** Compute visual segments, splitting around lunch break */
function computeSegments(a: PlanningAppointment): Array<{ topHour: number; bottomHour: number }> {
  const startH = a.start.getHours() + a.start.getMinutes() / 60;
  const endH = a.end.getHours() + a.end.getMinutes() / 60;

  // If the appointment spans across lunch, split it
  if (startH < LUNCH_START && endH > LUNCH_END) {
    return [
      { topHour: startH, bottomHour: LUNCH_START },
      { topHour: LUNCH_END, bottomHour: endH },
    ];
  }
  return [{ topHour: startH, bottomHour: endH }];
}

export function AppointmentCard({
  appointment: a,
  techColor,
  density,
  hasConflict,
  hoverSettings,
  onViewDetails,
}: AppointmentCardProps) {
  const segments = computeSegments(a);
  const typeKey = a.type.toLowerCase();
  const typeLabel = TYPE_LABELS[typeKey];
  const typeBadge = TYPE_BADGE_COLORS[typeKey];
  const timeStr = format(a.start, "HH:mm");

  const renderSegment = (seg: { topHour: number; bottomHour: number }, index: number) => {
    const top = (seg.topHour - HOUR_START) * HOUR_HEIGHT_PX;
    const height = Math.max((seg.bottomHour - seg.topHour) * HOUR_HEIGHT_PX, 24);
    const isFirst = index === 0;

    return (
      <div
        key={index}
        className={`absolute left-1 right-1 overflow-hidden cursor-pointer
          transition-shadow hover:shadow-md hover:z-10
          ${hasConflict ? "ring-2 ring-destructive ring-offset-1" : ""}
          ${isFirst ? "rounded-t-md" : "rounded-b-md"}
          ${segments.length === 1 ? "rounded-md" : ""}
        `}
        style={{
          top,
          height,
          borderLeft: `3px solid ${techColor}`,
          backgroundColor: "hsl(var(--card))",
          boxShadow: "0 1px 3px 0 hsl(var(--foreground) / 0.06)",
        }}
        onClick={() => onViewDetails?.(a)}
      >
        <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
          {/* Only show content on first segment (or single) */}
          {isFirst && (
            <>
              <div className="flex items-start gap-1 min-w-0">
                <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                  {timeStr}
                </span>
                <span className="text-xs font-semibold text-foreground truncate leading-tight">
                  {a.client}
                </span>
              </div>

              {density !== "compact" && height > 36 && a.city && (
                <div className="mt-0.5">
                  <div className="text-[10px] text-muted-foreground truncate">{a.city}</div>
                </div>
              )}

              {density !== "compact" && height > 50 && (
                <div className="mt-auto pt-0.5 flex items-center gap-1 flex-wrap">
                  {typeLabel && typeBadge && (
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                      style={{ backgroundColor: typeBadge.bg, color: typeBadge.text }}
                    >
                      {typeLabel}
                    </span>
                  )}
                  {a.isBinome && (
                    <span className="text-[9px] flex items-center gap-0.5 text-muted-foreground">
                      <Users className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {hasConflict && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                </div>
              )}

              {density === "detailed" && height > 70 && (
                <div className="mt-0.5 space-y-0.5">
                  {a.projectRef && (
                    <div className="text-[9px] text-muted-foreground truncate">Réf. {a.projectRef}</div>
                  )}
                  <div className="text-[9px] text-muted-foreground">{a.durationMinutes} min</div>
                  {a.universe && (
                    <div className="text-[9px] text-muted-foreground truncate">{a.universe}</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Second segment: show "suite" label */}
          {!isFirst && (
            <div className="flex items-start gap-1 min-w-0">
              <span className="text-[10px] text-muted-foreground italic">suite — {a.client}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const cardContent = <>{segments.map((seg, i) => renderSegment(seg, i))}</>;

  return (
    <AppointmentContextMenu appointment={a} onViewDetails={onViewDetails}>
      <AppointmentHoverTooltip appointment={a} settings={hoverSettings}>
        {cardContent}
      </AppointmentHoverTooltip>
    </AppointmentContextMenu>
  );
}
