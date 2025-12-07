/**
 * Widget KPI StatIA - Affiche une métrique StatIA réelle
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getMetricForAgency } from '@/statia/api/getMetricForAgency';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';

interface StatiaKPIWidgetProps {
  metricId: string;
}

const METRIC_CONFIG: Record<string, { label: string; format: 'currency' | 'percent' | 'number' | 'days' }> = {
  'ca_global_ht': { label: 'CA du mois', format: 'currency' },
  'taux_sav_global': { label: 'Taux SAV', format: 'percent' },
  'nb_dossiers_crees': { label: 'Dossiers reçus', format: 'number' },
  'ca_moyen_par_jour': { label: 'CA moyen/jour', format: 'currency' },
  'ca_moyen_par_tech': { label: 'CA moyen/tech', format: 'currency' },
  'nb_interventions': { label: 'Interventions', format: 'number' },
  'panier_moyen': { label: 'Panier moyen', format: 'currency' },
  'delai_premier_devis': { label: 'Délai 1er devis', format: 'days' },
  'top_techniciens_ca': { label: 'Top technicien', format: 'currency' },
  'ca_par_univers': { label: 'CA par univers', format: 'currency' },
};

function formatValue(value: number | null | undefined, formatType: 'currency' | 'percent' | 'number' | 'days'): string {
  if (value == null) return '–';
  
  switch (formatType) {
    case 'currency':
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        maximumFractionDigits: 0 
      }).format(value);
    case 'percent':
      return `${value.toFixed(1)} %`;
    case 'number':
      return new Intl.NumberFormat('fr-FR').format(Math.round(value));
    case 'days':
      return `${Math.round(value)} j`;
    default:
      return String(value);
  }
}

export function StatiaKPIWidget({ metricId }: StatiaKPIWidgetProps) {
  const { agence } = useAuth();
  const agencySlug = agence || '';
  
  const now = new Date();
  const currentMonth = {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
  
  const lastMonth = {
    start: startOfMonth(subMonths(now, 1)),
    end: endOfMonth(subMonths(now, 1)),
  };

  const { data: currentData, isLoading: loadingCurrent } = useQuery({
    queryKey: ['widget-kpi', metricId, agencySlug, 'current', format(currentMonth.start, 'yyyy-MM')],
    queryFn: async () => {
      const services = await getGlobalApogeeDataServices();
      if (!services) return null;
      return getMetricForAgency(metricId, agencySlug, { dateRange: currentMonth }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  const { data: previousData, isLoading: loadingPrevious } = useQuery({
    queryKey: ['widget-kpi', metricId, agencySlug, 'previous', format(lastMonth.start, 'yyyy-MM')],
    queryFn: async () => {
      const services = await getGlobalApogeeDataServices();
      if (!services) return null;
      return getMetricForAgency(metricId, agencySlug, { dateRange: lastMonth }, services);
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });

  const config = METRIC_CONFIG[metricId] || { label: metricId, format: 'number' };
  
  if (loadingCurrent) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  const currentValue = typeof currentData === 'number' ? currentData : null;
  const previousValue = typeof previousData === 'number' ? previousData : null;
  
  // Calcul du trend
  let trend = 0;
  if (currentValue != null && previousValue != null && previousValue !== 0) {
    trend = ((currentValue - previousValue) / previousValue) * 100;
  }

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-500' : trend < 0 ? 'text-red-500' : 'text-muted-foreground';
  const monthLabel = format(now, 'MMMM yyyy', { locale: fr });

  return (
    <div className="flex flex-col gap-2">
      <div className="text-2xl font-bold text-foreground">
        {formatValue(currentValue, config.format)}
      </div>
      <div className="flex items-center gap-2 text-sm">
        {!loadingPrevious && previousValue != null && (
          <>
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <span className={trendColor}>{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </>
        )}
        <span className="text-muted-foreground capitalize">{monthLabel}</span>
      </div>
    </div>
  );
}
