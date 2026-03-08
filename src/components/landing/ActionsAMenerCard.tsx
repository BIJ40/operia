import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle, FileText, Euro, Clock } from 'lucide-react';
import { DataService } from '@/apogee-connect/services/dataService';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { buildActionsAMener, calculateActionsStats } from '@/apogee-connect/utils/actionsAMenerCalculations';
import { useActionsConfig } from '@/apogee-connect/hooks/useActionsConfig';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfile } from '@/contexts/ProfileContext';
import { logError } from '@/lib/logger';

export function ActionsAMenerCard() {
  const { agence } = useAuth();
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['landing-actions-preview', agence, config],
    enabled: !!agence && isAgencyReady && !isLoadingConfig,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const apiData = await DataService.loadAllData(true, false, agence);
        
        const actions = buildActionsAMener(
          apiData.projects || [],
          apiData.devis || [],
          apiData.factures || [],
          apiData.clients || [],
          config
        );

        return calculateActionsStats(actions);
      } catch (error) {
        logError('LANDING', 'Erreur chargement actions preview', { error });
        return null;
      }
    },
  });

  return (
    <Link
      to="/actions-a-mener"
      className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex flex-col gap-3 min-h-[240px]"
    >
      {/* En-tête avec icône et titre */}
      <div className="flex items-center gap-3">
        <AlertCircle className="w-12 h-12 text-orange-600 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">Actions à mener</h2>
          <p className="text-xs text-muted-foreground">Restez à jour</p>
        </div>
      </div>

      {/* Mini KPIs */}
      <div className="flex flex-col gap-2 mt-1">
        {isLoading ? (
          <>
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </>
        ) : stats ? (
          <>
            {/* Factures à faire */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-muted-foreground font-medium">Factures à faire</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {stats.facturesAFaire}
                </div>
              </div>
            </div>

            {/* Dossiers en retard */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-destructive" />
                  <span className="text-xs text-muted-foreground font-medium">Dossiers en retard</span>
                </div>
                <div className="text-lg font-bold text-destructive">
                  {stats.dossiersEnRetard}
                </div>
              </div>
            </div>

            {/* Total actions */}
            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-2 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground font-medium">Total actions</span>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {stats.totalActions}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </Link>
  );
}
