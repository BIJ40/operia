/**
 * Planning V2 — Bloc (congé, pause, tâche, absence…)
 */

import { HOUR_START, HOUR_HEIGHT_PX, BLOCK_COLORS } from "../../constants";
import type { PlanningBlock } from "../../types";

interface BlockCardProps {
  block: PlanningBlock;
  selectedDate: Date;
}

export function BlockCard({ block }: BlockCardProps) {
  const startHour = block.start.getHours() + block.start.getMinutes() / 60;
  const endHour = block.end.getHours() + block.end.getMinutes() / 60;
  const top = (startHour - HOUR_START) * HOUR_HEIGHT_PX;
  const height = Math.max((endHour - startHour) * HOUR_HEIGHT_PX, 20);

  const bgColor = block.color || BLOCK_COLORS[block.type] || "hsl(210 10% 94%)";

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm overflow-hidden pointer-events-none select-none"
      style={{
        top,
        height,
        backgroundColor: bgColor,
        opacity: 0.6,
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
