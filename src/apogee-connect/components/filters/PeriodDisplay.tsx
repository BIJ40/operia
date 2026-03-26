/**
 * PeriodDisplay - Affiche la période sélectionnée de manière lisible
 * Convertit les codes période en dates réelles (J-1 → "29 janvier", custom → "15/01 - 28/01")
 */

import { useFilters } from '@/apogee-connect/contexts/FiltersContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';

export function PeriodDisplay() {
  const { filters } = useFilters();
  
  const { dateRange, periodType } = filters;
  
  // Générer le label lisible selon le type de période
  const getReadableLabel = (): string => {
    if (!dateRange?.start || !dateRange?.end) return '';
    
    const start = dateRange.start;
    const end = dateRange.end;
    
    switch (periodType) {
      case 'today':
        return format(start, "EEEE d MMMM", { locale: fr });
      
      case 'yesterday':
        // Au lieu de "J-1", afficher le jour réel
        return format(start, "EEEE d MMMM", { locale: fr });
      
      case 'week':
        return `Semaine du ${format(start, "d", { locale: fr })} au ${format(end, "d MMMM", { locale: fr })}`;
      
      case 'month':
        return format(start, "MMMM yyyy", { locale: fr });
      
      case 'month-1':
        return format(start, "MMMM yyyy", { locale: fr });
      
      case 'year':
      case 'year-1':
        return `Année ${format(start, "yyyy", { locale: fr })}`;
      
      case 'all':
        return 'Depuis le début';
      
      case 'custom':
        // Période personnalisée : afficher les dates
        const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
        if (sameMonth) {
          return `${format(start, "d", { locale: fr })} - ${format(end, "d MMMM yyyy", { locale: fr })}`;
        }
        return `${format(start, "d MMM", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })}`;
      
      // Périodes prévisionnelles
      case 'tomorrow':
        return format(start, "EEEE d MMMM", { locale: fr });
      
      case 'week+1':
        return `Semaine du ${format(start, "d", { locale: fr })} au ${format(end, "d MMMM", { locale: fr })}`;
      
      case 'month-remaining':
        return `Jusqu'au ${format(end, "d MMMM", { locale: fr })}`;
      
      case 'month+1':
        return format(start, "MMMM yyyy", { locale: fr });
      
      case 'quarter+1':
        return `T${Math.ceil((start.getMonth() + 1) / 3)} ${format(start, "yyyy", { locale: fr })}`;
      
      case 'year-full':
        return `Année ${format(start, "yyyy", { locale: fr })}`;
      
      default:
        return filters.periodLabel || '';
    }
  };

  const label = getReadableLabel();
  
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground capitalize">
        {label}
      </span>
    </div>
  );
}
