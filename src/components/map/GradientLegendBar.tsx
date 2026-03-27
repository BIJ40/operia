/**
 * GradientLegendBar — Horizontal gradient legend with numeric labels.
 * Used on all choropleth map modes.
 */

interface GradientStop {
  color: string;
  label: string;
  position?: number; // 0-100%, auto-distributed if omitted
}

interface GradientLegendBarProps {
  stops: GradientStop[];
  /** Label shown at left end */
  minLabel?: string;
  /** Label shown at right end */
  maxLabel?: string;
  /** Optional unit suffix */
  unit?: string;
}

export function GradientLegendBar({ stops, minLabel, maxLabel, unit }: GradientLegendBarProps) {
  const gradientStops = stops.map((s, i) => {
    const pos = s.position ?? (i / (stops.length - 1)) * 100;
    return `${s.color} ${pos}%`;
  }).join(', ');

  return (
    <div className="flex flex-col gap-1 w-full max-w-sm">
      {/* Gradient bar */}
      <div
        className="h-3 rounded-full border border-border/50"
        style={{ background: `linear-gradient(to right, ${gradientStops})` }}
      />
      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
        <span>{minLabel || stops[0]?.label}{unit ? ` ${unit}` : ''}</span>
        {stops.length > 2 && (
          <span>{stops[Math.floor(stops.length / 2)]?.label}{unit ? ` ${unit}` : ''}</span>
        )}
        <span>{maxLabel || stops[stops.length - 1]?.label}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
}
