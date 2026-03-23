import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { toast } from '@/hooks/use-toast';
import { ConditionalRender } from '@/components/PermissionGuard';
import { cn } from '@/lib/utils';

type FilterType = 'all' | 'late' | 'a_facturer' | 'devis_a_faire' | 'relance_technicien' | 'a_planifier_tvx' | 'a_commander';

export function ActionsAMenerTab() {
  const { isAgencyReady, currentAgency } = useAgency();
  const { config, isLoading: isLoadingConfig } = useActionsConfig();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  const filteredActions = useMemo(() => {
    if (!actions) return [];
    if (activeFilter === 'all') return actions;
    if (activeFilter === 'late') return actions.filter(a => a.isLate);
    return actions.filter(a => a.actionType === activeFilter);
  }, [actions, activeFilter]);

  // Notification automatique pour les actions qui vont passer en retard dans J+1
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

  const handleOpenDossier = (projectId: number) => {
    setSelectedProjectId(projectId);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Tableau des actions */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-background to-muted/20">
          <CardHeader className="py-3 px-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Liste des actions</CardTitle>
                <CardDescription className="text-xs hidden sm:block">
                  Triées par urgence
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Stats inline - clickable filters */}
                {!isLoading && actions && (
                  <>
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all cursor-pointer hover:scale-105",
                        activeFilter === 'all' 
                          ? "border-primary bg-primary/20 ring-2 ring-primary/30" 
                          : "border-primary/20 bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">Total</span>
                      <span className="text-xs font-bold text-primary">{actions.length}</span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('late')}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all cursor-pointer hover:scale-105",
                        activeFilter === 'late' 
                          ? "border-destructive bg-destructive/20 ring-2 ring-destructive/30" 
                          : "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">Retard</span>
                      <span className="text-xs font-bold text-destructive">
                        {actions.filter(a => a.isLate).length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('a_facturer')}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all cursor-pointer hover:scale-105",
                        activeFilter === 'a_facturer' 
                          ? "border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/30" 
                          : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">Factures</span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {actions.filter(a => a.actionType === 'a_facturer').length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('devis_a_faire')}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all cursor-pointer hover:scale-105",
                        activeFilter === 'devis_a_faire' 
                          ? "border-blue-500 bg-blue-500/20 ring-2 ring-blue-500/30" 
                          : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">Devis</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                        {actions.filter(a => a.actionType === 'devis_a_faire').length}
                      </span>
                    </button>
                    <button
                      onClick={() => setActiveFilter('relance_technicien')}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all cursor-pointer hover:scale-105",
                        activeFilter === 'relance_technicien' 
                          ? "border-purple-500 bg-purple-500/20 ring-2 ring-purple-500/30" 
                          : "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40"
                      )}
                    >
                      <span className="text-[10px] text-muted-foreground">Relances</span>
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                        {actions.filter(a => a.actionType === 'relance_technicien').length}
                      </span>
                    </button>
                  </>
                )}
                <ConditionalRender minRole="franchisee_admin">
                  <ActionsConfigDialog />
                </ConditionalRender>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || isLoadingConfig ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                <AlertCircle className="w-10 h-10 mx-auto mb-3" />
                <p className="text-sm">Erreur lors du chargement</p>
              </div>
            ) : (
              <ActionsAMenerTable
                actions={filteredActions}
                onOpenDossier={handleOpenDossier}
              />
            )}
          </CardContent>
        </Card>
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
