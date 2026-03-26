import { useFilters } from "@/apogee-connect/contexts/FiltersContext";
import { UnifiedPeriodSelector, PeriodValue } from "@/components/shared/UnifiedPeriodSelector";

interface PeriodSelectorProps {
  variant?: 'default' | 'previsionnel';
}

export const PeriodSelector = ({ variant = 'default' }: PeriodSelectorProps) => {
  const { filters, setDateRange } = useFilters();

  // Périodes futures pour le Prévisionnel (sans les périodes fixes, on utilise le month picker)
  const previsionnelPeriods: PeriodValue[] = ['month-remaining', 'week+1', 'quarter+1'];
  
  // Périodes standard (passées/présentes)
  const standardPeriods: PeriodValue[] = ['all', 'today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom'];

  const availablePeriods = variant === 'previsionnel' ? previsionnelPeriods : standardPeriods;
  
  // Déterminer la valeur actuelle depuis le contexte ou utiliser une valeur par défaut
  const defaultForVariant = variant === 'previsionnel' ? 'month-remaining' : 'month';
  const currentValue = filters.periodType || defaultForVariant;

  return (
    <UnifiedPeriodSelector
      value={currentValue}
      onChange={(start, end, label, periodValue) => setDateRange(start, end, label, periodValue)}
      availablePeriods={availablePeriods}
      variant="compact"
      showCustomPicker={variant !== 'previsionnel'}
      showMonthPicker={variant === 'previsionnel'}
    />
  );
};