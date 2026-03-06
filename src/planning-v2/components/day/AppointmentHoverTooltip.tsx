/**
 * Planning V2 — Tooltip au survol d'un rendez-vous
 * Affiche les champs configurés via HoverDisplaySettings
 */

import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlanningAppointment, HoverDisplaySettings } from "../../types";
import { TYPE_LABELS } from "../../constants";

interface AppointmentHoverTooltipProps {
  appointment: PlanningAppointment;
  settings: HoverDisplaySettings;
  children: React.ReactNode;
}

export function AppointmentHoverTooltip({
  appointment: a,
  settings: s,
  children,
}: AppointmentHoverTooltipProps) {
  const lines: { label: string; value: string }[] = [];

  if (s.showClient) lines.push({ label: "Client", value: a.client });
  if (s.showTime) lines.push({ label: "Horaires", value: `${format(a.start, "HH:mm")} – ${format(a.end, "HH:mm")}` });
  if (s.showDuration) lines.push({ label: "Durée", value: `${a.durationMinutes} min` });
  if (s.showCity && a.city) lines.push({ label: "Ville", value: a.city });
  if (s.showAddress && a.address) lines.push({ label: "Adresse", value: a.address });
  if (s.showType) lines.push({ label: "Type", value: TYPE_LABELS[a.type.toLowerCase()] ?? a.type });
  if (s.showUniverse && a.universe) lines.push({ label: "Univers", value: a.universe });
  if (s.showStatus) lines.push({ label: "Statut", value: a.status });
  if (s.showPriority) lines.push({ label: "Priorité", value: a.priority });
  if (s.showApporteur && a.apporteur) lines.push({ label: "Apporteur", value: a.apporteur });
  if (s.showProjectRef && a.projectRef) lines.push({ label: "Réf.", value: a.projectRef });
  if (s.showNotes && a.notes) lines.push({ label: "Notes", value: a.notes.substring(0, 120) + (a.notes.length > 120 ? "…" : "") });

  if (lines.length === 0) return <>{children}</>;

  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-[280px] p-2" sideOffset={8}>
        <div className="space-y-1">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-1.5 text-xs">
              <span className="text-muted-foreground shrink-0">{l.label}:</span>
              <span className="text-foreground font-medium truncate">{l.value}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
