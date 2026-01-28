/**
 * UnifiedWorkspace - Interface unifiée sans header
 * Tous les modules accessibles via onglets sur une seule page
 * Onglets réorganisables via drag-and-drop (sauf Accueil)
 */

import { lazy, Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { 
  Home, Building2, BarChart3, ClipboardList, 
  Car, MoreHorizontal, Ticket, HelpCircle,
  Loader2, BookOpen
} from 'lucide-react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy 
} from '@dnd-kit/sortable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useRoleSimulator } from '@/contexts/RoleSimulatorContext';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { DraggableTab } from '@/components/unified/DraggableTab';
import { SimulationBanner } from '@/components/layout/SimulationBanner';

// Providers nécessaires
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { SecondaryFiltersProvider } from '@/apogee-connect/contexts/SecondaryFiltersContext';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';

// Lazy loaded tab contents
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));
const AgencyTabContent = lazy(() => import('@/components/unified/tabs/AgencyTabContent'));
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const CollaborateursTabContent = lazy(() => import('@/components/unified/tabs/CollaborateursTabContent'));
const VehiculesTabContent = lazy(() => import('@/components/unified/tabs/VehiculesTabContent'));
const DiversTabContent = lazy(() => import('@/components/unified/tabs/DiversTabContent'));
const GuidesTabContent = lazy(() => import('@/components/unified/tabs/GuidesTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));
const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));

type UnifiedTab = 
  | 'accueil' 
  | 'agence' 
  | 'stats' 
  | 'salaries' 
  | 'parc' 
  | 'divers' 
  | 'guides'
  | 'ticketing' 
  | 'aide';

interface TabConfig {
  id: UnifiedTab;
  label: string;
  icon: React.ElementType;
  requiresOption?: { module: string; option?: string };
}

