/**
 * Planning V2 — Panneau paramètres d'affichage
 * Configurable: densité, granularité, éléments affichés au survol et sur les cartes
 */

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DisplayDensity, HoverDisplaySettings } from "../../types";

interface DisplaySettingsProps {
  density: DisplayDensity;
  onDensityChange: (d: DisplayDensity) => void;
  granularity: 15 | 30 | 60;
  onGranularityChange: (g: 15 | 30 | 60) => void;
  showBlocks: boolean;
  onShowBlocksChange: (v: boolean) => void;
  showUnconfirmed: boolean;
  onShowUnconfirmedChange: (v: boolean) => void;
  hoverSettings: HoverDisplaySettings;
  onHoverSettingsChange: (s: HoverDisplaySettings) => void;
}

const HOVER_FIELD_LABELS: Record<keyof HoverDisplaySettings, string> = {
  showClient: "Client",
  showCity: "Ville",
  showAddress: "Adresse complète",
  showType: "Type d'intervention",
  showUniverse: "Univers",
  showDuration: "Durée",
  showStatus: "Statut",
  showApporteur: "Apporteur",
  showProjectRef: "Réf. dossier",
  showNotes: "Notes",
  showTechnicians: "Technicien(s)",
  showPriority: "Priorité",
  showTime: "Horaires",
};

export function DisplaySettings({
  density,
  onDensityChange,
  granularity,
  onGranularityChange,
  showBlocks,
  onShowBlocksChange,
  showUnconfirmed,
  onShowUnconfirmedChange,
  hoverSettings,
  onHoverSettingsChange,
}: DisplaySettingsProps) {
  const toggleHoverField = (key: keyof HoverDisplaySettings) => {
    onHoverSettingsChange({ ...hoverSettings, [key]: !hoverSettings[key] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 max-h-[70vh] overflow-y-auto" align="end">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Paramètres d'affichage</h4>

          {/* Densité */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Densité des cartes</Label>
            <Select value={density} onValueChange={(v) => onDensityChange(v as DisplayDensity)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="detailed">Détaillé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Granularité */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Granularité grille</Label>
            <Select value={String(granularity)} onValueChange={(v) => onGranularityChange(Number(v) as 15 | 30 | 60)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">60 min</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Toggles généraux */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Afficher blocs (congés, pauses…)</Label>
              <Switch checked={showBlocks} onCheckedChange={onShowBlocksChange} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Afficher non confirmés</Label>
              <Switch checked={showUnconfirmed} onCheckedChange={onShowUnconfirmedChange} />
            </div>
          </div>

          <Separator />

          {/* Paramètres du survol */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Infos au survol</h4>
            {(Object.keys(HOVER_FIELD_LABELS) as (keyof HoverDisplaySettings)[]).map((key) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-xs">{HOVER_FIELD_LABELS[key]}</Label>
                <Switch
                  checked={hoverSettings[key]}
                  onCheckedChange={() => toggleHoverField(key)}
                />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
