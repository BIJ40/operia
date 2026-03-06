/**
 * Planning V2 — Indicateur de zone (pictos) par technicien
 * Affiche un petit donut chart coloré avec icône localisation
 * montrant la répartition des zones d'intervention du technicien pour la journée
 */

import { MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Palette de couleurs dédiée aux zones — cohérent et distinctif
const ZONE_COLORS: string[] = [
  "#E53E3E", // rouge
  "#3182CE", // bleu
  "#38A169", // vert
  "#D69E2E", // jaune foncé
  "#805AD5", // violet
  "#DD6B20", // orange
  "#319795", // teal
  "#D53F8C", // rose
  "#2B6CB0", // bleu foncé
  "#C05621", // marron
];

// Cache de couleurs par nom de zone (stable pendant la session)
const zoneColorCache = new Map<string, string>();
let colorIndex = 0;

function getZoneColor(zone: string): string {
  const key = zone.toLowerCase().trim();
  if (zoneColorCache.has(key)) return zoneColorCache.get(key)!;
  const color = ZONE_COLORS[colorIndex % ZONE_COLORS.length];
  zoneColorCache.set(key, color);
  colorIndex++;
  return color;
}

interface ZoneIndicatorProps {
  /** All pictosInterv values from today's appointments for this tech */
  zones: string[];
}

export function ZoneIndicator({ zones }: ZoneIndicatorProps) {
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

  // Build SVG donut segments
  const size = 22;
  const radius = 8;
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

  // Single zone → simple colored pin
  if (entries.length === 1) {
    const color = getZoneColor(entries[0][0]);
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-0.5 cursor-default">
              <MapPin className="h-3.5 w-3.5" style={{ color }} strokeWidth={2.5} />
              <span className="text-[9px] font-semibold truncate max-w-[50px]" style={{ color }}>
                {entries[0][0].charAt(0).toUpperCase() + entries[0][0].slice(1)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Zone : {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Multiple zones → donut chart
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-default">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={4}
                  strokeDasharray={`${seg.length} ${circumference - seg.length}`}
                  strokeDashoffset={-seg.offset}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              ))}
              {/* Center pin icon */}
              <MapPin
                x={cx - 4}
                y={cy - 4}
                width={8}
                height={8}
                className="text-foreground/60"
                strokeWidth={2}
              />
            </svg>
            <div className="flex gap-0.5">
              {segments.slice(0, 3).map((seg, i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
              ))}
              {segments.length > 3 && (
                <span className="text-[8px] text-muted-foreground">+{segments.length - 3}</span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Zones : {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
