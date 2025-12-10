import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { UnifiedPeriodSelector, PeriodValue } from "@/components/shared/UnifiedPeriodSelector";

export const PeriodSelector = () => {
  const { filters, setDateRange } = useFilters();

  return (
    <UnifiedPeriodSelector
      value={filters.periodType || 'month'}
      onChange={(start, end, label, periodValue) => setDateRange(start, end, label, periodValue)}
      availablePeriods={['today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom']}
      variant="compact"
      showCustomPicker={true}
    />
  );
};
