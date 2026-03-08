/**
 * Widget CA par Apporteurs - utilise la période du dashboard
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

interface ApporteurData {
  name: string;
  ca: number;
}

export function CAApporteursWidget() {
  const { agence } = useAuth();
  const agencySlug = agence || '';

  // Utiliser la période du dashboard parent
  const { dateRange } = useDashboardPeriod();

  const services = getGlobalApogeeDataServices();

  const { data, isLoading } = useQuery({
    queryKey: ['widget-ca-apporteurs', agencySlug, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!agencySlug) return null;
      return getMetricForAgency('ca_par_apporteur', agencySlug, { dateRange }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }

  // Parser les données
  const apporteursData: ApporteurData[] = [];
  
  if (data) {
    const dataObj = data.value ?? data;
    
    if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
      Object.entries(dataObj as Record<string, unknown>).forEach(([key, val]) => {
        if (key === 'value' || key === 'metadata' || key === 'breakdown') return;
        
        if (typeof val === 'object' && val !== null) {
          const item = val as { name?: string; ca?: number };
          if (item.ca !== undefined) {
            apporteursData.push({
              name: item.name || key,
              ca: item.ca,
            });
          }
        } else if (typeof val === 'number') {
          apporteursData.push({ name: key, ca: val });
        }
      });
    }
  }

  // Trier par CA décroissant
  apporteursData.sort((a, b) => b.ca - a.ca);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const total = apporteursData.reduce((sum, a) => sum + a.ca, 0);

  if (!apporteursData.length) {
    return (
      <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {apporteursData.slice(0, 5).map((apporteur, index) => {
        const percentage = total > 0 ? (apporteur.ca / total) * 100 : 0;
        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium truncate max-w-[60%]">{apporteur.name}</span>
              <span className="text-muted-foreground">{formatCurrency(apporteur.ca)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-warm-orange/80 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
