import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Clock, BellRing, FileText, Receipt, UserCheck } from 'lucide-react';
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
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500'
  },
  relance_technicien: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-500'
  },
};

const ACTION_ICONS: Record<ActionType, typeof FileText> = {
  devis_a_faire: FileText,
  a_facturer: Receipt,
  relance_technicien: UserCheck,
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
    <div className="space-y-3">
      {actions.map((action, index) => {
        const colors = ACTION_COLORS[action.actionType];
        const ActionIcon = ACTION_ICONS[action.actionType];
        
        return (
          <div
            key={`${action.projectId}-${index}`}
            className={cn(
              "group relative rounded-2xl border-2 p-4 transition-all duration-200",
              "hover:shadow-lg hover:scale-[1.01] cursor-pointer",
              colors.bg,
              colors.border,
              action.isLate && "ring-2 ring-red-400/50 ring-offset-2 ring-offset-background"
            )}
            onClick={() => onOpenDossier?.(action.projectId)}
          >
            {/* Status badge */}
            <div className="absolute -top-2 -right-2">
              {action.isLate ? (
                <Badge className="bg-red-500 hover:bg-red-600 text-white shadow-lg animate-pulse gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  En retard
                </Badge>
              ) : action.isDueSoon ? (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg gap-1">
                  <BellRing className="w-3 h-3" />
                  Demain
                </Badge>
              ) : null}
            </div>

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                "bg-white/80 dark:bg-black/20 shadow-sm"
              )}>
                <ActionIcon className={cn("w-6 h-6", colors.icon)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-muted-foreground bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded">
                    {action.ref}
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {action.label}
                  </span>
                </div>
                
                <p className="text-base font-medium text-foreground mb-2">
                  {action.actionLabel}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                    {action.clientName}
                  </span>
                  {getTechnicienName(action) !== '-' && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                      {getTechnicienName(action)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(action.deadline, 'dd MMM yyyy', { locale: fr })}
                    {action.isLate && action.daysLate && action.daysLate > 0 && (
                      <span className="text-red-500 font-medium">
                        (+{action.daysLate}j)
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action button */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDossier?.(action.projectId);
                }}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
