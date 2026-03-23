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

const ACTION_BADGE_COLORS: Record<ActionType, { bg: string; text: string; label: string }> = {
  devis_a_faire: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', label: 'Devis' },
  a_facturer: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'Facture' },
  relance_technicien: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Relance' },
  a_planifier_tvx: { bg: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300', label: 'Planifier' },
  a_commander: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', label: 'Commande' },
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Réf.</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Statut</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Date</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Client</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Détail</th>
            <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground w-10"></th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, index) => {
            const badge = ACTION_BADGE_COLORS[action.actionType];
            const ActionIcon = ACTION_ICONS[action.actionType];
            const isLate = action.isLate;
            
            return (
              <tr
                key={`${action.projectId}-${index}`}
                className={cn(
                  "border-b border-border/30 hover:bg-muted/40 cursor-pointer transition-colors",
                  index % 2 === 0 ? "bg-background" : "bg-muted/10"
                )}
                onClick={() => onOpenDossier?.(action.projectId)}
              >
                {/* Réf */}
                <td className="py-2.5 px-3">
                  <span className={cn(
                    "font-mono text-xs",
                    isLate ? "text-destructive font-bold" : "text-primary"
                  )}>
                    {action.ref}
                  </span>
                </td>

                {/* Type badge */}
                <td className="py-2.5 px-3">
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    badge.bg, badge.text
                  )}>
                    <ActionIcon className="w-3 h-3" />
                    {badge.label}
                  </span>
                </td>

                {/* Statut / action */}
                <td className="py-2.5 px-3">
                  <span className={cn(
                    "text-xs",
                    isLate ? "text-destructive font-bold" : "text-foreground"
                  )}>
                    {action.actionLabel}
                  </span>
                </td>

                {/* Date */}
                <td className="py-2.5 px-3 hidden sm:table-cell">
                  <span className={cn(
                    "text-xs",
                    isLate ? "text-destructive font-bold" : "text-muted-foreground"
                  )}>
                    {format(action.dateDepart, 'dd/MM/yyyy', { locale: fr })}
                    {isLate && action.daysLate != null && action.daysLate > 0 && (
                      <span className="ml-1 text-destructive font-bold">+{action.daysLate}j</span>
                    )}
                    {!isLate && action.actionType !== 'a_planifier_tvx' && action.actionType !== 'a_commander' && action.daysLate != null && action.daysLate > 0 && (
                      <span className="ml-1 text-muted-foreground">({action.daysLate}j)</span>
                    )}
                  </span>
                </td>

                {/* Client */}
                <td className="py-2.5 px-3 hidden md:table-cell">
                  <span className={cn(
                    "text-xs truncate max-w-[180px] block",
                    isLate ? "text-destructive font-bold" : "text-muted-foreground"
                  )}>
                    {action.clientName}
                  </span>
                </td>

                {/* Détail (technicien ou label) */}
                <td className="py-2.5 px-3 hidden lg:table-cell">
                  <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
                    {getTechnicienName(action) !== '-' ? getTechnicienName(action) : action.label}
                  </span>
                </td>

                {/* Chevron */}
                <td className="py-2.5 px-3 text-right">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 inline-block" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
