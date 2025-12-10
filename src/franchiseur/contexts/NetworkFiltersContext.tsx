import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, subYears, format, parseISO } from 'date-fns';

export type NetworkPeriod = 'day' | 'day-1' | 'week' | 'week-1' | 'month' | 'month-1' | 'year' | 'year-1' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface NetworkFiltersContextType {
  period: NetworkPeriod;
  setPeriod: (period: NetworkPeriod) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  comparisonPeriod: NetworkPeriod | null;
  setComparisonPeriod: (period: NetworkPeriod | null) => void;
  comparisonDateRange: DateRange | null;
  setComparisonDateRange: (range: DateRange | null) => void;
}

const NetworkFiltersContext = createContext<NetworkFiltersContextType | undefined>(undefined);

function getDateRangeForPeriod(period: NetworkPeriod): DateRange {
  const now = new Date();
  
  switch (period) {
    case 'day':
      return { from: startOfDay(now), to: now };
    case 'day-1':
      return { from: startOfDay(subDays(now, 1)), to: startOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: now };
    case 'week-1':
      return { from: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), to: startOfWeek(now, { weekStartsOn: 1 }) };
    case 'month':
      return { from: startOfMonth(now), to: now };
    case 'month-1':
      return { from: startOfMonth(subMonths(now, 1)), to: startOfMonth(now) };
    case 'year':
      return { from: startOfYear(now), to: now };
    case 'year-1':
      return { from: startOfYear(subYears(now, 1)), to: startOfYear(now) };
    default:
      return { from: startOfYear(now), to: now };
  }
}

export function NetworkFiltersProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Lire la période depuis l'URL
  const periodFromUrl = searchParams.get('networkPeriod') as NetworkPeriod | null;
  const customFromUrl = searchParams.get('networkFrom');
  const customToUrl = searchParams.get('networkTo');
  
  const validPeriods: NetworkPeriod[] = ['day', 'day-1', 'week', 'week-1', 'month', 'month-1', 'year', 'year-1', 'custom'];
  const initialPeriod = periodFromUrl && validPeriods.includes(periodFromUrl) ? periodFromUrl : 'month';
  
  // Pour custom, parser les dates depuis l'URL
  const initialDateRange = initialPeriod === 'custom' && customFromUrl && customToUrl
    ? { from: parseISO(customFromUrl), to: parseISO(customToUrl) }
    : getDateRangeForPeriod(initialPeriod);
  
  const [period, setPeriodState] = useState<NetworkPeriod>(initialPeriod);
  const [dateRange, setDateRangeState] = useState<DateRange>(initialDateRange);
  const [comparisonPeriod, setComparisonPeriod] = useState<NetworkPeriod | null>(null);
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | null>(null);

  // Persister dans l'URL
  const persistToUrl = useCallback((newPeriod: NetworkPeriod, customRange?: DateRange) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('networkPeriod', newPeriod);
      
      if (newPeriod === 'custom' && customRange) {
        newParams.set('networkFrom', format(customRange.from, 'yyyy-MM-dd'));
        newParams.set('networkTo', format(customRange.to, 'yyyy-MM-dd'));
      } else {
        newParams.delete('networkFrom');
        newParams.delete('networkTo');
      }
      
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const setPeriod = useCallback((newPeriod: NetworkPeriod) => {
    setPeriodState(newPeriod);
    if (newPeriod !== 'custom') {
      const newRange = getDateRangeForPeriod(newPeriod);
      setDateRangeState(newRange);
      persistToUrl(newPeriod);
    }
  }, [persistToUrl]);

  const setDateRange = useCallback((range: DateRange) => {
    setDateRangeState(range);
    persistToUrl('custom', range);
  }, [persistToUrl]);

  return (
    <NetworkFiltersContext.Provider
      value={{
        period,
        setPeriod,
        dateRange,
        setDateRange,
        comparisonPeriod,
        setComparisonPeriod,
        comparisonDateRange,
        setComparisonDateRange,
      }}
    >
      {children}
    </NetworkFiltersContext.Provider>
  );
}

export function useNetworkFilters() {
  const context = useContext(NetworkFiltersContext);
  if (context === undefined) {
    throw new Error('useNetworkFilters must be used within a NetworkFiltersProvider');
  }
  return context;
}
