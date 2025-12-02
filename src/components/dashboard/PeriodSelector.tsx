import { UnifiedPeriodSelector, PeriodValue } from '@/components/shared/UnifiedPeriodSelector';
import { 
  startOfToday, 
  endOfToday, 
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths
} from 'date-fns';

interface PeriodSelectorProps {
  value: 'day' | '7days' | 'month' | 'year' | 'rolling12';
  onChange: (period: 'day' | '7days' | 'month' | 'year' | 'rolling12') => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  // Mapping vers les périodes standard
  const handleChange = (start: Date, end: Date, label: string, periodValue?: PeriodValue) => {
    // Convertir le periodValue en période dashboard
    if (periodValue === 'today') onChange('day');
    else if (periodValue === 'month') onChange('month');
    else if (periodValue === 'year') onChange('year');
    // Par défaut, si période personnalisée ou autre
    else onChange('day');
  };

  // Définir les périodes disponibles pour le dashboard principal
  // Note: '7days' et 'rolling12' ne sont pas dans UnifiedPeriodSelector standard
  // donc on garde un affichage custom pour ces boutons spécifiques

  const customPeriods = [
    { value: '7days' as const, label: '7 derniers jours' },
    { value: 'rolling12' as const, label: '12 mois glissants' },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      <UnifiedPeriodSelector
        value={value}
        onChange={handleChange}
        availablePeriods={['today', 'month', 'year']}
        variant="default"
        showCustomPicker={false}
        className="inline-flex"
      />
      
      {/* Périodes spécifiques au dashboard principal */}
      {customPeriods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
            value === period.value
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'border border-input bg-background hover:bg-muted'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
