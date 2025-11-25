import { createContext, useContext, useState, ReactNode } from "react";
import { startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export interface GlobalFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  techniciens: string[];
  universes: string[];
  apporteurs: string[];
  clients: string[];
  periodLabel?: string; // Label de la période pour l'affichage
}

interface FiltersContextType {
  filters: GlobalFilters;
  setFilters: (filters: GlobalFilters) => void;
  setDateRange: (start: Date, end: Date, label?: string) => void;
  setQuickPeriod: (period: 'today' | 'week' | 'month' | 'year') => void;
  resetFilters: () => void;
}

const defaultFilters: GlobalFilters = {
  dateRange: {
    start: new Date(2020, 0, 1), // 1er janvier 2020 - large période pour capturer toutes les données
    end: new Date(2030, 11, 31), // 31 décembre 2030
  },
  techniciens: [],
  universes: [],
  apporteurs: [],
  clients: [],
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export const FiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<GlobalFilters>(defaultFilters);

  const setDateRange = (start: Date, end: Date, label?: string) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end }, periodLabel: label }));
  };

  const setQuickPeriod = (period: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case 'today':
        start = startOfToday();
        end = endOfToday();
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
    }

    setDateRange(start, end);
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
