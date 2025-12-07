/**
 * Widget CA par Univers - Affiche la répartition du CA par univers
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';

interface UniversData {
  name: string;
  ca: number;
  color?: string;
}

export function CAParUniversWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  const now = new Date();
  const dateRange = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-univers', agencySlug],
    queryFn: () => getMetricForAgency('ca_par_univers', agencySlug, { dateRange }, services),
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

  // Convertir les données en tableau
  const universData: UniversData[] = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const dataObj = data as unknown as Record<string, { name?: string; ca?: number; color?: string } | number>;
    Object.entries(dataObj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        universData.push({
          name: value.name || key,
          ca: value.ca || 0,
          color: value.color,
        });
      } else if (typeof value === 'number') {
        universData.push({ name: key, ca: value });
      }
    });
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
            <div className="h-2 bg-accent rounded-full overflow-hidden">
              <div
                className="h-full bg-helpconfort-blue rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
