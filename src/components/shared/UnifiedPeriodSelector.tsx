import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { 
  format, 
  startOfToday, 
  endOfToday, 
  startOfYesterday, 
  endOfYesterday,
  startOfWeek, 
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  startOfQuarter,
  endOfQuarter,
  addQuarters
} from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

export type PeriodValue = 
  | 'today' 
  | 'yesterday' 
  | 'week' 
  | 'week-1' 
  | 'month' 
  | 'month-1' 
  | 'year' 
  | 'year-1'
  | 'custom'
  | 'all'
  // Future periods for Prévisionnel
  | 'tomorrow'
  | 'week+1'
  | 'month+1'
  | 'month-remaining'
  | 'quarter+1'
  | 'year-full';

export interface PeriodConfig {
  value: PeriodValue;
  label: string;
  getDates: () => { start: Date; end: Date; label: string };
}

interface UnifiedPeriodSelectorProps {
  value?: string;
  onChange: (start: Date, end: Date, label: string, periodValue?: PeriodValue) => void;
  availablePeriods?: PeriodValue[];
  variant?: 'default' | 'compact' | 'franchiseur';
  showCustomPicker?: boolean;
  className?: string;
}

export function UnifiedPeriodSelector({
  value,
  onChange,
  availablePeriods = ['today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom'],
  variant = 'default',
  showCustomPicker = true,
  className,
}: UnifiedPeriodSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const now = new Date();
  const currentMonth = format(now, "MMMM", { locale: fr });
  const currentYear = now.getFullYear();
  const lastMonth = format(subMonths(now, 1), "MMMM", { locale: fr });
  const lastYear = currentYear - 1;
  const nextMonth = format(addMonths(now, 1), "MMMM", { locale: fr });

  // Fonction helper pour obtenir les 3 premiers caractères en majuscules
  const getMonthShort = (monthName: string) => {
    return monthName.slice(0, 3).toUpperCase();
  };

  // Configuration complète de toutes les périodes possibles
  const allPeriods: Record<PeriodValue, PeriodConfig> = {
    all: {
      value: 'all',
      label: 'Toutes',
      getDates: () => ({
        start: new Date(2020, 0, 1),
        end: new Date(2030, 11, 31),
        label: 'toutes périodes'
      })
    },
    today: {
      value: 'today',
      label: variant === 'compact' ? 'JOUR' : 'Aujourd\'hui',
      getDates: () => ({
        start: startOfToday(),
        end: endOfToday(),
        label: 'aujourd\'hui'
      })
    },
    yesterday: {
      value: 'yesterday',
      label: 'J-1',
      getDates: () => ({
        start: startOfYesterday(),
        end: endOfYesterday(),
        label: 'hier'
      })
    },
    week: {
      value: 'week',
      label: variant === 'compact' ? 'SEMAINE' : 'Semaine',
      getDates: () => ({
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'cette semaine'
      })
    },
    'week-1': {
      value: 'week-1',
      label: 'S-1',
      getDates: () => {
        const lastWeek = subWeeks(now, 1);
        return {
          start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
          end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
          label: 'semaine dernière'
        };
      }
    },
    month: {
      value: 'month',
      label: variant === 'compact' ? getMonthShort(currentMonth) : currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1),
      getDates: () => ({
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: `en ${currentMonth}`
      })
    },
    'month-1': {
      value: 'month-1',
      label: variant === 'compact' ? getMonthShort(lastMonth) : 'M-1',
      getDates: () => {
        const lastMonthDate = subMonths(now, 1);
        return {
          start: startOfMonth(lastMonthDate),
          end: endOfMonth(lastMonthDate),
          label: `en ${lastMonth}`
        };
      }
    },
    year: {
      value: 'year',
      label: `${currentYear}`,
      getDates: () => ({
        start: startOfYear(now),
        end: endOfYear(now),
        label: `en ${currentYear}`
      })
    },
    'year-1': {
      value: 'year-1',
      label: `${lastYear}`,
      getDates: () => {
        const lastYearDate = subYears(now, 1);
        return {
          start: startOfYear(lastYearDate),
          end: endOfYear(lastYearDate),
          label: `en ${lastYear}`
        };
      }
    },
    // Future periods
    tomorrow: {
      value: 'tomorrow',
      label: 'DEMAIN',
      getDates: () => {
        const tomorrow = addDays(now, 1);
        return {
          start: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0),
          end: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59),
          label: 'demain'
        };
      }
    },
    'week+1': {
      value: 'week+1',
      label: 'S+1',
      getDates: () => {
        const nextWeek = addWeeks(now, 1);
        return {
          start: startOfWeek(nextWeek, { weekStartsOn: 1 }),
          end: endOfWeek(nextWeek, { weekStartsOn: 1 }),
          label: 'semaine prochaine'
        };
      }
    },
    'month-remaining': {
      value: 'month-remaining',
      label: 'FIN MOIS',
      getDates: () => ({
        start: startOfToday(),
        end: endOfMonth(now),
        label: 'fin du mois'
      })
    },
    'month+1': {
      value: 'month+1',
      label: nextMonth.slice(0, 3).toUpperCase(),
      getDates: () => {
        const nextMonthDate = addMonths(now, 1);
        return {
          start: startOfMonth(nextMonthDate),
          end: endOfMonth(nextMonthDate),
          label: `en ${nextMonth}`
        };
      }
    },
    'quarter+1': {
      value: 'quarter+1',
      label: 'TRIM.',
      getDates: () => {
        const nextQuarter = addQuarters(now, 1);
        return {
          start: startOfQuarter(nextQuarter),
          end: endOfQuarter(nextQuarter),
          label: 'trimestre à venir'
        };
      }
    },
    'year-full': {
      value: 'year-full',
      label: `${currentYear}`,
      getDates: () => ({
        start: startOfYear(now),
        end: endOfYear(now),
        label: `année ${currentYear}`
      })
    },
    custom: {
      value: 'custom',
      label: 'CHOISIR',
      getDates: () => ({
        start: now,
        end: now,
        label: 'personnalisé'
      })
    }
  };

  // Filtrer les périodes disponibles
  const periods = availablePeriods
    .map(p => allPeriods[p])
    .filter(Boolean);

  const handlePeriodClick = (period: PeriodConfig) => {
    if (period.value === 'custom') {
      setShowPicker(true);
      return;
    }

    const { start, end, label } = period.getDates();
    onChange(start, end, label, period.value);
  };

  const handleCustomRangeApply = () => {
    if (customStartDate && customEndDate) {
      const label = `${format(customStartDate, "dd/MM")} - ${format(customEndDate, "dd/MM")}`;
      onChange(customStartDate, customEndDate, label, 'custom');
      setShowPicker(false);
      setCustomStartDate(undefined);
      setCustomEndDate(undefined);
    }
  };

  // Styles selon la variante
  const buttonStyles = {
    default: {
      active: "bg-gradient-to-r from-warm-teal/90 to-warm-blue/80 text-white shadow-sm",
      inactive: "bg-warm-teal/10 hover:bg-warm-teal/20 border-warm-teal/30 text-foreground"
    },
    compact: {
      active: "bg-gradient-to-r from-warm-teal/90 to-warm-blue/80 text-white shadow-sm",
      inactive: "bg-warm-teal/10 hover:bg-warm-teal/20 border-warm-teal/30 text-foreground"
    },
    franchiseur: {
      active: "bg-gradient-to-r from-helpconfort-blue to-warm-blue/80 text-white shadow-sm",
      inactive: "bg-helpconfort-blue/10 border-helpconfort-blue/30 hover:border-helpconfort-blue/50 hover:bg-helpconfort-blue/15"
    }
  };

  const styles = buttonStyles[variant];

  return (
    <div className={cn("flex flex-wrap gap-2 justify-center items-center", className)}>
      {periods.filter(p => p.value !== 'custom').map((period) => {
        const isActive = value === period.getDates().label || value === period.value;
        return (
          <Button
            key={period.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodClick(period)}
            className={cn(
              "text-xs font-medium px-3 py-1.5 transition-all rounded-lg",
              isActive ? styles.active : styles.inactive
            )}
          >
            {period.label}
          </Button>
        );
      })}

      {showCustomPicker && availablePeriods.includes('custom') && (
        <Popover open={showPicker} onOpenChange={setShowPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium px-3 py-1.5 hover:bg-muted"
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              CHOISIR
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="end">
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Date de début</p>
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={setCustomStartDate}
                  locale={fr}
                  className={cn("rounded-md border pointer-events-auto")}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Date de fin</p>
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={setCustomEndDate}
                  locale={fr}
                  disabled={(date) => customStartDate ? date < customStartDate : false}
                  className={cn("rounded-md border pointer-events-auto")}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCustomRangeApply}
                  disabled={!customStartDate || !customEndDate}
                  className="flex-1"
                >
                  Appliquer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowPicker(false);
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }}
                  className="flex-1"
                >
                  Annuler
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
