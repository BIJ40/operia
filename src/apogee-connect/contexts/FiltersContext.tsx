import { createContext, useContext, useState, ReactNode } from "react";
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from "date-fns";
import { fr } from "date-fns/locale";

export type PeriodType = 'today' | 'week' | 'month' | 'year';

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

// Par défaut: mois en cours
const now = new Date();
const currentMonthName = format(now, "MMMM", { locale: fr });

const defaultFilters: GlobalFilters = {
  dateRange: {
    start: startOfMonth(now),
    end: endOfMonth(now),
  },
  techniciens: [],
  universes: [],
  apporteurs: [],
  clients: [],
  periodLabel: `en ${currentMonthName}`,
  periodType: 'month',
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);

  const setDateRange = (start: Date, end: Date, label?: string, periodType?: PeriodType | string) => {
    const validPeriodType = periodType && ['today', 'week', 'month', 'year'].includes(periodType as string) 
      ? periodType as PeriodType 
      : undefined;
    setFilters(prev => ({ ...prev, dateRange: { start, end }, periodLabel: label, periodType: validPeriodType }));
  };

  const setQuickPeriod = (period: PeriodType) => {
    const now = new Date();
    let start: Date, end: Date, label: string;

    switch (period) {
      case 'today':
        start = startOfToday();
        end = endOfToday();
        label = "aujourd'hui";
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        label = "cette semaine";
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = `en ${format(now, "MMMM", { locale: fr })}`;
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        label = `en ${now.getFullYear()}`;
        break;
    }

    setFilters(prev => ({ ...prev, dateRange: { start, end }, periodLabel: label, periodType: period }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

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
