/**
 * UnifiedWorkspace - Interface unifiée sans header
 * Tous les modules accessibles via onglets sur une seule page
 * Onglets réorganisables via drag-and-drop (sauf Accueil)
 * 
 * Support URL: ?tab=XXX pour navigation directe vers un onglet
 * 
 * REFACTORED: Split into sub-components (Phase 2)
 * - WorkspaceTabBar: DnD tab bar
 * - WorkspaceTabContent: All tab content panels
 * - ProfileMenu: User profile dropdown
 * - LogoutOverlay: Logout animation
 */

import { lazy, Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Home, BarChart3, ShoppingCart, 
  Users, Headphones,
  Loader2, Shield, FolderOpen, Kanban,
} from 'lucide-react';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { MainHeader } from '@/components/navigation/MainHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { filterWorkspaceTabs, isWorkspaceTabVisible } from '@/lib/filterNavigationByPermissions';
import { useModuleLabels } from '@/hooks/useModuleLabels';

import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';


// Sub-components (Phase 2 split)
import { LogoutOverlay } from '@/components/unified/workspace/LogoutOverlay';
import { WorkspaceTabBar } from '@/components/unified/workspace/WorkspaceTabBar';
import { WorkspaceTabContent } from '@/components/unified/workspace/WorkspaceTabContent';
import type { TabConfig, UnifiedTab } from '@/components/unified/workspace/types';
import { DEFAULT_TAB_ORDER } from '@/components/unified/workspace/types';

// Providers nécessaires
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { SecondaryFiltersProvider } from '@/apogee-connect/contexts/SecondaryFiltersContext';

