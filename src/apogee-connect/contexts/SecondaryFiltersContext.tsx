import { createContext, useContext, useState, ReactNode } from "react";
import { startOfToday, endOfToday } from "date-fns";

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

const defaultFilters: SecondaryFilters = {
  dateRange: {
    start: new Date(2020, 0, 1),
    end: new Date(2030, 11, 31),
  },
  periodLabel: "toutes périodes",
};

const SecondaryFiltersContext = createContext<SecondaryFiltersContextType | undefined>(undefined);

export const SecondaryFiltersProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFilters] = useState<SecondaryFilters>(defaultFilters);

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
