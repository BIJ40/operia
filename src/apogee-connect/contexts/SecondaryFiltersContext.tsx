import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useFilters } from "./FiltersContext";

export interface SecondaryFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  periodLabel?: string;
}

interface SecondaryFiltersContextType {
  filters: SecondaryFilters;
  setDateRange: (start: Date, end: Date, label?: string) => void;
}

// Par défaut: mois en cours (aligné avec FiltersContext)
const now = new Date();
const currentMonthName = format(now, "MMMM", { locale: fr });

const defaultFilters: SecondaryFilters = {
  dateRange: {
    start: startOfMonth(now),
    end: endOfMonth(now),
  },
  periodLabel: `en ${currentMonthName}`,
};

const SecondaryFiltersContext = createContext<SecondaryFiltersContextType | undefined>(undefined);

export const SecondaryFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<SecondaryFilters>(defaultFilters);
  
  // Synchroniser avec le FiltersContext parent si disponible
  let globalFilters: { dateRange: { start: Date; end: Date }; periodLabel?: string } | null = null;
  try {
    const filtersContext = useFilters();
    globalFilters = filtersContext.filters;
  } catch {
    // FiltersContext pas disponible, utiliser les valeurs locales
  }
  
  // Synchroniser quand les filtres globaux changent
  useEffect(() => {
    if (globalFilters) {
      setFilters({
        dateRange: globalFilters.dateRange,
        periodLabel: globalFilters.periodLabel,
      });
    }
  }, [globalFilters?.dateRange.start?.getTime(), globalFilters?.dateRange.end?.getTime(), globalFilters?.periodLabel]);

  const setDateRange = (start: Date, end: Date, label?: string) => {
    setFilters(prev => ({ ...prev, dateRange: { start, end }, periodLabel: label }));
  };

  return (
    <SecondaryFiltersContext.Provider value={{ filters, setDateRange }}>
      {children}
    </SecondaryFiltersContext.Provider>
  );
};

export const useSecondaryFilters = () => {
  const context = useContext(SecondaryFiltersContext);
  if (!context) {
    throw new Error("useSecondaryFilters must be used within SecondaryFiltersProvider");
  }
  return context;
};
