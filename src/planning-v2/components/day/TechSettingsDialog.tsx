/**
 * Planning V2 — Dialog paramétrage technicien (horaires, jours de travail)
 * Synchronisé avec la table collaborators via apogee_user_id
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanningTechnician } from "../../types";

interface TechSettingsDialogProps {
  tech: PlanningTechnician;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS_OF_WEEK = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export function TechSettingsDialog({ tech, open, onOpenChange }: TechSettingsDialogProps) {
  const [workStart, setWorkStart] = useState(tech.workStart || "07:00");
  const [workEnd, setWorkEnd] = useState(tech.workEnd || "18:00");
  const [lunchStart, setLunchStart] = useState(tech.lunchStart || "12:00");
  const [lunchEnd, setLunchEnd] = useState(tech.lunchEnd || "13:00");
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [loading, setLoading] = useState(false);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);

  // Charger les données depuis collaborators
  useEffect(() => {
    if (!open || !tech.apogeeId) return;

    async function loadSettings() {
      const { data } = await supabase
        .from("collaborators")
        .select("id, work_start, work_end, lunch_start, lunch_end, work_days")
        .eq("apogee_user_id", tech.apogeeId)
        .maybeSingle();

      if (data) {
        setCollaboratorId(data.id);
        setWorkStart((data as any).work_start || "07:00");
        setWorkEnd((data as any).work_end || "18:00");
        setLunchStart((data as any).lunch_start || "12:00");
        setLunchEnd((data as any).lunch_end || "13:00");
        setWorkDays((data as any).work_days || [1, 2, 3, 4, 5]);
      }
    }

    loadSettings();
  }, [open, tech.apogeeId]);

  const toggleDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    if (!collaboratorId) {
      toast.error("Collaborateur non trouvé pour ce technicien");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("collaborators")
        .update({
          work_start: workStart,
          work_end: workEnd,
          lunch_start: lunchStart,
          lunch_end: lunchEnd,
          work_days: workDays,
        } as any)
        .eq("id", collaboratorId);

      if (error) throw error;

      toast.success("Paramètres enregistrés");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: tech.color }}
            >
              {tech.initials}
            </div>
            {tech.name} — Paramètres
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Compétences (lecture seule) */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Compétences (Univers Apogée)
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {tech.univers.length > 0 ? (
                tech.univers.map((u) => (
                  <span
                    key={u}
                    className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                  >
                    {u}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Aucun univers défini dans Apogée</span>
              )}
            </div>
          </div>

          {/* Horaires de travail */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Horaires de travail
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Début</Label>
                <Input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px]">Fin</Label>
                <Input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Pause déjeuner */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Pause déjeuner
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px]">Début</Label>
                <Input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-[11px]">Fin</Label>
                <Input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Jours de travail */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Jours de travail
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <label
                  key={day.value}
                  className="flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Checkbox
                    checked={workDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                    className="h-3.5 w-3.5"
                  />
                  {day.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSave} disabled={loading}>
            {loading ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
