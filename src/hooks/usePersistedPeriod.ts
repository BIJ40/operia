import { useSearchParams } from 'react-router-dom';
import { useCallback, useMemo } from 'react';
import { 
  startOfToday, 
  endOfToday, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  subDays, 
  subWeeks,
  subMonths, 
  subYears,
  format,
  parseISO
} from 'date-fns';
import { fr } from 'date-fns/locale';

export type PersistedPeriodType = 'today' | 'yesterday' | 'week' | 'week-1' | 'month' | 'month-1' | 'year' | 'year-1' | 'custom';

export interface PeriodDates {
  start: Date;
  end: Date;
  label: string;
}

/**
 * Calcule les dates pour un type de période donné
 */
export function getDatesForPeriod(period: PersistedPeriodType, customStart?: Date, customEnd?: Date): PeriodDates {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        start: startOfToday(),
        end: endOfToday(),
        label: "aujourd'hui"
      };
    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return {
        start: new Date(yesterday.setHours(0, 0, 0, 0)),
        end: new Date(yesterday.setHours(23, 59, 59, 999)),
        label: "hier"
      };
    }
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: "cette semaine"
      };
    case 'week-1': {
      const lastWeek = subWeeks(now, 1);
      return {
        start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
        end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
        label: "semaine dernière"
      };
    }
    case 'month':
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: `en ${format(now, "MMMM", { locale: fr })}`
      };
    case 'month-1': {
      const lastMonth = subMonths(now, 1);
      return {
        start: startOfMonth(lastMonth),
        end: endOfMonth(lastMonth),
        label: `en ${format(lastMonth, "MMMM", { locale: fr })}`
      };
    }
    case 'year':
      return {
        start: startOfYear(now),
        end: endOfYear(now),
        label: `en ${now.getFullYear()}`
      };
    case 'year-1': {
      const lastYear = subYears(now, 1);
      return {
        start: startOfYear(lastYear),
        end: endOfYear(lastYear),
        label: `en ${lastYear.getFullYear()}`
      };
    }
    case 'custom':
      if (customStart && customEnd) {
        return {
          start: customStart,
          end: customEnd,
          label: `${format(customStart, "dd/MM")} - ${format(customEnd, "dd/MM")}`
        };
      }
      // Fallback to month if no custom dates
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: `en ${format(now, "MMMM", { locale: fr })}`
      };
    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: `en ${format(now, "MMMM", { locale: fr })}`
      };
  }
}

/**
 * Hook pour persister le choix de période dans l'URL
 * Évite la perte d'état quand l'utilisateur navigue entre onglets/fenêtres
 */
export function usePersistedPeriod(defaultPeriod: PersistedPeriodType = 'month', paramName = 'period') {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Lire la période depuis l'URL
  const periodFromUrl = searchParams.get(paramName) as PersistedPeriodType | null;
  const customStartFromUrl = searchParams.get('customStart');
  const customEndFromUrl = searchParams.get('customEnd');
  
  // Valider que c'est une période valide
  const validPeriods: PersistedPeriodType[] = ['today', 'yesterday', 'week', 'week-1', 'month', 'month-1', 'year', 'year-1', 'custom'];
  const currentPeriod = periodFromUrl && validPeriods.includes(periodFromUrl) ? periodFromUrl : defaultPeriod;
  
  // Parser les dates custom si présentes
  const customStart = customStartFromUrl ? parseISO(customStartFromUrl) : undefined;
  const customEnd = customEndFromUrl ? parseISO(customEndFromUrl) : undefined;
  
  // Calculer les dates basées sur la période
  const periodDates = useMemo(() => {
    return getDatesForPeriod(currentPeriod, customStart, customEnd);
  }, [currentPeriod, customStart, customEnd]);
  
  // Fonction pour changer la période
  const setPeriod = useCallback((period: PersistedPeriodType, customStartDate?: Date, customEndDate?: Date) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set(paramName, period);
      
      if (period === 'custom' && customStartDate && customEndDate) {
        newParams.set('customStart', format(customStartDate, 'yyyy-MM-dd'));
        newParams.set('customEnd', format(customEndDate, 'yyyy-MM-dd'));
      } else {
        newParams.delete('customStart');
        newParams.delete('customEnd');
      }
      
      return newParams;
    }, { replace: true });
  }, [setSearchParams, paramName]);
  
  return {
    period: currentPeriod,
    dates: periodDates,
    setPeriod,
  };
}
