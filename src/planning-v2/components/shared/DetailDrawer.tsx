/**
 * Planning V2 — Panneau latéral de détail d'un rendez-vous
 */

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, User, Building2, FileText, AlertTriangle, Users, Info, Tag, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TYPE_LABELS, TYPE_BADGE_COLORS } from "../../constants";
import { stateLabel } from "@/shared/utils/stateLabels";
import type { PlanningAppointment, PlanningTechnician } from "../../types";

interface DetailDrawerProps {
  appointment: PlanningAppointment | null;
  technicians: PlanningTechnician[];
  open: boolean;
  onClose: () => void;
}

export function DetailDrawer({ appointment: a, technicians, open, onClose }: DetailDrawerProps) {
  if (!a) return null;

  const typeLabel = TYPE_LABELS[a.type.toLowerCase()] ?? a.type;
  const typeBadge = TYPE_BADGE_COLORS[a.type.toLowerCase()];
  const assignedTechs = technicians.filter((t) => a.technicianIds.includes(t.id));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-base font-semibold">{a.client}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Horaires */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {format(a.start, "EEEE d MMMM yyyy", { locale: fr })}
              {" · "}
              {format(a.start, "HH:mm")} – {format(a.end, "HH:mm")}
              {" · "}
              {a.durationMinutes} min
            </span>
          </div>

          {/* Adresse */}
          {(a.address || a.city) && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                {a.address && <div>{a.address}</div>}
                {(a.postalCode || a.city) && (
                  <div>{[a.postalCode, a.city].filter(Boolean).join(" ")}</div>
                )}
              </div>
            </div>
          )}

          {/* Type + univers + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {typeBadge && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: typeBadge.bg, color: typeBadge.text }}
              >
                {typeLabel}
              </span>
            )}
            {a.universe && (
              <Badge variant="outline" className="text-xs">{a.universe}</Badge>
            )}
            {a.isBinome && (
              <Badge variant="outline" className="text-xs gap-1">
                <Users className="h-3 w-3" /> Binôme
              </Badge>
            )}
            <Badge
              variant={a.priority === "urgent" ? "destructive" : "outline"}
              className="text-xs capitalize"
            >
              {a.priority}
            </Badge>
          </div>

          {/* Pictos / zones */}
          {a.pictosInterv.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {a.pictosInterv.map((p, i) => (
                <Badge key={i} variant="outline" className="text-[10px] capitalize">
                  {p}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          {/* Techniciens */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Technicien(s)
            </div>
            {assignedTechs.length > 0 ? (
              assignedTechs.map((t) => (
                <div key={t.id} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.initials}
                  </div>
                  <span className="text-sm">{t.name}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">Non affecté</span>
            )}
          </div>

          {/* Apporteur */}
          {a.apporteur && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Apporteur
              </div>
              <span className="text-sm">{a.apporteur}</span>
            </div>
          )}

          {/* Réf dossier */}
          {a.projectRef && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" /> Référence dossier
              </div>
              <span className="text-sm font-mono">{a.projectRef}</span>
            </div>
          )}

          {/* Dossier ID */}
          {a.dossierId && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <FolderOpen className="h-3.5 w-3.5" /> N° dossier Apogée
              </div>
              <span className="text-sm font-mono">{a.dossierId}</span>
            </div>
          )}

          {/* Description / label intervention */}
          {(a.description || a.interventionLabel) && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Description
                </div>
                {a.interventionLabel && (
                  <p className="text-sm text-foreground">{a.interventionLabel}</p>
                )}
                {a.description && a.description !== a.interventionLabel && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {a.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">Notes</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{a.notes}</p>
              </div>
            </>
          )}

          {/* Statut */}
          <Separator />
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Statut :</span>
            <Badge variant="outline" className="capitalize">{stateLabel(a.status)}</Badge>
            {a.projectState && a.projectState !== a.status && (
              <Badge variant="outline" className="capitalize text-muted-foreground">
                Dossier: {stateLabel(a.projectState)}
              </Badge>
            )}
            {!a.confirmed && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                <AlertTriangle className="h-3 w-3" /> Non confirmé
              </Badge>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
