/**
 * KPIs personnels pour les assistantes (N1)
 * Affiche: Dossiers traités, Actions en cours, Tickets créés
 */

import { Skeleton } from '@/components/ui/skeleton';
import { FolderCheck, ListTodo, MessageSquarePlus } from 'lucide-react';
import { useDashboardPeriod } from '@/pages/DashboardStatic';

export function AssistantePersonnelKPIs() {
  const { periodLabel } = useDashboardPeriod();
  
  // TODO: Implémenter le hook useAssistanteStats
  // basé sur user_id de l'utilisateur connecté
  const isLoading = false;
  const stats = {
    dossiersTraites: 42,
    actionsEnCours: 8,
    ticketsCrees: 5,
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Mes statistiques • {periodLabel}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dossiers traités */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/5 border border-green-500/10">
          <div className="p-2 rounded-full bg-green-500/10">
            <FolderCheck className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Dossiers traités</p>
            <p className="text-xl font-bold">{stats.dossiersTraites}</p>
          </div>
        </div>

        {/* Actions en cours */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div className="p-2 rounded-full bg-amber-500/10">
            <ListTodo className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Actions en cours</p>
            <p className="text-xl font-bold">{stats.actionsEnCours}</p>
          </div>
        </div>

        {/* Tickets créés */}
        <div className="flex items-center gap-3 p-4 rounded-lg bg-purple-500/5 border border-purple-500/10">
          <div className="p-2 rounded-full bg-purple-500/10">
            <MessageSquarePlus className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tickets créés</p>
            <p className="text-xl font-bold">{stats.ticketsCrees}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
