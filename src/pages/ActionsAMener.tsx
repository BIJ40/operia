import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, BellRing } from 'lucide-react';
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
import { ConditionalRender } from '@/components/PermissionGuard';

import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { useSessionState } from '@/hooks/useSessionState';

function ActionsAMenerContent() {
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // États des filtres avec persistance sessionStorage
  const [actionTypeFilter, setActionTypeFilter] = useSessionState<ActionType | 'all'>('actions-actionTypeFilter', 'all');
  const [clientFilter, setClientFilter] = useSessionState<string>('actions-clientFilter', 'all');
  const [statusFilter, setStatusFilter] = useSessionState<'all' | 'late'>('actions-statusFilter', 'all');

  const { data: actions, isLoading, error } = useQuery({
    queryKey: ['actions-a-mener', currentAgency?.id, config],
    enabled: isAgencyReady && !isLoadingConfig,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const apiData = await DataService.loadAllData(true, false, currentAgency?.id);
      
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
      <div className="container mx-auto px-4 py-8 max-w-[1536px]">
        <div className="space-y-6">
          {/* En-tête avec PageHeader */}
          <div className="flex items-center justify-between">
            <PageHeader
              title="Actions à mener"
              subtitle="Dossiers nécessitant une action de votre part"
              backTo={ROUTES.agency.index}
              backLabel="Mon Agence"
            />
            {/* Configuration visible uniquement pour les admins */}
            <ConditionalRender minRole="franchisee_admin">
              <ActionsConfigDialog />
            </ConditionalRender>
          </div>


          {/* Statistiques rapides */}
          {!isLoading && actions && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="group rounded-xl border border-helpconfort-blue/20 p-4
                bg-gradient-to-br from-white to-helpconfort-blue/5
                shadow-sm transition-all duration-300
                hover:to-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total actions</p>
                <div className="text-2xl font-bold text-helpconfort-blue">{filteredActions.length}</div>
                {activeFiltersCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">sur {actions.length} total</p>
                )}
              </div>
              <div className="group rounded-xl border border-helpconfort-blue/15 p-4
                bg-gradient-to-b from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300
                hover:from-helpconfort-blue/15 hover:shadow-lg hover:-translate-y-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">En retard</p>
                <div className="text-2xl font-bold text-destructive">
                  {filteredActions.filter(a => a.isLate).length}
                </div>
              </div>
              <div className="group rounded-xl border border-helpconfort-blue/15 p-4 border-l-4 border-l-helpconfort-blue/40
                bg-gradient-to-r from-helpconfort-blue/5 to-white
                shadow-sm transition-all duration-300
                hover:from-helpconfort-blue/15 hover:border-l-helpconfort-blue hover:shadow-lg hover:-translate-y-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Factures à faire</p>
                <div className="text-2xl font-bold text-helpconfort-blue">
                  {filteredActions.filter(a => a.actionType === 'a_facturer' && a.isLate).length}
                </div>
              </div>
              <div className="group rounded-xl border border-helpconfort-blue/15 p-4
                bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-helpconfort-blue/10 via-white to-white
                shadow-sm transition-all duration-300
                hover:from-helpconfort-blue/20 hover:shadow-lg hover:-translate-y-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">Relances technicien</p>
                <div className="text-2xl font-bold text-helpconfort-blue">
                  {filteredActions.filter(a => a.actionType === 'relance_technicien' && a.isLate).length}
                </div>
              </div>
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
