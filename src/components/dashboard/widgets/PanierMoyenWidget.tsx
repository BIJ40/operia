/**
 * Widget Panier Moyen - KPI simple avec tendance
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatEuros } from '@/apogee-connect/utils/formatters';

export function PanierMoyenWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRangeCurrent = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  const dateRangePrev = {
    start: startOfMonth(subMonths(now, 1)),
    end: endOfMonth(subMonths(now, 1)),
  };

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-panier-moyen', agencySlug, dateRangeCurrent.start.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const [current, prev] = await Promise.all([
        getMetricForAgency('panier_moyen', agencySlug, { dateRange: dateRangeCurrent }, services),
        getMetricForAgency('panier_moyen', agencySlug, { dateRange: dateRangePrev }, services),
      ]);
      
      return {
        current: Number(current.value) || 0,
        prev: Number(prev.value) || 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  const current = data?.current ?? 0;
  const prev = data?.prev ?? 0;
  
  // Calcul variation
  const variation = prev > 0 ? ((current - prev) / prev) * 100 : 0;
  const isPositive = variation > 0;
  const isNeutral = Math.abs(variation) < 1;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
      {/* Icône panier */}
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white text-xl">
        🛒
      </div>

      {/* Valeur */}
      <p className="text-2xl font-bold">{formatEuros(current)}</p>
      
      {/* Label */}
      <p className="text-xs text-muted-foreground">Panier moyen</p>

      {/* Tendance */}
      <div className={cn(
        "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
        isNeutral && "bg-muted text-muted-foreground",
        isPositive && !isNeutral && "bg-emerald-500/10 text-emerald-600",
        !isPositive && !isNeutral && "bg-red-500/10 text-red-600"
      )}>
        {isNeutral ? (
          <Minus className="h-3 w-3" />
        ) : isPositive ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        <span>{isPositive ? '+' : ''}{variation.toFixed(1)}%</span>
        <span className="text-muted-foreground">vs M-1</span>
      </div>
    </div>
  );
}
