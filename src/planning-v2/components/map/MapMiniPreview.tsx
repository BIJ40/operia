/**
 * Planning V2 — Mini-card de prévisualisation d'un RDV sur la carte
 */

import { X, Clock, MapPin, Users, Tag } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TYPE_LABELS } from "../../constants";
import type { PlanningAppointment, PlanningTechnician } from "../../types";

interface MapMiniPreviewProps {
  appointment: PlanningAppointment | null;
  technicians: PlanningTechnician[];
  onClose: () => void;
}

export function MapMiniPreview({ appointment: a, technicians, onClose }: MapMiniPreviewProps) {
  if (!a) return null;

  const techMap = new Map(technicians.map((t) => [t.id, t]));
  const techs = a.technicianIds
    .map((id) => techMap.get(id))
    .filter(Boolean) as PlanningTechnician[];

  const startTime = format(a.start, "HH:mm", { locale: fr });
  const endTime = format(a.end, "HH:mm", { locale: fr });
  const typeLabel = TYPE_LABELS[a.type.toLowerCase()];

  return (
    <div className="absolute top-4 left-4 z-10 w-72 bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        {typeLabel ? (
          <Badge variant="secondary" className="text-xs">
            {typeLabel}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            {a.type}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Client */}
        <div className="text-sm font-medium text-foreground">{a.client}</div>

        {/* Ref dossier */}
        {a.projectRef && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tag className="h-3 w-3" />
            Réf. {a.projectRef}
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">
            {startTime} - {endTime}
          </span>
          <span className="text-muted-foreground">({a.durationMinutes} min)</span>
        </div>

        {/* Address */}
        {(a.address || a.city) && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="text-muted-foreground">
              {[a.address, a.postalCode, a.city].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        {/* Technicians */}
        {techs.length > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {techs.map((tech) => (
                <span
                  key={tech.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${tech.color}20`,
                    color: tech.color,
                    border: `1px solid ${tech.color}40`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tech.color }}
                  />
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Universe */}
        {a.universe && (
          <div className="text-xs text-muted-foreground">
            {a.universe}
          </div>
        )}
      </div>
    </div>
  );
}
