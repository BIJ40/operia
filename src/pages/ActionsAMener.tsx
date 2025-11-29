import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BellRing, AlertTriangle } from 'lucide-react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { buildActionsAMener } from '@/apogee-connect/utils/actionsAMenerCalculations';
import { ActionsAMenerTable } from '@/apogee-connect/components/ActionsAMenerTable';
import { ActionsConfigDialog } from '@/apogee-connect/components/ActionsConfigDialog';
import { ActionsAMenerFilters } from '@/apogee-connect/components/ActionsAMenerFilters';
import { useActionsConfig } from '@/apogee-connect/hooks/useActionsConfig';
import { DossierDetailDialog } from '@/apogee-connect/components/DossierDetailDialog';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ActionType } from '@/apogee-connect/types/actions';
import { toast } from '@/hooks/use-toast';
import { SCOPE_SLUGS, PERMISSION_LEVELS } from '@/types/permissions';
import { ConditionalRender } from '@/components/PermissionGuard';

function ActionsAMenerContent() {
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // États des filtres
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionType | 'all'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'late'>('all');

  const { data: actions, isLoading, error } = useQuery({
    queryKey: ['actions-a-mener', currentAgency?.id, config],
    enabled: isAgencyReady && !isLoadingConfig,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true);
      
      const actionsList = buildActionsAMener(
        apiData.projects || [],
        apiData.devis || [],
        apiData.factures || [],
        apiData.clients || [],
        config
      );
      
      return actionsList;
    },
  });

  // Notification automatique pour les actions qui vont passer en retard dans J+1
  // Affichée une seule fois après 5 minutes de session active
  useEffect(() => {
    if (!actions) return;
    
    const notificationShown = sessionStorage.getItem('actionsNotificationShown');
    if (notificationShown === 'true') return;
    
    let sessionStart = sessionStorage.getItem('sessionStartTime');
    if (!sessionStart) {
      sessionStorage.setItem('sessionStartTime', Date.now().toString());
      return;
    }
    
    const timeElapsed = Date.now() - parseInt(sessionStart);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeElapsed >= fiveMinutes) {
      const actionsDueSoon = actions.filter(action => action.isDueSoon);
      
      if (actionsDueSoon.length > 0) {
        toast({
          title: "⚠️ Actions urgentes à venir",
          description: `${actionsDueSoon.length} action${actionsDueSoon.length > 1 ? 's' : ''} ${actionsDueSoon.length > 1 ? 'vont' : 'va'} passer en retard dans les 24h`,
        });
        sessionStorage.setItem('actionsNotificationShown', 'true');
      }
    }
  }, [actions]);

  // Filtrage des actions
  const filteredActions = useMemo(() => {
    if (!actions) return [];
    
    return actions.filter(action => {
      // Filtre par type d'action
      if (actionTypeFilter !== 'all' && action.actionType !== actionTypeFilter) {
        return false;
      }
      
      // Filtre par client
      if (clientFilter !== 'all' && action.clientName !== clientFilter) {
        return false;
      }
      
      // Filtre par statut (en retard uniquement)
      if (statusFilter === 'late' && !action.isLate) {
        return false;
      }
      
      return true;
    });
  }, [actions, actionTypeFilter, clientFilter, statusFilter]);

  // Liste des clients disponibles pour le filtre
  const availableClients = useMemo(() => {
    if (!actions) return [];
    const clients = Array.from(new Set(actions.map(a => a.clientName)));
    return clients.sort();
  }, [actions]);

  // Nombre de filtres actifs
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (actionTypeFilter !== 'all') count++;
    if (clientFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [actionTypeFilter, clientFilter, statusFilter]);

  const handleResetFilters = () => {
    setActionTypeFilter('all');
    setClientFilter('all');
    setStatusFilter('all');
  };

  const handleOpenDossier = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-6">
          {/* En-tête */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-helpconfort-blue-dark bg-clip-text text-transparent">
                Actions à mener
              </h1>
              <p className="text-muted-foreground mt-2">
                Dossiers nécessitant une action de votre part
              </p>
            </div>
            {/* Configuration visible uniquement si niveau >= 3 (Gestion) */}
            <ConditionalRender scope={SCOPE_SLUGS.ACTIONS_A_MENER} requiredLevel={PERMISSION_LEVELS.MANAGE}>
              <ActionsConfigDialog />
            </ConditionalRender>
          </div>

          {/* Bandeau en cours d'élaboration */}
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Page en cours d'élaboration
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Cette fonctionnalité est actuellement en développement. Certaines données ou comportements peuvent être incomplets.
                </p>
              </div>
            </div>
          </div>

          {/* Statistiques rapides */}
          {!isLoading && actions && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredActions.length}</div>
                  {activeFiltersCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      sur {actions.length} total
                    </p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">En retard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {filteredActions.filter(a => a.isLate).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Factures à faire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredActions.filter(a => a.actionType === 'a_facturer' && a.isLate).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Relances technicien</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {filteredActions.filter(a => a.actionType === 'relance_technicien' && a.isLate).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tableau des actions */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des actions</CardTitle>
              <CardDescription>
                Actions triées par urgence (les plus anciennes en premier)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading || isLoadingConfig ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-destructive">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p>Erreur lors du chargement des actions</p>
                </div>
              ) : (
                <>
                  <ActionsAMenerFilters
                    actionTypeFilter={actionTypeFilter}
                    onActionTypeChange={setActionTypeFilter}
                    clientFilter={clientFilter}
                    onClientFilterChange={setClientFilter}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    availableClients={availableClients}
                    activeFiltersCount={activeFiltersCount}
                    onResetFilters={handleResetFilters}
                  />
                  
                  <ActionsAMenerTable
                    actions={filteredActions}
                    onOpenDossier={handleOpenDossier}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedProjectId && (
        <DossierDetailDialog
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
          projectId={selectedProjectId}
        />
      )}
    </>
  );
}

export default function ActionsAMener() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <ActionsAMenerContent />
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
