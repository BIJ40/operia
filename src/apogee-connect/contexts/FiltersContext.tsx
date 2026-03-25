import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfQuarter, endOfQuarter, subDays, subMonths, subYears, addDays, addWeeks, addMonths, addQuarters, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export type PeriodType =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'month-1'
  | 'year'
  | 'year-1'
  | 'custom'
  | 'all'
  // Périodes futures / Prévisionnel
  | 'tomorrow'
  | 'week+1'
  | 'month-remaining'
  | 'month+1'
  | 'quarter+1'
  | 'year-full';

export interface GlobalFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  techniciens: string[];
  universes: string[];
  apporteurs: string[];
  clients: string[];
  periodLabel?: string;
  periodType?: PeriodType;
}

interface FiltersContextType {
  filters: GlobalFilters;
  setFilters: (filters: GlobalFilters) => void;
  setDateRange: (start: Date, end: Date, label?: string, periodType?: PeriodType | string) => void;
  setQuickPeriod: (period: PeriodType) => void;
  resetFilters: () => void;
}

// Liste complète des périodes valides
const ALL_VALID_PERIODS: PeriodType[] = [
  'today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom',
  // Périodes futures / Prévisionnel
  'tomorrow', 'week+1', 'month-remaining', 'month+1', 'quarter+1', 'year-full'
];

// Fonction pour calculer les dates d'une période
function computePeriodDates(period: PeriodType, customStart?: Date, customEnd?: Date): { start: Date; end: Date; label: string } {
  const now = new Date();
  const nextMonth = addMonths(now, 1);
  const nextMonthName = format(nextMonth, "MMMM", { locale: fr });
  
  switch (period) {
    case 'today':
      return { start: startOfToday(), end: endOfToday(), label: "aujourd'hui" };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return { 
        start: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0), 
        end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59), 
        label: "hier" 
      };
    }
    case 'week':
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }), label: "cette semaine" };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: `en ${format(now, "MMMM", { locale: fr })}` };
    case 'month-1': {
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth), label: `en ${format(lastMonth, "MMMM", { locale: fr })}` };
    }
    case 'year':
      return { start: startOfYear(now), end: endOfYear(now), label: `en ${now.getFullYear()}` };
    case 'year-1': {
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear), label: `en ${lastYear.getFullYear()}` };
    }
    // Périodes futures / Prévisionnel
    case 'tomorrow': {
      const tomorrow = addDays(now, 1);
      return {
        start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0),
        end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59),
        label: 'demain'
      };
    }
    case 'week+1': {
      const nextWeek = addWeeks(now, 1);
      return {
        start: startOfWeek(nextWeek, { weekStartsOn: 1 }),
        end: endOfWeek(nextWeek, { weekStartsOn: 1 }),
        label: 'semaine prochaine'
      };
    }
    case 'month-remaining':
      return {
        start: startOfToday(),
        end: endOfMonth(now),
        label: 'fin du mois'
      };
    case 'month+1':
      return {
        start: startOfMonth(nextMonth),
        end: endOfMonth(nextMonth),
        label: `en ${nextMonthName}`
      };
    case 'quarter+1': {
      const nextQuarter = addQuarters(now, 1);
      return {
        start: startOfQuarter(nextQuarter),
        end: endOfQuarter(nextQuarter),
        label: 'trimestre à venir'
      };
    }
    case 'year-full':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: `année ${now.getFullYear()}`
      };
    case 'custom':
      if (customStart && customEnd) {
        return { start: customStart, end: customEnd, label: `${format(customStart, "dd/MM")} - ${format(customEnd, "dd/MM")}` };
      }
      // Fallback
      return { start: startOfMonth(now), end: endOfMonth(now), label: `en ${format(now, "MMMM", { locale: fr })}` };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now), label: `en ${format(now, "MMMM", { locale: fr })}` };
  }
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Lire la période depuis l'URL au mount
  const periodFromUrl = searchParams.get('period') as PeriodType | null;
  const customStartFromUrl = searchParams.get('customStart');
  const customEndFromUrl = searchParams.get('customEnd');
  
  const initialPeriod = periodFromUrl && ALL_VALID_PERIODS.includes(periodFromUrl) ? periodFromUrl : 'month';
  
  const customStart = customStartFromUrl ? parseISO(customStartFromUrl) : undefined;
  const customEnd = customEndFromUrl ? parseISO(customEndFromUrl) : undefined;
  const initialDates = computePeriodDates(initialPeriod, customStart, customEnd);
  
  const [filters, setFilters] = useState<GlobalFilters>({
    dateRange: { start: initialDates.start, end: initialDates.end },
    techniciens: [],
    universes: [],
    apporteurs: [],
    clients: [],
    periodLabel: initialDates.label,
    periodType: initialPeriod,
  });

  // Persister dans l'URL quand la période change
  const persistToUrl = useCallback((period: PeriodType, customStartDate?: Date, customEndDate?: Date) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('period', period);
      
      if (period === 'custom' && customStartDate && customEndDate) {
        newParams.set('customStart', format(customStartDate, 'yyyy-MM-dd'));
        newParams.set('customEnd', format(customEndDate, 'yyyy-MM-dd'));
      } else {
        newParams.delete('customStart');
        newParams.delete('customEnd');
      }
      
      return newParams;
    }, { replace: true });
  }, [setSearchParams]);

  const setDateRange = useCallback((start: Date, end: Date, label?: string, periodType?: PeriodType | string) => {
    const validPeriodType = periodType && ALL_VALID_PERIODS.includes(periodType as PeriodType) 
      ? periodType as PeriodType 
      : 'custom';
    
    setFilters(prev => ({ 
      ...prev, 
      dateRange: { start, end }, 
      periodLabel: label, 
      periodType: validPeriodType 
    }));
    
    // Persister dans l'URL
    if (validPeriodType === 'custom') {
      persistToUrl(validPeriodType, start, end);
    } else {
      persistToUrl(validPeriodType);
    }
  }, [persistToUrl]);

  const setQuickPeriod = useCallback((period: PeriodType) => {
    const dates = computePeriodDates(period);
    setFilters(prev => ({ 
      ...prev, 
      dateRange: { start: dates.start, end: dates.end }, 
      periodLabel: dates.label, 
      periodType: period 
    }));
    persistToUrl(period);
  }, [persistToUrl]);

  const resetFilters = useCallback(() => {
    const now = new Date();
    const defaultDates = computePeriodDates('month');
    setFilters({
      dateRange: { start: defaultDates.start, end: defaultDates.end },
      techniciens: [],
      universes: [],
      apporteurs: [],
      clients: [],
      periodLabel: defaultDates.label,
      periodType: 'month',
    });
    persistToUrl('month');
  }, [persistToUrl]);

  return (
    <FiltersContext.Provider value={{ filters, setFilters, setDateRange, setQuickPeriod, resetFilters }}>
      {children}
    </FiltersContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within FiltersProvider");
  }
  return context;
};
