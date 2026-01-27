/**
 * Filtres rapides style LUCCA pour le cockpit RH
 * Chips cliquables avec toggle on/off
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, Sparkles, HardHat, FileText, Car, GraduationCap } from 'lucide-react';

export type CockpitFilterId = 
  | 'incomplete' 
  | 'new' 
  | 'epi_missing' 
  | 'docs_missing' 
  | 'no_vehicle' 
  | 'no_competences';

interface CockpitFilter {
  id: CockpitFilterId;
  label: string;
  icon: React.ReactNode;
  color: {
    active: string;
    inactive: string;
  };
}

const COCKPIT_FILTERS: CockpitFilter[] = [
  {
    id: 'incomplete',
    label: 'À corriger',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30',
    },
  },
  {
    id: 'new',
    label: 'Nouveaux',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/30',
    },
  },
  {
    id: 'epi_missing',
    label: 'EPI incomplets',
    icon: <HardHat className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/30',
    },
  },
  {
    id: 'docs_missing',
    label: 'Docs manquants',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/30',
    },
  },
  {
    id: 'no_vehicle',
    label: 'Sans véhicule',
    icon: <Car className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30',
    },
  },
  {
    id: 'no_competences',
    label: 'Compétences manquantes',
    icon: <GraduationCap className="h-3.5 w-3.5" />,
    color: {
      active: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
      inactive: 'bg-muted/50 text-muted-foreground border-border hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/30',
    },
  },
];

interface RHCockpitFiltersProps {
  activeFilters: CockpitFilterId[];
  onFilterToggle: (filterId: CockpitFilterId) => void;
  counts?: Record<CockpitFilterId, number>;
  className?: string;
}

export function RHCockpitFilters({
  activeFilters,
  onFilterToggle,
  counts,
  className,
}: RHCockpitFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {COCKPIT_FILTERS.map((filter) => {
        const isActive = activeFilters.includes(filter.id);
        const count = counts?.[filter.id];

        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onFilterToggle(filter.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
              isActive ? filter.color.active : filter.color.inactive
            )}
          >
            {filter.icon}
            <span>{filter.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold min-w-[18px] text-center',
                  isActive
                    ? 'bg-white/40 dark:bg-black/20'
                    : 'bg-muted dark:bg-muted'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { COCKPIT_FILTERS };
