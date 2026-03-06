/**
 * Planning V2 — Dialog semaine type technicien
 * 7 lignes (Lun→Dim) avec toggle travaillé/repos + horaires par jour
 */

import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanningTechnician } from "../../types";
import {
  type TechDaySchedule,
  getDefaultWeekSchedule,
  getWorkingMinutesForDay,
} from "../../types/schedule";

interface TechSettingsDialogProps {
  tech: PlanningTechnician;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_LABELS: Record<number, string> = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function TechSettingsDialog({ tech, open, onOpenChange }: TechSettingsDialogProps) {
  const [schedule, setSchedule] = useState<TechDaySchedule[]>(getDefaultWeekSchedule());
  const [loading, setLoading] = useState(false);
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tech.apogeeId) return;

    async function load() {
      // Find collaborator
      const { data: collab } = await supabase
        .from("collaborators")
        .select("id")
        .eq("apogee_user_id", tech.apogeeId)
        .maybeSingle();

      if (!collab) {
        setCollaboratorId(null);
        setSchedule(getDefaultWeekSchedule());
        return;
      }

      setCollaboratorId(collab.id);

      // Load existing schedule
      const { data: rows } = await supabase
        .from("technician_weekly_schedule")
        .select("*")
        .eq("collaborator_id", collab.id);

      if (rows && rows.length > 0) {
        const defaultSched = getDefaultWeekSchedule();
        const merged = defaultSched.map((def) => {
          const row = rows.find((r: any) => r.day_of_week === def.dayOfWeek);
          if (row) {
            return {
              dayOfWeek: row.day_of_week as number,
              isWorking: row.is_working as boolean,
              workStart: (row.work_start as string) || def.workStart,
              workEnd: (row.work_end as string) || def.workEnd,
              lunchStart: (row.lunch_start as string) || def.lunchStart,
              lunchEnd: (row.lunch_end as string) || def.lunchEnd,
            };
          }
          return def;
        });
        setSchedule(merged);
      } else {
        setSchedule(getDefaultWeekSchedule());
      }
    }

    load();
  }, [open, tech.apogeeId]);

  const updateDay = (dayOfWeek: number, patch: Partial<TechDaySchedule>) => {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  };

  const handleSave = async () => {
    if (!collaboratorId) {
      toast.error("Collaborateur non trouvé pour ce technicien");
      return;
    }

    setLoading(true);
    try {
      // Upsert all 7 days
      const rows = schedule.map((d) => ({
        collaborator_id: collaboratorId,
        day_of_week: d.dayOfWeek,
        is_working: d.isWorking,
        work_start: d.workStart,
        work_end: d.workEnd,
        lunch_start: d.lunchStart,
        lunch_end: d.lunchEnd,
      }));

      // Delete existing + insert (simpler than upsert with composite key)
      await supabase
        .from("technician_weekly_schedule")
        .delete()
        .eq("collaborator_id", collaboratorId);

      const { error } = await supabase
        .from("technician_weekly_schedule")
        .insert(rows as any);

      if (error) throw error;

      toast.success("Semaine type enregistrée");
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ backgroundColor: tech.color }}
            >
              {tech.initials}
            </div>
            {tech.name} — Semaine type
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 py-2">
          {/* Compétences (lecture seule) */}
          <div className="mb-4">
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
                <span className="text-xs text-muted-foreground italic">
                  Aucun univers défini dans Apogée
                </span>
              )}
            </div>
          </div>

          {/* Grille semaine */}
          <div className="border border-border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[100px_60px_1fr] gap-0 bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground border-b border-border">
              <span>Jour</span>
              <span>Statut</span>
              <span className="text-center">Horaires</span>
            </div>

            {DAY_ORDER.map((dow) => {
              const day = schedule.find((d) => d.dayOfWeek === dow)!;
              return (
                <div
                  key={dow}
                  className={`grid grid-cols-[100px_60px_1fr] gap-0 items-center px-3 py-2 border-b border-border/50 last:border-0 transition-colors ${
                    !day.isWorking ? "bg-muted/30" : ""
                  }`}
                >
                  {/* Jour */}
                  <span className={`text-xs font-medium ${!day.isWorking ? "text-muted-foreground" : "text-foreground"}`}>
                    {DAY_LABELS[dow]}
                  </span>

                  {/* Toggle */}
                  <Switch
                    checked={day.isWorking}
                    onCheckedChange={(v) => updateDay(dow, { isWorking: v })}
                    className="h-4 w-7"
                  />

                  {/* Horaires */}
                  {day.isWorking ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Input
                        type="time"
                        value={day.workStart}
                        onChange={(e) => updateDay(dow, { workStart: e.target.value })}
                        className="h-7 w-[82px] text-xs px-1.5"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={day.workEnd}
                        onChange={(e) => updateDay(dow, { workEnd: e.target.value })}
                        className="h-7 w-[82px] text-xs px-1.5"
                      />
                      <span className="text-muted-foreground text-[10px] ml-1">pause</span>
                      <Input
                        type="time"
                        value={day.lunchStart}
                        onChange={(e) => updateDay(dow, { lunchStart: e.target.value })}
                        className="h-7 w-[72px] text-xs px-1.5"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={day.lunchEnd}
                        onChange={(e) => updateDay(dow, { lunchEnd: e.target.value })}
                        className="h-7 w-[72px] text-xs px-1.5"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic ml-2">Repos</span>
                  )}
                </div>
              );
            })}
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
