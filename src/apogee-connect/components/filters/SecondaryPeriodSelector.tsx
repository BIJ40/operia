import { useSecondaryFilters } from "@/apogee-connect/contexts/SecondaryFiltersContext";
import { UnifiedPeriodSelector } from "@/components/shared/UnifiedPeriodSelector";

export const SecondaryPeriodSelector = () => {
  const { filters, setDateRange } = useSecondaryFilters();

  return (
    <div className="flex flex-wrap gap-2 justify-center items-center">
      <span className="text-sm text-muted-foreground mr-2">Période:</span>
      <UnifiedPeriodSelector
        value={filters.periodLabel}
        onChange={(start, end, label) => setDateRange(start, end, label)}
        availablePeriods={['all', 'today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom']}
        variant="default"
        showCustomPicker={true}
      />
    </div>
  );
};