// Ordre par défaut des onglets (hors Accueil qui est toujours premier)
const DEFAULT_TAB_ORDER: UnifiedTab[] = ['agence', 'stats', 'salaries', 'parc', 'divers', 'guides', 'ticketing', 'aide'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function UnifiedWorkspaceContent() {
  const { globalRole } = useAuth();
  const { isImpersonating } = useImpersonation();
  const { isSimulating, simulatedView, viewConfig } = useRoleSimulator();
  const { hasModule, hasModuleOption } = useEffectiveModules();
  const [activeTab, setActiveTab] = useSessionState<UnifiedTab>('unified_workspace_tab', 'accueil');
  const [tabOrder, setTabOrder] = useSessionState<UnifiedTab[]>('unified_workspace_tab_order', DEFAULT_TAB_ORDER);
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();
  
  // Utiliser le rôle simulé ou réel
  const effectiveRole = isSimulating ? viewConfig.simulatedRole : globalRole;
  const isPlatformAdmin = !isSimulating && (globalRole === 'superadmin' || globalRole === 'platform_admin');
  
  // Onglets exclus pour la vue Franchiseur
  const franchiseurExcludedTabs: UnifiedTab[] = ['agence', 'salaries', 'parc'];
  
  // Configuration des onglets avec permissions
  const allTabs: TabConfig[] = useMemo(() => [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'agence', label: 'Mon agence', icon: Building2 },
    { id: 'stats', label: 'Stats', icon: BarChart3, requiresOption: { module: 'pilotage_agence', option: 'stats_hub' } },
    { id: 'salaries', label: 'Salariés', icon: ClipboardList },
    { id: 'parc', label: 'Parc', icon: Car },
    { id: 'divers', label: 'Divers', icon: MoreHorizontal },
    { id: 'guides', label: 'Guides', icon: BookOpen, requiresOption: { module: 'help_academy' } },
    { id: 'ticketing', label: 'Ticketing', icon: Ticket, requiresOption: { module: 'apogee_tickets' } },
    { id: 'aide', label: 'Aide', icon: HelpCircle },
  ], []);
  
  // Filtrer les onglets visibles selon permissions et simulation
  const visibleTabs = useMemo(() => {
    return allTabs.filter(tab => {
      // En mode franchiseur, exclure certains onglets
      if (simulatedView === 'franchiseur' && franchiseurExcludedTabs.includes(tab.id)) {
        return false;
      }
      
      if (!tab.requiresOption) return true;
      if (isPlatformAdmin) return true;
      
      // Pour N0 simulé avec projet, montrer ticketing
      if (simulatedView === 'n0_project' && tab.id === 'ticketing') {
        return true;
      }
      
      // Pour N0 simple, cacher ticketing
      if (simulatedView === 'n0_simple' && tab.id === 'ticketing') {
        return false;
      }
      
      const { module, option } = tab.requiresOption;
      if (option) {
        return hasModuleOption(module as any, option);
      }
      return hasModule(module as any);
    });
  }, [allTabs, isPlatformAdmin, hasModule, hasModuleOption, simulatedView]);
  
  // Onglets triés selon l'ordre personnalisé (Accueil toujours premier)
  const sortedTabs = useMemo(() => {
    const accueilTab = visibleTabs.find(t => t.id === 'accueil')!;
    const otherTabs = visibleTabs.filter(t => t.id !== 'accueil');
    
    // Trier selon tabOrder, en gardant les onglets non présents dans l'ordre à la fin
    const sorted = [...otherTabs].sort((a, b) => {
      const indexA = tabOrder.indexOf(a.id);
      const indexB = tabOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return [accueilTab, ...sorted];
  }, [visibleTabs, tabOrder]);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    // Ne pas permettre de déplacer Accueil
    if (active.id === 'accueil' || over.id === 'accueil') return;
    
    const oldIndex = tabOrder.indexOf(active.id as UnifiedTab);
    const newIndex = tabOrder.indexOf(over.id as UnifiedTab);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      setTabOrder(arrayMove(tabOrder, oldIndex, newIndex));
    }
  }, [tabOrder, setTabOrder]);
  
  // Si l'onglet actif n'est plus visible, revenir à accueil
  const validActiveTab = sortedTabs.some(t => t.id === activeTab) ? activeTab : 'accueil';
  
  // Mettre à jour le titre de la page selon l'onglet actif
  useEffect(() => {
    const activeTabConfig = sortedTabs.find(t => t.id === validActiveTab);
    const tabLabel = activeTabConfig?.label || 'Accueil';
    document.title = `${tabLabel} - HelpConfort`;
  }, [validActiveTab, sortedTabs]);
  
  const tabButtonClass = `
    relative px-5 py-3 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap
    data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/50 data-[state=inactive]:text-muted-foreground 
    data-[state=inactive]:hover:bg-primary/10 data-[state=inactive]:hover:border-primary/40
    data-[state=inactive]:hover:scale-105 data-[state=inactive]:hover:-translate-y-0.5 data-[state=inactive]:hover:shadow-md
    data-[state=active]:bg-background data-[state=active]:border-primary/50 data-[state=active]:border-b-background
    data-[state=active]:z-20 data-[state=active]:-mb-[2px] data-[state=active]:scale-[1.02]
  `;
  
  // IDs pour le sortable context (exclure accueil)
  const sortableIds = sortedTabs.filter(t => t.id !== 'accueil').map(t => t.id);
  
  // Calculer le padding top selon les bandeaux actifs
  const topPadding = isSimulating ? 'pt-10' : isImpersonating ? 'pt-10' : '';
  
  return (
    <AiUnifiedProvider>
      <TooltipProvider delayDuration={0}>
        {/* Bandeau de simulation admin */}
        <SimulationBanner />
        
        <div className={`min-h-screen bg-background ${topPadding}`}>
          <Tabs value={validActiveTab} onValueChange={(v) => setActiveTab(v as UnifiedTab)} className="flex flex-col h-screen">
            {/* Tab bar fixe en haut */}
            <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
              <div className="container mx-auto max-w-7xl px-4 pt-3 pb-0">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <TabsList className="h-auto p-0 bg-transparent flex flex-wrap gap-1 items-end justify-start">
                    {/* Onglet Accueil - non draggable */}
                    {sortedTabs[0] && (
                      <button
                        onClick={() => setActiveTab('accueil')}
                        data-state={validActiveTab === 'accueil' ? 'active' : 'inactive'}
                        className={tabButtonClass}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm transition-transform group-hover:scale-110">
                            <Home className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold tracking-tight">Accueil</span>
                        </div>
                      </button>
                    )}
                    
                    {/* Onglets sortables */}
                    <SortableContext items={sortableIds} strategy={horizontalListSortingStrategy}>
                      {sortedTabs.slice(1).map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <DraggableTab
                            key={tab.id}
                            id={tab.id}
                            isActive={validActiveTab === tab.id}
                            isDraggable={true}
                            onClick={() => setActiveTab(tab.id)}
                            className={tabButtonClass}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-110">
                                <Icon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="text-sm font-semibold tracking-tight">{tab.label}</span>
                            </div>
                          </DraggableTab>
                        );
                      })}
                    </SortableContext>
                  </TabsList>
                </DndContext>
              </div>
              {/* Ligne de bordure qui se connecte aux onglets */}
              <div className="container mx-auto max-w-7xl px-4">
                <div className="border-t-2 border-primary/50 bg-background"></div>
              </div>
            </div>
            
            {/* Contenu des onglets */}
            <main id="main-content" className="flex-1 overflow-auto" role="main">
              <Suspense fallback={<LoadingFallback />}>
                <TabsContent value="accueil" className="mt-0 h-full">
                  <DashboardContent />
                </TabsContent>
                
                <TabsContent value="agence" className="mt-0">
                  <AgencyTabContent />
                </TabsContent>
                
                <TabsContent value="stats" className="mt-0">
                  <StatsHubProvider>
                    <StatsTabContent />
                  </StatsHubProvider>
                </TabsContent>
                
                <TabsContent value="salaries" className="mt-0">
                  <CollaborateursTabContent />
                </TabsContent>
                
                <TabsContent value="parc" className="mt-0">
                  <VehiculesTabContent />
                </TabsContent>
                
                <TabsContent value="divers" className="mt-0">
                  <DiversTabContent />
                </TabsContent>
                
                <TabsContent value="guides" className="mt-0">
                  <GuidesTabContent />
                </TabsContent>
                
                <TabsContent value="ticketing" className="mt-0">
                  <TicketingTabContent />
                </TabsContent>
                
                <TabsContent value="aide" className="mt-0">
                  <SupportTabContent />
                </TabsContent>
              </Suspense>
            </main>
          </Tabs>
        </div>
        
        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </TooltipProvider>
    </AiUnifiedProvider>
  );
}

function UnifiedWorkspaceAuth() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  
  // Show loading state while auth is initializing
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login form for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950/10 via-background to-indigo-950/10 p-4">
        <LoginFormCard />
      </div>
    );
  }
  
  return <UnifiedWorkspaceContent />;
}

export default function UnifiedWorkspace() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <UnifiedWorkspaceAuth />
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
