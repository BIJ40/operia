/**
 * Planning V2 — Indicateur de zone (pictos) par technicien
 * Affiche une roue colorée (donut) selon les zones d'intervention
 */

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Couleurs fixes par zone (mapping HelpConfort)
const ZONE_COLOR_MAP: Record<string, string> = {
  "peyrehorade": "#9CA3AF", // gris
  "hagetmau": "#8B5CF6",    // violet
  "mimizan": "#EAB308",     // jaune
  "capbreton": "#F97316",   // orange
  "mont de marsan": "#3B82F6", // bleu
  "dax": "#22C55E",         // vert
  "pays basque": "#EF4444", // rouge
};

// Fallback pour zones non mappées
const FALLBACK_COLORS = ["#6B7280", "#A78BFA", "#FBBF24", "#FB923C", "#60A5FA", "#4ADE80", "#F87171", "#2DD4BF", "#F472B6", "#818CF8"];
let fallbackIndex = 0;
const fallbackCache = new Map<string, string>();

function getZoneColor(zone: string): string {
  const key = zone.toLowerCase().trim();
  if (ZONE_COLOR_MAP[key]) return ZONE_COLOR_MAP[key];
  if (fallbackCache.has(key)) return fallbackCache.get(key)!;
  const color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
  fallbackCache.set(key, color);
  fallbackIndex++;
  return color;
}

interface ZoneIndicatorProps {
  zones: string[];
  /** Size of the wheel in px (default 28) */
  size?: number;
}

export function ZoneIndicator({ zones, size = 28 }: ZoneIndicatorProps) {
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

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="cursor-default shrink-0"
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
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Zones : {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
