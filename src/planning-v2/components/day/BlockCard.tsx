/**
 * Planning V2 — Bloc (congé, pause, tâche, absence…)
 * 
 * Tâches/rappels : affichés comme icônes compactes (badge) avec tooltip au survol
 * Autres blocs (congé, absence, repos) : affichés en plein sur le créneau
 */

import { ClipboardList, Bell, Wrench, GraduationCap, Coffee } from "lucide-react";
import { HOUR_START, HOUR_HEIGHT_PX, BLOCK_COLORS, BLOCK_LABELS } from "../../constants";
import type { PlanningBlock } from "../../types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";

interface BlockCardProps {
  block: PlanningBlock;
  selectedDate: Date;
  /** Stack index for compact blocks at the same time (0-based) */
  stackIndex?: number;
  /** Override hour height for week view */
  hourHeight?: number;
  /** Force compact rendering */
  compact?: boolean;
  onViewDetails?: (block: PlanningBlock) => void;
}

const COMPACT_BLOCK_TYPES = ["tache", "rappel", "atelier", "formation"];

const BLOCK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tache: ClipboardList,
  rappel: Bell,
  atelier: Wrench,
  formation: GraduationCap,
  pause: Coffee,
};

export function BlockCard({ block, stackIndex = 0, hourHeight = HOUR_HEIGHT_PX, compact: forceCompact, onViewDetails }: BlockCardProps) {
  const hh = hourHeight;
  const startHour = block.start.getHours() + block.start.getMinutes() / 60;
  const endHour = block.end.getHours() + block.end.getMinutes() / 60;
  const top = (startHour - HOUR_START) * hh;
  const isCompact = forceCompact || COMPACT_BLOCK_TYPES.includes(block.type);

  const bgColor = block.color || BLOCK_COLORS[block.type] || "hsl(210 10% 94%)";
  const typeLabel = BLOCK_LABELS[block.type] || block.type;
  const timeStr = `${format(block.start, "HH:mm")} – ${format(block.end, "HH:mm")}`;

  // Compact: small icon badge
  if (isCompact) {
    const Icon = BLOCK_ICONS[block.type] || ClipboardList;
    const offsetX = stackIndex * 26; // stack horizontally

    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute cursor-pointer z-[20] hover:scale-110 transition-transform"
              style={{
                top: top + 2,
                right: 4 + offsetX,
              }}
              onClick={() => onViewDetails?.(block)}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm border border-border/60"
                style={{ backgroundColor: bgColor }}
              >
                <Icon className="h-3.5 w-3.5 text-foreground/70" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px]">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold">{typeLabel}</div>
              <div className="text-[11px] text-muted-foreground">{block.label}</div>
              <div className="text-[10px] text-muted-foreground">{timeStr}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full-size block (congé, absence, repos, pause)
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT_PX, 20);

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm overflow-hidden select-none"
      style={{
        top,
        height,
        backgroundColor: bgColor,
        opacity: 0.7,
        zIndex: 1,
      }}
    >
      <div className="px-1.5 py-0.5 h-full flex items-start">
        <span className="text-[10px] font-medium text-foreground/60 truncate">
          {block.label}
        </span>
      </div>
    </div>
  );
}
