import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
  addQuarters,
  setMonth,
  setYear
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
  | 'year-full'
  | 'specific-month'; // Nouveau: mois spécifique

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
  showMonthPicker?: boolean; // Nouveau: afficher le sélecteur de mois
  className?: string;
}

// Liste des mois en français
const MONTHS = [
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
  { value: 6, label: 'Juillet' },
  { value: 7, label: 'Août' },
  { value: 8, label: 'Septembre' },
  { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' },
];

export function UnifiedPeriodSelector({
  value,
  onChange,
  availablePeriods = ['today', 'yesterday', 'week', 'month', 'month-1', 'year', 'year-1', 'custom'],
  variant = 'default',
  showCustomPicker = true,
  showMonthPicker = false,
  className,
}: UnifiedPeriodSelectorProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  
  // État pour le sélecteur de mois spécifique
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

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
    'specific-month': {
      value: 'specific-month',
      label: 'MOIS',
      getDates: () => {
        const targetDate = setYear(setMonth(new Date(), selectedMonth), selectedYear);
        const monthName = format(targetDate, "MMMM yyyy", { locale: fr });
        return {
          start: startOfMonth(targetDate),
          end: endOfMonth(targetDate),
          label: monthName
        };
      }
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
    if (customRange?.from && customRange?.to) {
      const label = `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`;
      onChange(customRange.from, customRange.to, label, 'custom');
      setShowPicker(false);
      setCustomRange(undefined);
    }
  };

  // Handler pour le sélecteur de mois spécifique
  const handleMonthSelect = (monthValue: string) => {
    const month = parseInt(monthValue, 10);
    setSelectedMonth(month);
    applySpecificMonth(month, selectedYear);
  };

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    applySpecificMonth(selectedMonth, newYear);
  };

  const applySpecificMonth = (month: number, year: number) => {
    const targetDate = setYear(setMonth(new Date(), month), year);
    const monthName = format(targetDate, "MMMM yyyy", { locale: fr });
    onChange(
      startOfMonth(targetDate),
      endOfMonth(targetDate),
      monthName,
      'specific-month'
    );
  };

  // Styles selon la variante
  const buttonStyles = {
    default: {
      active: "bg-warm-blue text-white shadow-sm border-warm-blue hover:bg-warm-blue/90",
      inactive: "bg-transparent border-border text-foreground hover:bg-warm-orange hover:text-white hover:border-warm-orange"
    },
    compact: {
      active: "bg-warm-blue text-white shadow-sm border-warm-blue hover:bg-warm-blue/90",
      inactive: "bg-transparent border-border text-foreground hover:bg-warm-orange hover:text-white hover:border-warm-orange"
    },
    franchiseur: {
      active: "bg-gradient-to-r from-helpconfort-blue to-warm-blue/80 text-white shadow-sm",
      inactive: "bg-helpconfort-blue/10 border-helpconfort-blue/30 hover:border-helpconfort-blue/50 hover:bg-helpconfort-blue/15"
    }
  };

  const styles = buttonStyles[variant];
  const isCompact = variant === 'compact';

  return (
    <div className={cn(
      "flex flex-wrap gap-1.5 justify-center items-center",
      className
    )}>
      {periods.filter(p => p.value !== 'custom' && p.value !== 'specific-month').map((period) => {
        const isActive = value === period.getDates().label || value === period.value;
        return (
          <Button
            key={period.value}
            variant="outline"
            size="sm"
            onClick={() => handlePeriodClick(period)}
            className={cn(
              "text-xs font-medium px-3.5 py-1.5 rounded-full transition-all border",
              isActive ? styles.active : styles.inactive
            )}
          >
            {period.label}
          </Button>
        );
      })}

      {/* Sélecteur de mois spécifique pour le prévisionnel */}
      {showMonthPicker && (
        <div className="flex items-center gap-1 border rounded-lg px-2 py-1 bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleYearChange(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[40px] text-center">{selectedYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => handleYearChange(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select value={String(selectedMonth)} onValueChange={handleMonthSelect}>
            <SelectTrigger className="h-7 w-[100px] text-xs border-0 bg-transparent focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
          <PopoverContent className="w-auto p-3 bg-background z-50" align="end">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {customRange?.from 
                  ? customRange.to 
                    ? `${format(customRange.from, "dd MMM", { locale: fr })} → ${format(customRange.to, "dd MMM", { locale: fr })}`
                    : `Début: ${format(customRange.from, "dd MMM", { locale: fr })} — Choisir la fin`
                  : "Sélectionner la période"
                }
              </p>
              <Calendar
                mode="range"
                selected={customRange}
                onSelect={setCustomRange}
                locale={fr}
                numberOfMonths={1}
                className={cn("rounded-md border pointer-events-auto")}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCustomRangeApply}
                  disabled={!customRange?.from || !customRange?.to}
                  className="flex-1"
                >
                  Appliquer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowPicker(false);
                    setCustomRange(undefined);
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