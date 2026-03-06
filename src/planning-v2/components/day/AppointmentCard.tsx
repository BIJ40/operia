/**
 * Planning V2 — Carte rendez-vous (3 densités)
 */

import { AlertTriangle, Users } from "lucide-react";
import { HOUR_START, HOUR_HEIGHT_PX, TYPE_LABELS, TYPE_BADGE_COLORS } from "../../constants";
import type { PlanningAppointment, DisplayDensity } from "../../types";
import { format } from "date-fns";

interface AppointmentCardProps {
  appointment: PlanningAppointment;
  techColor: string;
  density: DisplayDensity;
  hasConflict: boolean;
  selectedDate: Date;
}

export function AppointmentCard({
  appointment: a,
  techColor,
  density,
  hasConflict,
}: AppointmentCardProps) {
  // Position verticale basée sur l'heure
  const startHour = a.start.getHours() + a.start.getMinutes() / 60;
  const endHour = a.end.getHours() + a.end.getMinutes() / 60;
  const top = (startHour - HOUR_START) * HOUR_HEIGHT_PX;
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT_PX, 24);

  const typeKey = a.type.toLowerCase();
  const typeLabel = TYPE_LABELS[typeKey];
  const typeBadge = TYPE_BADGE_COLORS[typeKey];

  const timeStr = format(a.start, "HH:mm");

  return (
    <div
      className={`absolute left-1 right-1 rounded-md overflow-hidden cursor-pointer
        transition-shadow hover:shadow-md hover:z-10
        ${hasConflict ? "ring-2 ring-destructive ring-offset-1" : ""}
      `}
      style={{
        top,
        height,
        borderLeft: `3px solid ${techColor}`,
        backgroundColor: "hsl(var(--card))",
        boxShadow: "0 1px 3px 0 hsl(var(--foreground) / 0.06)",
      }}
    >
      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
        {/* Ligne 1: heure + client */}
        <div className="flex items-start gap-1 min-w-0">
          <span className="text-[10px] font-medium text-muted-foreground shrink-0">
            {timeStr}
          </span>
          <span className="text-xs font-semibold text-foreground truncate leading-tight">
            {a.client}
          </span>
        </div>

        {/* Densité standard et detailed */}
        {density !== "compact" && height > 36 && (
          <div className="mt-0.5 space-y-0.5 min-w-0">
            {a.city && (
              <div className="text-[10px] text-muted-foreground truncate">
                {a.city}
              </div>
            )}
          </div>
        )}

        {/* Badges (standard + detailed) */}
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
            {hasConflict && (
              <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
            )}
          </div>
        )}

        {/* Detailed: apporteur, durée, ref */}
        {density === "detailed" && height > 70 && (
          <div className="mt-0.5 space-y-0.5">
            {a.projectRef && (
              <div className="text-[9px] text-muted-foreground truncate">
                Réf. {a.projectRef}
              </div>
            )}
            <div className="text-[9px] text-muted-foreground">
              {a.durationMinutes} min
            </div>
            {a.universe && (
              <div className="text-[9px] text-muted-foreground truncate">
                {a.universe}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
