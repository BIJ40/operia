/**
 * Widget Panier Moyen - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEuros } from '@/apogee-connect/utils/formatters';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface PanierMoyenWidgetProps {
  compact?: boolean;
}

export function PanierMoyenWidget({ compact = false }: PanierMoyenWidgetProps) {
  const { agence } = useProfile();
  const agencySlug = agence || '';

  // Utiliser la période du dashboard parent
  const { dateRange, periodLabel } = useDashboardPeriod();

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-panier-moyen', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      
      const result = await getMetricForAgency('panier_moyen', agencySlug, { dateRange }, services);
      return {
        current: Number(result.value) || 0,
      };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  const current = data?.current ?? 0;

  // Version compacte inline
  if (compact) {
    if (isLoading) {
      return <Skeleton className="h-5 w-16" />;
    }
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Panier moyen</span>
        <span className="text-sm font-bold text-foreground">{formatEuros(current)}</span>
      </div>
    );
  }

  // Version standard
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
      {/* Icône panier */}
      <div className="w-12 h-12 rounded-full bg-pink-400/70 flex items-center justify-center text-white text-xl">
        🛒
      </div>

      {/* Valeur */}
      <p className="text-2xl font-bold">{formatEuros(current)}</p>
      
      {/* Label */}
      <p className="text-xs text-muted-foreground text-center capitalize">{periodLabel}</p>
    </div>
  );
}
