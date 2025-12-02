import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { UnifiedPeriodSelector } from "@/components/shared/UnifiedPeriodSelector";

export const PeriodSelector = () => {
  const { filters, setDateRange } = useFilters();

  return (
    <UnifiedPeriodSelector
      value={filters.periodLabel}
      onChange={(start, end, label) => setDateRange(start, end, label)}
      availablePeriods={['today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom']}
      variant="compact"
      showCustomPicker={true}
    />
  );
};
