/**
 * Planning V2 — Carte rendez-vous (3 densités) + tooltip + context menu
 * Coupe visuellement les RDV qui chevauchent la pause déjeuner (12h-13h)
 * Indicateur visuel binôme : bande diagonale couleur partenaire + pastilles
 */

import { AlertTriangle, Users } from "lucide-react";
import { HOUR_START, HOUR_HEIGHT_PX, LUNCH_START, LUNCH_END, TYPE_LABELS, TYPE_BADGE_COLORS } from "../../constants";
import type { PlanningAppointment, DisplayDensity, HoverDisplaySettings } from "../../types";
import { format } from "date-fns";
import { AppointmentHoverTooltip } from "./AppointmentHoverTooltip";
import { AppointmentContextMenu } from "./AppointmentContextMenu";

export interface PartnerTechInfo {
  id: number;
  initials: string;
  color: string;
  name: string;
}

export interface AppointmentCardProps {
  appointment: PlanningAppointment;
  techColor: string;
  density: DisplayDensity;
  hasConflict: boolean;
  selectedDate: Date;
  hoverSettings: HoverDisplaySettings;
  onViewDetails?: (a: PlanningAppointment) => void;
  /** Other techs assigned to this same appointment (binôme) */
  partnerTechs?: PartnerTechInfo[];
  /** Column index when overlapping (0-based) */
  colIndex?: number;
  /** Total columns in overlap group */
  totalCols?: number;
  /** Override hour height for week view */
  hourHeight?: number;
}

/** Compute visual segments, splitting around lunch break */
function computeSegments(a: PlanningAppointment): Array<{ topHour: number; bottomHour: number }> {
  const startH = a.start.getHours() + a.start.getMinutes() / 60;
  const endH = a.end.getHours() + a.end.getMinutes() / 60;

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
  partnerTechs = [],
  colIndex = 0,
  totalCols = 1,
  hourHeight = HOUR_HEIGHT_PX,
}: AppointmentCardProps) {
  const segments = computeSegments(a);
  const typeKey = a.type.toLowerCase();
  const typeLabel = TYPE_LABELS[typeKey];
  const typeBadge = TYPE_BADGE_COLORS[typeKey];
  const timeStr = format(a.start, "HH:mm");
  const isBinome = partnerTechs.length > 0;

  const renderSegment = (seg: { topHour: number; bottomHour: number }, index: number) => {
    const top = (seg.topHour - HOUR_START) * hourHeight;
    const height = Math.max((seg.bottomHour - seg.topHour) * hourHeight, 24);
    const isFirst = index === 0;

    // Build diagonal gradient for binôme
    const partnerColor = isBinome ? partnerTechs[0].color : null;

    // Side-by-side layout for overlapping appointments
    const colWidthPercent = 100 / totalCols;
    const leftPercent = colIndex * colWidthPercent;
    const gap = totalCols > 1 ? 2 : 4; // px gap

    return (
      <div
        key={index}
        className={`absolute overflow-hidden cursor-pointer
          transition-shadow hover:shadow-md hover:z-10
          ${hasConflict ? "ring-2 ring-destructive ring-offset-1" : ""}
          ${isFirst ? "rounded-t-md" : "rounded-b-md"}
          ${segments.length === 1 ? "rounded-md" : ""}
        `}
        style={{
          top,
          height,
          left: `calc(${leftPercent}% + ${gap}px)`,
          width: `calc(${colWidthPercent}% - ${gap * 2}px)`,
          borderLeft: `3px solid ${techColor}`,
          backgroundColor: isBinome && partnerColor
            ? undefined
            : `${techColor}50`,
          boxShadow: "0 1px 3px 0 hsl(var(--foreground) / 0.06)",
        }}
        onClick={() => onViewDetails?.(a)}
      >
        {/* Diagonal bi-color fill for binôme */}
        {isBinome && partnerColor && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${techColor}50 50%, ${partnerColor}50 50%)`,
            }}
          />
        )}

        <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden relative z-[1]">
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

              {/* City — always shown if space allows (including compact/week) */}
              {height > 32 && a.city && (
                <div className="text-[10px] font-medium text-foreground/70 truncate leading-tight mt-0.5">
                  {a.city}
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

          {!isFirst && (
            <div className="flex items-start gap-1 min-w-0">
              <span className="text-[10px] text-muted-foreground italic">suite — {a.client}</span>
            </div>
          )}
        </div>

        {/* Partner tech badges (top-right corner) — hidden in compact/week */}
        {isBinome && isFirst && density !== "compact" && (
          <div className="absolute top-1 right-1.5 flex items-center gap-0.5 z-[2]">
            {partnerTechs.map((pt) => (
              <div
                key={pt.id}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-sm border border-white/80"
                style={{ backgroundColor: pt.color }}
                title={pt.name}
              >
                {pt.initials}
              </div>
            ))}
            {a.technicianIds.length > 2 && (
              <span className="text-[8px] font-bold text-muted-foreground ml-0.5">
                +{a.technicianIds.length - 2}
              </span>
            )}
          </div>
        )}
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
