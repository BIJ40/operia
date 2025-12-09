/**
 * Widget Taux SAV - KPI + Gauge visuelle
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

export function TauxSavWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRangeMonth = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  const dateRangeYTD = {
    start: startOfYear(now),
    end: now,
  };

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-taux-sav', agencySlug, dateRangeMonth.start.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const [savMonth, savYTD] = await Promise.all([
        getMetricForAgency('taux_sav_global', agencySlug, { dateRange: dateRangeMonth }, services),
        getMetricForAgency('taux_sav_ytd', agencySlug, { dateRange: dateRangeYTD }, services),
      ]);
      
      return {
        tauxMonth: Number(savMonth.value) || 0,
        tauxYTD: Number(savYTD.value) || 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  const tauxYTD = data?.tauxYTD ?? 0;
  const tauxMonth = data?.tauxMonth ?? 0;
  
  // Couleur selon le taux (vert < 3%, orange 3-5%, rouge > 5%)
  const getColor = (taux: number) => {
    if (taux < 3) return 'text-emerald-500';
    if (taux < 5) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getStrokeColor = (taux: number) => {
    if (taux < 3) return 'stroke-emerald-500';
    if (taux < 5) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  // Calcul arc pour gauge (max 10%)
  const maxTaux = 10;
  const percentage = Math.min((tauxYTD / maxTaux) * 100, 100);
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(percentage / 100) * circumference * 0.75} ${circumference}`;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-2">
      {/* Gauge circulaire */}
      <div className="relative">
        <svg width="100" height="80" viewBox="0 0 100 80">
          {/* Arc de fond */}
          <path
            d="M 10 70 A 40 40 0 0 1 90 70"
            fill="none"
            className="stroke-muted"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Arc de valeur */}
          <path
            d="M 10 70 A 40 40 0 0 1 90 70"
            fill="none"
            className={getStrokeColor(tauxYTD)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
          />
        </svg>
        {/* Valeur centrale */}
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <span className={cn("text-2xl font-bold", getColor(tauxYTD))}>
            {tauxYTD.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Taux SAV YTD</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Ce mois:</span>
          <span className={cn("font-semibold", getColor(tauxMonth))}>
            {tauxMonth.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
