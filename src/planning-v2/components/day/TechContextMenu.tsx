/**
 * Planning V2 — Menu contextuel clic droit sur un technicien
 * Permet de voir les compétences (univers Apogée) et configurer les horaires
 */

import { useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Wrench, Clock } from "lucide-react";
import type { PlanningTechnician } from "../../types";
import { TechSettingsDialog } from "./TechSettingsDialog";

interface TechContextMenuProps {
  tech: PlanningTechnician;
  children: React.ReactNode;
}

export function TechContextMenu({ tech, children }: TechContextMenuProps) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          {/* Compétences (univers) — lecture seule */}
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-1">
              <Wrench className="h-3.5 w-3.5" />
              Compétences (Univers)
            </div>
            {tech.univers.length > 0 ? (
              <div className="flex flex-wrap gap-1 pl-5">
                {tech.univers.map((u) => (
                  <span
                    key={u}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                  >
                    {u}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground pl-5">Aucun univers défini</span>
            )}
          </div>

          <ContextMenuItem
            className="text-xs gap-2"
            onClick={() => setShowSettings(true)}
          >
            <Clock className="h-3.5 w-3.5" />
            Paramétrer horaires & jours
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <TechSettingsDialog
        tech={tech}
        open={showSettings}
        onOpenChange={setShowSettings}
      />
    </>
  );
}
