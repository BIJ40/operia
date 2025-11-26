import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { buildActionsAMener } from '@/apogee-connect/utils/actionsAMenerCalculations';
import { ActionsAMenerTable } from '@/apogee-connect/components/ActionsAMenerTable';
import { ActionsConfigDialog } from '@/apogee-connect/components/ActionsConfigDialog';
import { useActionsConfig } from '@/apogee-connect/hooks/useActionsConfig';
import { DossierDetailDialog } from '@/apogee-connect/components/DossierDetailDialog';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';

function ActionsAMenerContent() {
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

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

  const handleOpenDossier = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  return (
    <Layout showHeader showSidebar sidebarType="actions">
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
            <ActionsConfigDialog />
          </div>

          {/* Statistiques rapides */}
          {!isLoading && actions && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{actions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">En retard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {actions.filter(a => a.isLate).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Devis à relancer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {actions.filter(a => a.actionType === 'devis_envoye' && a.isLate).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Factures à faire</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {actions.filter(a => a.actionType === 'a_facturer' && a.isLate).length}
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
            <CardContent>
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
                <ActionsAMenerTable
                  actions={actions || []}
                  onOpenDossier={handleOpenDossier}
                />
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
    </Layout>
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
