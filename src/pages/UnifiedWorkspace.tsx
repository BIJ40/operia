/**
 * UnifiedWorkspace - Interface unifiée sans header
 * Tous les modules accessibles via onglets sur une seule page
 * 
 * Onglets:
 * - ACCUEIL (dashboard)
 * - Mon agence
 * - Statistiques
 * - Mes apporteurs
 * - Mes collaborateurs
 * - Plannings
 * - Véhicules
 * - Divers
 * - TICKETING (si accès)
 * - SUPPORT
 */

import { lazy, Suspense, useMemo, useState } from 'react';
import { 
  Home, Building2, BarChart3, ClipboardList, 
  Car, MoreHorizontal, Ticket, HelpCircle,
  Loader2, BookOpen
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';

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
  const { hasModule, hasModuleOption } = useEffectiveModules();
  const [activeTab, setActiveTab] = useSessionState<UnifiedTab>('unified_workspace_tab', 'accueil');
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();
  
  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
  
  // Configuration des onglets avec permissions
  const tabs: TabConfig[] = useMemo(() => {
    const baseTabs: TabConfig[] = [
      { id: 'accueil', label: 'Accueil', icon: Home },
      { id: 'agence', label: 'Mon agence', icon: Building2 },
      { id: 'stats', label: 'Stats', icon: BarChart3, requiresOption: { module: 'pilotage_agence', option: 'stats_hub' } },
      { id: 'salaries', label: 'Salariés', icon: ClipboardList },
      { id: 'parc', label: 'Parc', icon: Car },
      { id: 'divers', label: 'Divers', icon: MoreHorizontal },
      { id: 'guides', label: 'Guides', icon: BookOpen, requiresOption: { module: 'help_academy' } },
      { id: 'ticketing', label: 'Ticketing', icon: Ticket, requiresOption: { module: 'apogee_tickets' } },
      { id: 'aide', label: 'Aide', icon: HelpCircle },
    ];
    
    return baseTabs.filter(tab => {
      if (!tab.requiresOption) return true;
      if (isPlatformAdmin) return true;
      
      const { module, option } = tab.requiresOption;
      if (option) {
        return hasModuleOption(module as any, option);
      }
      return hasModule(module as any);
    });
  }, [isPlatformAdmin, hasModule, hasModuleOption]);
  
  // Si l'onglet actif n'est plus visible, revenir à accueil
  const validActiveTab = tabs.some(t => t.id === activeTab) ? activeTab : 'accueil';
  
  const tabButtonClass = `
    relative px-4 py-2.5 rounded-t-xl border-2 border-b-0 transition-all duration-200 whitespace-nowrap
    data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground 
    data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
    data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md 
    data-[state=active]:z-10 data-[state=active]:-mb-[2px]
  `;
  
  return (
    <AiUnifiedProvider>
      <TooltipProvider delayDuration={0}>
        <div className={`min-h-screen bg-background ${isImpersonating ? 'pt-10' : ''}`}>
          <Tabs value={validActiveTab} onValueChange={(v) => setActiveTab(v as UnifiedTab)} className="flex flex-col h-screen">
            {/* Tab bar fixe en haut */}
            <div className="sticky top-0 z-50 bg-background border-b border-border">
              <div className="px-2 sm:px-4 pt-2 pb-0">
                <TabsList className="h-auto p-0 bg-transparent flex flex-wrap gap-1 items-end justify-start">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger 
                        key={tab.id}
                        value={tab.id} 
                        className={tabButtonClass}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs font-semibold tracking-tight">{tab.label}</span>
                        </div>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
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
