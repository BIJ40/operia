/**
 * Composant multi-select pour attribuer des techniciens à un SAV
 */

import { useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SAVTechnicien } from "./SAVDossierList";

interface TechnicienMultiSelectProps {
  techniciensAuto: SAVTechnicien[];
  techniciensOverride: number[] | null;
  allTechniciens: SAVTechnicien[];
  onSave: (technicienIds: number[] | null) => void;
  disabled?: boolean;
}

export function TechnicienMultiSelect({
  techniciensAuto,
  techniciensOverride,
  allTechniciens,
  onSave,
  disabled = false,
}: TechnicienMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(() => {
    if (techniciensOverride && techniciensOverride.length > 0) {
      return new Set(techniciensOverride);
    }
    return new Set(techniciensAuto.map((t) => t.id));
  });

  // Détermine si on a un override actif
  const hasOverride = techniciensOverride !== null && techniciensOverride.length > 0;

  // Affichage des techniciens actuels
  const displayTechs = hasOverride
    ? allTechniciens.filter((t) => techniciensOverride.includes(t.id))
    : techniciensAuto;

  const handleToggle = (techId: number) => {
    const newSelected = new Set(selected);
    if (newSelected.has(techId)) {
      newSelected.delete(techId);
    } else {
      newSelected.add(techId);
    }
    setSelected(newSelected);
  };

  const handleSave = () => {
    const selectedArray = Array.from(selected);
    
    // Si la sélection est identique aux auto-détectés, on peut reset l'override
    const autoIds = new Set(techniciensAuto.map((t) => t.id));
    const isSameAsAuto =
      selectedArray.length === autoIds.size &&
      selectedArray.every((id) => autoIds.has(id));

    if (isSameAsAuto) {
      onSave(null); // Reset to auto
    } else {
      onSave(selectedArray);
    }
    setOpen(false);
  };

  const handleReset = () => {
    setSelected(new Set(techniciensAuto.map((t) => t.id)));
    onSave(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-auto py-1 px-2 justify-start font-normal",
            hasOverride && "bg-amber-50 border border-amber-200"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-1 flex-wrap">
            {displayTechs.length === 0 ? (
              <span className="text-muted-foreground text-xs">Aucun</span>
            ) : displayTechs.length <= 2 ? (
              displayTechs.map((t) => (
                <Badge
                  key={t.id}
                  variant={hasOverride ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    hasOverride && "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  {t.name.split(" ")[0]}
                </Badge>
              ))
            ) : (
              <>
                <Badge
                  variant={hasOverride ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    hasOverride && "bg-amber-500 hover:bg-amber-600"
                  )}
                >
                  {displayTechs[0].name.split(" ")[0]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  +{displayTechs.length - 1}
                </Badge>
              </>
            )}
            <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Techniciens SAV</span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {allTechniciens.map((tech) => {
              const isSelected = selected.has(tech.id);
              const isAutoDetected = techniciensAuto.some((t) => t.id === tech.id);

              return (
                <div
                  key={tech.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted",
                    isSelected && "bg-muted"
                  )}
                  onClick={() => handleToggle(tech.id)}
                >
                  <Checkbox checked={isSelected} />
                  <span className="text-sm flex-1">{tech.name}</span>
                  {isAutoDetected && (
                    <Badge variant="outline" className="text-xs">
                      Auto
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            {hasOverride && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={handleReset}
              >
                Réinitialiser
              </Button>
            )}
            <Button
              size="sm"
              className="ml-auto text-xs"
              onClick={handleSave}
            >
              <Check className="h-3 w-3 mr-1" />
              Valider
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
