import { NetworkPeriod, useNetworkFilters } from '@/franchiseur/contexts/NetworkFiltersContext';
import { UnifiedPeriodSelector, PeriodValue } from '@/components/shared/UnifiedPeriodSelector';

const periodValueMap: Record<NetworkPeriod, PeriodValue> = {
  'day': 'today',
  'day-1': 'yesterday',
  'week': 'week',
  'week-1': 'week-1',
  'month': 'month',
  'month-1': 'month-1',
  'year': 'year',
  'year-1': 'year-1',
  'custom': 'custom'
};

const reversePeriodMap: Partial<Record<PeriodValue, NetworkPeriod>> = {
  'today': 'day',
  'yesterday': 'day-1',
  'week': 'week',
  'week-1': 'week-1',
  'month': 'month',
  'month-1': 'month-1',
  'year': 'year',
  'year-1': 'year-1',
  'custom': 'custom',
  'all': 'day' // fallback
};

export function NetworkPeriodSelector() {
  const { period, setPeriod, setDateRange } = useNetworkFilters();

  const handleChange = (start: Date, end: Date, label: string, periodValue?: PeriodValue) => {
    // Mettre à jour le period dans le contexte
    if (periodValue) {
      const networkPeriod = reversePeriodMap[periodValue];
      if (networkPeriod) {
        setPeriod(networkPeriod);
      }
    }
    
    // Mettre à jour les dates pour le mode custom
    if (periodValue === 'custom') {
      setDateRange({ from: start, to: end });
    }
  };

  return (
    <UnifiedPeriodSelector
      value={period}
      onChange={handleChange}
      availablePeriods={['today', 'yesterday', 'week', 'week-1', 'month', 'month-1', 'year', 'year-1', 'custom']}
      variant="franchiseur"
      showCustomPicker={true}
    />
  );
}
