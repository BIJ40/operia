import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, AlertTriangle, Clock, BellRing } from 'lucide-react';
import { ActionRow } from '../types/actions';
import { DataService } from '../services/dataService';

interface ActionsAMenerTableProps {
  actions: ActionRow[];
  onOpenDossier?: (projectId: number) => void;
}

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
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Aucune action en attente</p>
        <p className="text-sm mt-2">Tous vos dossiers sont à jour !</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Réf.</TableHead>
            <TableHead className="w-[200px]">Libellé</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Action à mener</TableHead>
            <TableHead className="w-[140px]">Date limite</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Technicien</TableHead>
            <TableHead className="w-[100px] text-center">État</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action, index) => (
            <TableRow key={`${action.projectId}-${index}`}>
              <TableCell className="font-medium text-xs">
                {action.ref}
              </TableCell>
              <TableCell className="font-medium">
                {action.label}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {action.statut}
                </span>
              </TableCell>
              <TableCell className="font-medium">
                {action.actionLabel}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  {format(action.deadline, 'dd/MM/yyyy', { locale: fr })}
                </div>
                {action.isLate && action.daysLate && action.daysLate > 0 && (
                  <div className="text-xs text-destructive mt-1">
                    +{action.daysLate} jour{action.daysLate > 1 ? 's' : ''}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {action.clientName}
              </TableCell>
              <TableCell className="text-sm">
                {getTechnicienName(action)}
              </TableCell>
              <TableCell className="text-center">
                {action.isLate ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    En retard
                  </Badge>
                ) : action.isDueSoon ? (
                  <Badge variant="default" className="gap-1 bg-orange-500 hover:bg-orange-600 text-white">
                    <BellRing className="w-3 h-3" />
                    J+1
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="w-3 h-3" />
                    À venir
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenDossier?.(action.projectId)}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
