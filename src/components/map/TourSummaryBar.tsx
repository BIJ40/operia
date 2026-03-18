/**
 * TourSummaryBar — Bandeau résumé de la tournée technicien
 * Affiché en bas de la carte quand un seul tech est sélectionné
 */

import { Route, Clock, MapPin } from 'lucide-react';

interface TourSummaryBarProps {
  techName: string;
  techColor: string;
  rdvCount: number;
  distanceKm: number;
  durationMin: number;
  isLoading?: boolean;
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

export function TourSummaryBar({
  techName,
  techColor,
  rdvCount,
  distanceKm,
  durationMin,
  isLoading,
}: TourSummaryBarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-background/95 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-lg border text-sm">
      {/* Tech color dot */}
      <span
        className="w-3 h-3 rounded-full shrink-0 ring-2 ring-background"
        style={{ backgroundColor: techColor }}
      />

      <span className="font-semibold text-foreground truncate max-w-[180px]">
        Tournée de {techName}
      </span>

      <span className="text-muted-foreground">—</span>

      <span className="flex items-center gap-1 text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {rdvCount} RDV
      </span>

      {isLoading ? (
        <span className="text-muted-foreground text-xs animate-pulse">calcul…</span>
      ) : (
        <>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Route className="h-3.5 w-3.5" />
            {distanceKm} km
          </span>

          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            ~{formatDuration(durationMin)}
          </span>
        </>
      )}
    </div>
  );
}
