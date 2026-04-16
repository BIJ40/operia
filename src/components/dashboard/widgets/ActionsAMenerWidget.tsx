/**
 * ActionsAMenerWidget - Mini widget pour la page d'accueil
 * Affiche les 10 actions les plus anciennes en retard
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, FileText, Receipt, UserCheck, CalendarClock, ShoppingCart, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { buildActionsAMener } from '@/apogee-connect/utils/actionsAMenerCalculations';
import { useActionsConfig } from '@/apogee-connect/hooks/useActionsConfig';
import { ActionType } from '@/apogee-connect/types/actions';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<ActionType, typeof FileText> = {
  devis_a_faire: FileText,
  a_facturer: Receipt,
  relance_technicien: UserCheck,
  a_planifier_tvx: CalendarClock,
  a_commander: ShoppingCart,
};

const TYPE_COLORS: Record<ActionType, string> = {
  devis_a_faire: 'text-blue-500',
  a_facturer: 'text-amber-500',
  relance_technicien: 'text-purple-500',
  a_planifier_tvx: 'text-sky-500',
  a_commander: 'text-orange-500',
};

interface ActionsAMenerWidgetProps {
  onNavigate?: () => void;
}

export function ActionsAMenerWidget({ onNavigate }: ActionsAMenerWidgetProps) {
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();

  const { data: actions, isLoading } = useQuery({
    queryKey: ['actions-a-mener-widget', currentAgency?.id, config],
    enabled: isAgencyReady && !isLoadingConfig,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false, currentAgency?.id);
      return buildActionsAMener(
        apiData.projects || [],
        apiData.devis || [],
        apiData.factures || [],
        apiData.clients || [],
        config
      );
    },
  });

  const top10 = useMemo(() => {
    if (!actions) return [];
    return actions.filter(a => a.isLate).slice(0, 10);
  }, [actions]);

  const lateCount = actions?.filter(a => a.isLate).length ?? 0;

  if (isLoading || isLoadingConfig) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
      </div>
    );
  }

  if (top10.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Aucune action en retard 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {top10.map((action, i) => {
        const Icon = TYPE_ICONS[action.actionType];
        const color = TYPE_COLORS[action.actionType];
        return (
          <div
            key={`${action.projectId}-${i}`}
            className="flex items-center gap-2 py-1 text-xs"
          >
            <Icon className={cn("w-3 h-3 flex-shrink-0", color)} />
            <span className="font-mono text-destructive font-bold truncate w-20 flex-shrink-0">
              {action.ref}
            </span>
            <span className="text-destructive font-bold truncate flex-1">
              {action.clientName}
            </span>
            <span className="text-destructive font-bold flex-shrink-0">
              +{action.daysLate}j
            </span>
          </div>
        );
      })}
      {lateCount > 10 && (
        <button
          onClick={onNavigate}
          className="flex items-center gap-1 text-[10px] text-primary hover:underline mt-1 cursor-pointer"
        >
          +{lateCount - 10} autres en retard
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
