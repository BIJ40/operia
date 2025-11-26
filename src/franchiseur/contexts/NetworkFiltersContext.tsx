import { createContext, useContext, useState, ReactNode } from 'react';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';

export type NetworkPeriod = 'day' | 'day-1' | 'week' | 'week-1' | 'month' | 'month-1' | 'year' | 'custom';

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
    default:
      return { from: startOfYear(now), to: now };
  }
}

export function NetworkFiltersProvider({ children }: { children: ReactNode }) {
  const [period, setPeriodState] = useState<NetworkPeriod>('month');
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPeriod('month'));
  const [comparisonPeriod, setComparisonPeriod] = useState<NetworkPeriod | null>(null);
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | null>(null);

  const setPeriod = (newPeriod: NetworkPeriod) => {
    setPeriodState(newPeriod);
    if (newPeriod !== 'custom') {
      setDateRange(getDateRangeForPeriod(newPeriod));
    }
  };

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
