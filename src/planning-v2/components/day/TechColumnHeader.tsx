/**
 * Planning V2 — Entête colonne technicien (sticky)
 */

import { User, Clock, AlertTriangle } from "lucide-react";
import type { PlanningTechnician, TechDayLoad, DisplayDensity } from "../../types";

interface TechColumnHeaderProps {
  tech: PlanningTechnician;
  load?: TechDayLoad;
  density: DisplayDensity;
  isUnavailable?: boolean;
}

export function TechColumnHeader({ tech, load, density, isUnavailable }: TechColumnHeaderProps) {
  const chargePercent = load?.chargePercent ?? 0;
  const rdvCount = load?.rdvCount ?? 0;
  const hasConflict = load?.hasConflict ?? false;
  const hasOverflow = load?.hasAmplitudeOverflow ?? false;

  // Couleur de la barre de charge
  let chargeColor = "bg-emerald-400";
  if (chargePercent >= 90) chargeColor = "bg-red-500";
  else if (chargePercent >= 70) chargeColor = "bg-amber-400";

  return (
    <div className="px-2 py-2 space-y-1.5">
      {/* Ligne 1 : avatar + nom */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 relative"
          style={{ backgroundColor: tech.color }}
        >
          {tech.initials}
          {isUnavailable && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-card" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground truncate leading-tight">
            {tech.name}
          </div>
          {density !== "compact" && tech.univers.length > 0 && (
            <div className="text-[10px] text-muted-foreground truncate leading-tight">
              {tech.univers.slice(0, 2).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Ligne 2 : stats jour */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5">
          <User className="h-3 w-3" />
          {rdvCount} RDV
        </span>
        {density !== "compact" && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {Math.round((load?.interventionMinutes ?? 0) / 60)}h
          </span>
        )}
        {(hasConflict || hasOverflow) && (
          <AlertTriangle className="h-3 w-3 text-destructive" />
        )}
      </div>

      {/* Barre de charge */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${chargeColor}`}
          style={{ width: `${Math.min(chargePercent, 100)}%` }}
        />
      </div>
    </div>
  );
}
