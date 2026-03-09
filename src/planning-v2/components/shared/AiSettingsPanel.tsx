/**
 * Planning V2 — Panneau paramètres IA (poids de scoring + contraintes dures)
 */
import { useState, useEffect } from "react";
import { BrainCircuit, Save, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import type { ScoringWeights, HardConstraints } from "../../hooks/useAiPlanning";
import { DEFAULT_WEIGHTS, DEFAULT_HARD_CONSTRAINTS } from "../../hooks/useAiPlanning";

interface AiSettingsPanelProps {
  open: boolean;
  onClose: () => void;
  currentWeights: ScoringWeights | null;
  currentConstraints: HardConstraints | null;
  onSave: (weights: ScoringWeights, constraints: HardConstraints) => Promise<void>;
  isLoading: boolean;
}

const WEIGHT_LABELS: Record<keyof ScoringWeights, { label: string; description: string; color: string }> = {
  coherence: { label: "Cohérence univers", description: "Favorise les techniciens spécialisés dans l'univers du dossier", color: "bg-blue-500" },
  equity: { label: "Équité charge", description: "Répartit équitablement la charge entre les techniciens", color: "bg-emerald-500" },
  continuity: { label: "Continuité client", description: "Privilégie le technicien habituel du client", color: "bg-amber-500" },
  route: { label: "Optimisation trajet", description: "Minimise les temps de déplacement", color: "bg-violet-500" },
  gap: { label: "Remplissage trous", description: "Comble les créneaux vides entre les RDV", color: "bg-rose-500" },
  proximity: { label: "Proximité géo", description: "Favorise les techniciens proches du lieu d'intervention", color: "bg-cyan-500" },
};

export function AiSettingsPanel({
  open,
  onClose,
  currentWeights,
  currentConstraints,
  onSave,
  isLoading,
}: AiSettingsPanelProps) {
  const [weights, setWeights] = useState<ScoringWeights>(currentWeights || DEFAULT_WEIGHTS);
  const [constraints, setConstraints] = useState<HardConstraints>(currentConstraints || DEFAULT_HARD_CONSTRAINTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentWeights) setWeights(currentWeights);
    if (currentConstraints) setConstraints(currentConstraints);
  }, [currentWeights, currentConstraints]);

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(weights, constraints);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    setConstraints(DEFAULT_HARD_CONSTRAINTS);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BrainCircuit className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DrawerTitle className="text-base">Paramètres IA</DrawerTitle>
              <DrawerDescription className="text-xs">
                Configurez les critères de scoring et les contraintes
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-5 overflow-y-auto">
          {/* Weights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">Poids de scoring</h4>
              <span className={`text-[10px] font-medium ${totalWeight === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                Total : {totalWeight}%
              </span>
            </div>

            {/* Visual bar */}
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map((key) => (
                <div
                  key={key}
                  className={`h-full transition-all ${WEIGHT_LABELS[key].color}`}
                  style={{ width: `${(weights[key] / Math.max(totalWeight, 1)) * 100}%` }}
                />
              ))}
            </div>

            {/* Sliders */}
            {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map((key) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${WEIGHT_LABELS[key].color}`} />
                    <Label className="text-xs font-medium">{WEIGHT_LABELS[key].label}</Label>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{weights[key]}%</span>
                </div>
                <Slider
                  value={[weights[key]]}
                  onValueChange={([v]) => setWeights((prev) => ({ ...prev, [key]: v }))}
                  max={50}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <p className="text-[9px] text-muted-foreground">{WEIGHT_LABELS[key].description}</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Hard constraints */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Contraintes dures</h4>

            <div className="space-y-1.5">
              <Label className="text-xs">Niveau compétence minimum</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[constraints.min_skill_level]}
                  onValueChange={([v]) => setConstraints((prev) => ({ ...prev, min_skill_level: v }))}
                  max={5}
                  min={1}
                  step={1}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-6 text-right">{constraints.min_skill_level}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Le technicien doit avoir au moins ce niveau dans l'univers du dossier
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Buffer entre RDV (min)</Label>
              <Input
                type="number"
                value={constraints.buffer_minutes}
                onChange={(e) => setConstraints((prev) => ({ ...prev, buffer_minutes: Number(e.target.value) }))}
                min={0}
                max={60}
                className="h-8 text-xs w-24"
              />
              <p className="text-[9px] text-muted-foreground">
                Temps minimum entre deux rendez-vous (déplacement inclus)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Charge max journalière (%)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[constraints.max_daily_charge]}
                  onValueChange={([v]) => setConstraints((prev) => ({ ...prev, max_daily_charge: v }))}
                  max={100}
                  min={50}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">{constraints.max_daily_charge}%</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Pourcentage maximum de la journée occupée par des RDV
              </p>
            </div>
          </div>
        </div>

        <DrawerFooter className="flex-row gap-2 pt-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <Button size="sm" className="gap-1 flex-1" onClick={handleSave} disabled={saving || isLoading}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Sauvegarder
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
