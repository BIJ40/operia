/**
 * Planning V2 — Indicateur de zone (pictos) par technicien
 * Affiche une roue colorée (donut) selon les zones d'intervention
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getZoneColor } from "@/shared/utils/zoneMapping";

interface ZoneIndicatorProps {
  zones: string[];
  /** Size of the wheel in px (default 28) */
  size?: number;
  /** If true, render as a clickable button */
  onClick?: () => void;
  /** Visual selected state */
  selected?: boolean;
}

export function ZoneIndicator({ zones, size = 28, onClick, selected }: ZoneIndicatorProps) {
  if (zones.length === 0) return null;

  // Count occurrences
  const counts = new Map<string, number>();
  for (const z of zones) {
    const key = z.toLowerCase().trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  if (counts.size === 0) return null;

  const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  const radius = (size - 6) / 2;
  const strokeWidth = size > 24 ? 5 : 4;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = entries.map(([zone, count]) => {
    const fraction = count / total;
    const length = fraction * circumference;
    const color = getZoneColor(zone);
    const offset = currentOffset;
    currentOffset += length;
    return { zone, count, fraction, length, offset, color };
  });

  const tooltipText = entries
    .map(([zone, count]) => `${zone.charAt(0).toUpperCase() + zone.slice(1)} (${count})`)
    .join(", ");

  const svgEl = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 ${onClick ? 'cursor-pointer' : 'cursor-default'} ${selected ? 'ring-2 ring-primary ring-offset-1 rounded-full' : ''}`}
      onClick={onClick}
    >
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${seg.length} ${circumference - seg.length}`}
          strokeDashoffset={-seg.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      ))}
    </svg>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {svgEl}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Zones : {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
