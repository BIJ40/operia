/**
 * Widget Taux SAV - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

export function TauxSavWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  const { dateRange, periodLabel } = useDashboardPeriod();
  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-taux-sav', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      const result = await getMetricForAgency('taux_sav_ytd', agencySlug, { dateRange }, services);
      return { taux: Number(result.value) || 0 };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-24 w-24 rounded-full" />
      </div>
    );
  }

  const taux = data?.taux ?? 0;
  
  const getColor = () => {
    if (taux <= 2) return 'text-emerald-500';
    if (taux <= 5) return 'text-amber-500';
    return 'text-red-500';
  };
  
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
      <p className="text-xs text-muted-foreground text-center capitalize">{periodLabel}</p>
    </div>
  );
}
