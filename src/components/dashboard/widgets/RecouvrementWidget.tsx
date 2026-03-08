/**
 * Widget Recouvrement - Taux + Encours restant
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { cn } from '@/lib/utils';

export function RecouvrementWidget() {
  const { agence } = useProfile();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-recouvrement', agencySlug, dateRange.start.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const [tauxResult, encours] = await Promise.all([
        getMetricForAgency('taux_recouvrement_global', agencySlug, { dateRange }, services),
        getMetricForAgency('encours_global_ttc', agencySlug, { dateRange }, services),
      ]);
      
      return {
        taux: Number(tauxResult.value) || 0,
        encours: Number(encours.value) || 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  const taux = data?.taux ?? 0;
  const encours = data?.encours ?? 0;
  
  // Couleur selon le taux (vert > 90%, orange 70-90%, rouge < 70%)
  const getColor = (t: number) => {
    if (t >= 90) return 'text-emerald-500';
    if (t >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getBgColor = (t: number) => {
    if (t >= 90) return 'bg-emerald-500';
    if (t >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-4">
      {/* Cercle de progression */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="35"
            className="fill-none stroke-muted"
            strokeWidth="8"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            className={cn("fill-none", getBgColor(taux).replace('bg-', 'stroke-'))}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(taux / 100) * 220} 220`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-lg font-bold", getColor(taux))}>
            {taux.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="text-center space-y-1">
        <p className="text-xs text-muted-foreground">Taux Recouvrement</p>
        <div className="bg-muted/50 rounded-lg px-3 py-1.5">
          <p className="text-xs text-muted-foreground">Encours restant</p>
          <p className="text-sm font-semibold">{formatEuros(encours)}</p>
        </div>
      </div>
    </div>
  );
}
