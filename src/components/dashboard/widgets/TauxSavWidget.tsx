/**
 * Widget Taux SAV - lié au sélecteur de période du dashboard
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface TauxSavWidgetProps {
  compact?: boolean;
}

export function TauxSavWidget({ compact = false }: TauxSavWidgetProps) {
  const { agence } = useProfile();
  const agencySlug = agence || '';

  const { dateRange, periodLabel } = useDashboardPeriod();
  const services = getGlobalApogeeDataServices();

  // mode = 'period' => utilise la période sélectionnée
  // mode = 'ytd'    => Year-to-Date (année courante)
  const [mode, setMode] = useState<'period' | 'ytd'>('period');

  const { data, isLoading } = useQuery({
    queryKey: ['widget-taux-sav', agencySlug, mode, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;

      if (mode === 'ytd') {
        // Variante annualisée explicite : métrique YTD côté StatIA, toujours sur l'année en cours
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const ytdRange = { start: yearStart, end: now };
        const result = await getMetricForAgency('taux_sav_ytd', agencySlug, { dateRange: ytdRange }, services);
        return { taux: Number(result.value) || 0 };
      }

      // Variante liée à la temporalité sélectionnée
      const result = await getMetricForAgency('taux_sav_global', agencySlug, { dateRange }, services);
      return { taux: Number(result.value) || 0 };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  const taux = data?.taux ?? 0;
  
  const getColor = () => {
    if (taux <= 2) return 'text-emerald-500';
    if (taux <= 5) return 'text-amber-500';
    return 'text-red-500';
  };

  // Version compacte inline
  if (compact) {
    if (isLoading) {
      return <Skeleton className="h-5 w-16" />;
    }
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Taux SAV</span>
        <span className={`text-sm font-bold ${getColor()}`}>{taux.toFixed(1)}%</span>
      </div>
    );
  }

  // Version standard
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }
  
  const getStrokeColor = () => {
    if (taux <= 2) return 'stroke-emerald-500';
    if (taux <= 5) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const percentage = Math.min(taux, 10);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 10) * circumference;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2">
      {/* Petit sélecteur de mode Période / Année */}
      <div className="flex items-center gap-1 mb-1">
        <Button
          variant={mode === 'period' ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setMode('period')}
        >
          Période
        </Button>
        <Button
          variant={mode === 'ytd' ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => setMode('ytd')}
        >
          Année
        </Button>
      </div>

      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" className="stroke-muted" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            className={getStrokeColor()}
            strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${getColor()}`}>{taux.toFixed(1)}%</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center capitalize">
        {mode === 'period' ? periodLabel : 'Année en cours'}
      </p>
    </div>
  );
}
