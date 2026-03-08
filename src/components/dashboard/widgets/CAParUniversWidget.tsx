/**
 * Widget CA par Univers - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface UniversData {
  name: string;
  ca: number;
  color?: string;
}

export function CAParUniversWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  // Utiliser la période du dashboard parent
  const { dateRange } = useDashboardPeriod();

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-univers', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      return getMetricForAgency('ca_par_univers', agencySlug, { dateRange }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  // Parser les données selon la structure retournée par StatIA
  const universData: UniversData[] = [];
  
  if (data) {
    // Format attendu: { value: Record<string, { name, ca, color }> } ou directement Record<...>
    const dataObj = data.value ?? data;
    
    if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
      Object.entries(dataObj as Record<string, unknown>).forEach(([key, val]) => {
        // Ignorer les clés de métadonnées
        if (key === 'value' || key === 'metadata' || key === 'breakdown') return;
        
        if (typeof val === 'object' && val !== null) {
          const item = val as { name?: string; ca?: number; color?: string };
          if (item.ca !== undefined) {
            universData.push({
              name: item.name || key,
              ca: item.ca,
              color: item.color,
            });
          }
        } else if (typeof val === 'number') {
          universData.push({ name: key, ca: val });
        }
      });
    }
  }

  // Trier par CA décroissant
  universData.sort((a, b) => b.ca - a.ca);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const total = universData.reduce((sum, u) => sum + u.ca, 0);

  if (!universData.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {universData.slice(0, 5).map((univers, index) => {
        const percentage = total > 0 ? (univers.ca / total) * 100 : 0;
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate">{univers.name}</span>
              <span className="text-muted-foreground">{formatCurrency(univers.ca)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-warm-blue/80 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
