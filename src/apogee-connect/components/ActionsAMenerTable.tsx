import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Clock, BellRing, FileText, Receipt, UserCheck, CalendarClock, ShoppingCart } from 'lucide-react';
import { ActionRow, ActionType } from '../types/actions';
import { DataService } from '../services/dataService';
import { cn } from '@/lib/utils';

interface ActionsAMenerTableProps {
  actions: ActionRow[];
  onOpenDossier?: (projectId: number) => void;
}

const ACTION_COLORS: Record<ActionType, { bg: string; border: string; icon: string }> = {
  devis_a_faire: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500'
  },
  a_facturer: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500'
  },
  relance_technicien: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-500'
  },
  a_planifier_tvx: { 
    bg: 'bg-sky-50 dark:bg-sky-950/30', 
    border: 'border-sky-200 dark:border-sky-800',
    icon: 'text-sky-500'
  },
  a_commander: { 
    bg: 'bg-orange-50 dark:bg-orange-950/30', 
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-500'
  },
};

const ACTION_ICONS: Record<ActionType, typeof FileText> = {
  devis_a_faire: FileText,
  a_facturer: Receipt,
  relance_technicien: UserCheck,
  a_planifier_tvx: CalendarClock,
  a_commander: ShoppingCart,
};

export function ActionsAMenerTable({ actions, onOpenDossier }: ActionsAMenerTableProps) {
  // Récupérer les IDs des techniciens à lookup
  const technicienIds = useMemo(() => {
    const ids = new Set<number>();
    actions.forEach(action => {
      if (action.technicienId) {
        ids.add(action.technicienId);
      }
    });
    return Array.from(ids);
  }, [actions]);

  // Charger les infos des techniciens via GetUsers
  const { data: users } = useQuery({
    queryKey: ['techniciens', technicienIds],
    enabled: technicienIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false);
      return apiData.users || [];
    },
  });

  // Créer un map userId -> nom complet
  const techniciensMap = useMemo(() => {
    const map = new Map<number, string>();
    if (users) {
      users.forEach((user: any) => {
        const fullName = [user.prenom, user.nom].filter(Boolean).join(' ') || 'Technicien';
        map.set(user.id, fullName);
      });
    }
    return map;
  }, [users]);

  // Fonction pour récupérer le nom du technicien
  const getTechnicienName = (action: ActionRow): string => {
    if (action.technicienName && action.technicienName !== 'Technicien inconnu') {
      return action.technicienName;
    }
    if (action.technicienId && techniciensMap.has(action.technicienId)) {
      return techniciensMap.get(action.technicienId)!;
    }
    return action.technicienName || '-';
  };

  if (actions.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20 flex items-center justify-center">
          <Clock className="w-10 h-10 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold text-foreground">Aucune action en attente</p>
        <p className="text-sm text-muted-foreground mt-2">Tous vos dossiers sont à jour ! 🎉</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action, index) => {
        const colors = ACTION_COLORS[action.actionType];
        const ActionIcon = ACTION_ICONS[action.actionType];
        
        return (
          <div
            key={`${action.projectId}-${index}`}
            className={cn(
              "group relative rounded-xl border p-3 transition-all duration-200",
              "hover:shadow-md hover:scale-[1.005] cursor-pointer",
              colors.bg,
              colors.border,
              action.isLate && "ring-1 ring-red-400/50 ring-offset-1 ring-offset-background"
            )}
            onClick={() => onOpenDossier?.(action.projectId)}
          >
            <div className="flex items-center gap-3">
              {/* Icon compact */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                "bg-white/80 dark:bg-black/20"
              )}>
                <ActionIcon className={cn("w-4 h-4", colors.icon)} />
              </div>

              {/* Content - single line */}
              <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                {/* Ref + Label */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-muted-foreground bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded flex-shrink-0">
                    {action.ref}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                    {action.label}
                  </span>
                </div>

                {/* Action label */}
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {action.actionLabel}
                </span>

                {/* Client */}
                <span className="text-xs text-muted-foreground flex items-center gap-1 hidden md:flex">
                  <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                  {action.clientName}
                </span>

                {/* Technicien */}
                {getTechnicienName(action) !== '-' && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 hidden lg:flex">
                    <span className="w-1 h-1 rounded-full bg-current opacity-40" />
                    {getTechnicienName(action)}
                  </span>
                )}
              </div>

              {/* Right side - date & status */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Date */}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(action.deadline, 'dd/MM', { locale: fr })}
                  {action.isLate && action.daysLate && action.daysLate > 0 && (
                    <span className="text-red-500 font-medium text-[10px]">
                      +{action.daysLate}j
                    </span>
                  )}
                </span>

                {/* Status badge */}
                {action.isLate ? (
                  <Badge className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    <AlertTriangle className="w-3 h-3" />
                  </Badge>
                ) : action.isDueSoon ? (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0 h-5 gap-0.5">
                    <BellRing className="w-3 h-3" />
                  </Badge>
                ) : null}

                {/* Action button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDossier?.(action.projectId);
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