// Lazy loaded for franchiseur route
const FranchiseurView = lazy(() => import('@/components/unified/views/FranchiseurView'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function UnifiedWorkspaceContent() {
  const { isLoggingOut } = useAuthCore();
  const { globalRole, isFranchiseur, hasModule, hasModuleOption } = usePermissions();
  const { isImpersonating, isRealUserImpersonation } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Support URL ?tab=XXX pour navigation directe
  const urlTab = searchParams.get('tab') as UnifiedTab | null;
  const [activeTab, setActiveTabState] = useSessionState<UnifiedTab>('unified_workspace_tab', urlTab || 'accueil');
  
  // Synchroniser l'URL quand l'onglet change en préservant les autres params (adminTab, adminView, etc.)
  const setActiveTab = useCallback((tab: UnifiedTab) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(searchParams);

    if (tab === 'accueil') {
      next.delete('tab');
      next.delete('adminTab');
      next.delete('adminView');
    } else {
      next.set('tab', tab);
    }

    setSearchParams(next, { replace: true });
  }, [searchParams, setActiveTabState, setSearchParams]);
  
  // Sync depuis URL
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab, activeTab, setActiveTabState]);
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();
  
  // IMPERSONATION: Utiliser le rôle réel pour certaines permissions
  const realIsPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
  
  // Pour l'affichage des onglets, utiliser le rôle EFFECTIF (impersonné)
  const effectiveGlobalRole = effectiveAuth.globalRole;
  const effectiveIsPlatformAdmin = effectiveGlobalRole === 'superadmin' || effectiveGlobalRole === 'platform_admin';
  
  const { getShortLabel } = useModuleLabels();

  // Configuration des onglets avec permissions — labels dynamiques depuis le registre
  const allTabs: TabConfig[] = useMemo(() => [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'pilotage', label: getShortLabel('pilotage', 'Pilotage'), icon: BarChart3, requiresOption: { module: 'pilotage.statistiques' }, altModules: ['pilotage.agence'] },
    { id: 'commercial', label: getShortLabel('commercial', 'Commercial'), icon: ShoppingCart, requiresOption: { module: 'prospection' }, altModules: ['pilotage.agence', 'commercial.realisations', 'commercial.prospects', 'commercial.social'] },
    { id: 'organisation', label: getShortLabel('organisation', 'Organisation'), icon: Users, requiresOption: { module: 'organisation.salaries' }, altModules: ['organisation.parc', 'organisation.apporteurs', 'organisation.plannings', 'organisation.reunions', 'pilotage.agence'] },
    { id: 'documents', label: getShortLabel('mediatheque', 'Documents'), icon: FolderOpen, requiresOption: { module: 'mediatheque.documents' } },
    { id: 'support', label: getShortLabel('support', 'Support'), icon: Headphones },
    { id: 'ticketing', label: 'Ticketing', icon: Kanban, requiresOption: { module: 'ticketing' } },
    { id: 'admin', label: getShortLabel('admin', 'Admin'), icon: Shield, requiresOption: { module: 'admin_plateforme' } },
  ], [getShortLabel]);
  
  // Tab accessibility checks — centralized via filterNavigationByPermissions
  const permCheckers = useMemo(() => ({
    hasModule: hasModule as (key: any) => boolean,
    hasModuleOption: hasModuleOption as (key: any, opt: string) => boolean,
    isPlatformAdmin: effectiveIsPlatformAdmin,
  }), [hasModule, hasModuleOption, effectiveIsPlatformAdmin]);

  const isTabAccessible = useCallback((tab: TabConfig): boolean => {
    if (!tab.requiresOption) return true;
    if (realIsPlatformAdmin) return true;
    return isWorkspaceTabVisible(tab, permCheckers);
  }, [realIsPlatformAdmin, permCheckers]);
  
  const isTabVisuallyDisabled = useCallback((tab: TabConfig): boolean => {
    if (isRealUserImpersonation) return !isWorkspaceTabVisible(tab, permCheckers);
    return !isTabAccessible(tab);
  }, [isRealUserImpersonation, permCheckers, isTabAccessible]);
  
  // Filter tabs: hide inaccessible tabs entirely (not greyed out)
  const visibleTabs = useMemo(() => 
    filterWorkspaceTabs(allTabs, permCheckers, realIsPlatformAdmin),
    [allTabs, permCheckers, realIsPlatformAdmin]
  );

  // Onglets dans l'ordre fixe DEFAULT_TAB_ORDER
  const sortedTabs = useMemo(() => {
    const accueilTab = visibleTabs.find(t => t.id === 'accueil')!;
    const otherTabs = visibleTabs.filter(t => t.id !== 'accueil');
    const sorted = [...otherTabs].sort((a, b) => {
      const indexA = DEFAULT_TAB_ORDER.indexOf(a.id);
      const indexB = DEFAULT_TAB_ORDER.indexOf(b.id);
      return indexA - indexB;
    });
    return [accueilTab, ...sorted];
  }, [visibleTabs]);
  
  // Effective N0 user check
  const effectiveIsN0User = !effectiveGlobalRole || effectiveGlobalRole === 'base_user';
  const isN0User = effectiveIsN0User;
  
  // Valid active tab (redirect if inaccessible)
  const activeTabConfig = sortedTabs.find(t => t.id === activeTab);
  const isActiveTabAccessible = activeTabConfig && isTabAccessible(activeTabConfig);
  const validActiveTab = useMemo(() => {
    if (!isActiveTabAccessible) return 'accueil';
    return activeTab;
  }, [activeTab, isActiveTabAccessible]);
  
  useEffect(() => {
    if (validActiveTab !== activeTab) setActiveTab(validActiveTab);
  }, [validActiveTab, activeTab, setActiveTab]);
  
  // Page title
  useEffect(() => {
    const config = sortedTabs.find(t => t.id === validActiveTab);
    document.title = `${config?.label || 'Accueil'} - HelpConfort`;
  }, [validActiveTab, sortedTabs]);
  
  const tabButtonClass = `
    relative px-4 py-3 rounded-t-xl border-2 border-b-0 transition-all duration-300 whitespace-nowrap shrink-0 min-w-0
    data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/50 data-[state=inactive]:text-muted-foreground 
    data-[state=inactive]:hover:bg-primary/10 data-[state=inactive]:hover:border-primary/40
    data-[state=inactive]:hover:scale-105 data-[state=inactive]:hover:-translate-y-0.5 data-[state=inactive]:hover:shadow-md
    data-[state=active]:bg-background data-[state=active]:border-primary/50
    data-[state=active]:z-20 data-[state=active]:-mb-[2px] data-[state=active]:pb-[calc(0.75rem+2px)] data-[state=active]:scale-[1.02]
  `;
  
  const { mode: navMode } = useNavigationMode();
  
  const topPadding = (isImpersonating || isRealUserImpersonation) ? 'pt-10' : '';
  
  // Vue Franchiseur
  if (isFranchiseur && !realIsPlatformAdmin) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <FranchiseurView />
      </Suspense>
    );
  }

  return (
    <AiUnifiedProvider>
      <TooltipProvider delayDuration={0}>
        {isLoggingOut && <LogoutOverlay />}
        
        <div className={`min-h-screen bg-background ${topPadding}`}>
          <Tabs value={validActiveTab} onValueChange={(v) => setActiveTab(v as UnifiedTab)} className="flex flex-col h-screen">
            {navMode === 'header' ? (
              <MainHeader
                activeTab={validActiveTab}
                setActiveTab={setActiveTab}
                visibleTabs={visibleTabs}
                tabButtonClass={tabButtonClass}
              />
            ) : (
              <WorkspaceTabBar
                tabs={sortedTabs}
                activeTab={validActiveTab}
                tabButtonClass={tabButtonClass}
                isTabAccessible={isTabAccessible}
                isTabVisuallyDisabled={isTabVisuallyDisabled}
                setActiveTab={setActiveTab}
              />
            )}
            
            <WorkspaceTabContent isN0User={isN0User} />
          </Tabs>
        </div>
        
        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        
      </TooltipProvider>
    </AiUnifiedProvider>
  );
}

function UnifiedWorkspaceAuth() {
  const { isAuthenticated, isAuthLoading } = useAuthCore();
  
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
