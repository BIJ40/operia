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
  Loader2, Shield, FolderOpen,
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { SidebarChat } from '@/components/chat/SidebarChat';

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
  const { globalRole, isFranchiseur } = usePermissions();
  const { isImpersonating, isRealUserImpersonation } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  const { hasModule, hasModuleOption } = useEffectiveModules();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tabOrder, setTabOrder] = useSessionState<UnifiedTab[]>('unified_workspace_tab_order', DEFAULT_TAB_ORDER);
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Support URL ?tab=XXX pour navigation directe
  const urlTab = searchParams.get('tab') as UnifiedTab | null;
  const [activeTab, setActiveTabState] = useSessionState<UnifiedTab>('unified_workspace_tab', urlTab || 'accueil');
  
  // Synchroniser l'URL quand l'onglet change
  const setActiveTab = useCallback((tab: UnifiedTab) => {
    setActiveTabState(tab);
    if (tab === 'accueil') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  }, [setActiveTabState, setSearchParams]);
  
  // Sync depuis URL au mount
  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    }
  }, [urlTab]);
  
  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();
  
  // IMPERSONATION: Utiliser le rôle réel pour certaines permissions
  const realIsPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
  
  // Pour l'affichage des onglets, utiliser le rôle EFFECTIF (impersonné)
  const effectiveGlobalRole = effectiveAuth.globalRole;
  const effectiveIsPlatformAdmin = effectiveGlobalRole === 'superadmin' || effectiveGlobalRole === 'platform_admin';
  
  // Configuration des onglets avec permissions
  const allTabs: TabConfig[] = useMemo(() => [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'pilotage', label: 'Pilotage', icon: BarChart3, requiresOption: { module: 'pilotage.statistiques' }, altModules: ['pilotage.agence'] },
    { id: 'commercial', label: 'Commercial', icon: ShoppingCart, requiresOption: { module: 'prospection' }, altModules: ['pilotage.agence', 'commercial.realisations'] },
    { id: 'organisation', label: 'Organisation', icon: Users, requiresOption: { module: 'organisation.salaries' }, altModules: ['organisation.parc', 'organisation.apporteurs', 'organisation.plannings', 'organisation.reunions', 'pilotage.agence'] },
    { id: 'documents', label: 'Documents', icon: FolderOpen, requiresOption: { module: 'mediatheque.documents' } },
    { id: 'support', label: 'Support', icon: Headphones },
    { id: 'admin', label: 'Admin', icon: Shield, requiresOption: { module: 'admin_plateforme' } },
  ], []);
  
  // Tab accessibility checks
  const isTabAccessibleForEffectiveUser = useCallback((tab: TabConfig): boolean => {
    if (!tab.requiresOption) return true;
    if (effectiveIsPlatformAdmin) return true;
    
    const { module, option } = tab.requiresOption;
    if (option) {
      if (hasModuleOption(module as any, option)) return true;
    } else {
      if (hasModule(module as any)) return true;
    }
    if (tab.altModules) {
      for (const altModule of tab.altModules) {
        if (hasModule(altModule as any)) return true;
      }
    }
    return false;
  }, [effectiveIsPlatformAdmin, hasModule, hasModuleOption]);
  
  const isTabAccessible = useCallback((tab: TabConfig): boolean => {
    if (!tab.requiresOption) return true;
    if (realIsPlatformAdmin) return true;
    return isTabAccessibleForEffectiveUser(tab);
  }, [realIsPlatformAdmin, isTabAccessibleForEffectiveUser]);
  
  const isTabHidden = useCallback((tab: TabConfig): boolean => {
    if (tab.id === 'admin' && !realIsPlatformAdmin) return true;
    return false;
  }, [realIsPlatformAdmin]);
  
  const isTabVisuallyDisabled = useCallback((tab: TabConfig): boolean => {
    if (isRealUserImpersonation) return !isTabAccessibleForEffectiveUser(tab);
    return !isTabAccessible(tab);
  }, [isRealUserImpersonation, isTabAccessibleForEffectiveUser, isTabAccessible]);
  
  // Filtrer les onglets masqués
  const visibleTabs = useMemo(() => allTabs.filter(tab => !isTabHidden(tab)), [allTabs, isTabHidden]);

  // Auto-repair tab order
  useEffect(() => {
    const visibleIds = visibleTabs.filter(t => t.id !== 'accueil').map(t => t.id);
    const cleaned = tabOrder.filter(id => visibleIds.includes(id));
    const defaultVisible = DEFAULT_TAB_ORDER.filter(id => visibleIds.includes(id));
    const missingFromDefault = defaultVisible.filter(id => !cleaned.includes(id));
    const extraMissing = visibleIds.filter(id => !cleaned.includes(id) && !defaultVisible.includes(id));
    const next = [...cleaned, ...missingFromDefault, ...extraMissing];
    const isSame = next.length === tabOrder.length && next.every((v, i) => v === tabOrder[i]);
    if (!isSame) setTabOrder(next);
  }, [visibleTabs, tabOrder, setTabOrder]);
  
  // Onglets triés
  const sortedTabs = useMemo(() => {
    const accueilTab = visibleTabs.find(t => t.id === 'accueil')!;
    const otherTabs = visibleTabs.filter(t => t.id !== 'accueil');
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

  const sortableIds = useMemo(
    () => sortedTabs.filter(t => t.id !== 'accueil').map(t => t.id),
    [sortedTabs]
  );
  
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
            <WorkspaceTabBar
              sortedTabs={sortedTabs}
              sortableIds={sortableIds}
              activeTab={validActiveTab}
              tabButtonClass={tabButtonClass}
              isTabAccessible={isTabAccessible}
              isTabVisuallyDisabled={isTabVisuallyDisabled}
              setActiveTab={setActiveTab}
              setTabOrder={setTabOrder}
            />
            
            <WorkspaceTabContent isN0User={isN0User} />
          </Tabs>
        </div>
        
        <ImageModal />
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
        <SidebarChat />
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
