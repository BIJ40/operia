/**
 * UnifiedWorkspace - Interface unifiée avec sidebar latérale
 * Plus de header/onglets — navigation 100% sidebar
 */

import { lazy, Suspense, useMemo, useState, useCallback, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useSessionState } from '@/hooks/useSessionState';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import { useProfile } from '@/contexts/ProfileContext';
import { useStorageQuota } from '@/hooks/use-storage-quota';
import { useUserPresence } from '@/hooks/use-user-presence';
import { useConnectionLogger } from '@/hooks/use-connection-logger';
import { LoginFormCard } from '@/components/LoginFormCard';
import { LoginDialog } from '@/components/LoginDialog';
import { ImageModal } from '@/components/ImageModal';
import { AiUnifiedProvider } from '@/components/ai';
import { LogoutOverlay } from '@/components/unified/workspace/LogoutOverlay';
import { WorkspaceSidebar, type SidebarView, getRequiredPlan } from '@/components/unified/workspace/WorkspaceSidebar';
import { SidebarContentRouter } from '@/components/unified/workspace/SidebarContentRouter';
import { SubscriptionGuard } from '@/components/guards/SubscriptionGuard';
import { UpgradePrompt } from '@/components/pricing/UpgradePrompt';

// Providers
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
  const { globalRole, isFranchiseur } = usePermissionsBridge();
  const { isImpersonating, isRealUserImpersonation } = useImpersonation();
  const effectiveAuth = useEffectiveAuth();
  const { agence } = useProfile();
  const [loginOpen, setLoginOpen] = useState(false);

  const [activeView, setActiveView] = useSessionState<SidebarView>('workspace_sidebar_view', 'accueil');

  // Hooks for tracking
  useStorageQuota();
  useUserPresence();
  useConnectionLogger();

  const realIsPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';
  const effectiveGlobalRole = effectiveAuth.globalRole;
  const effectiveIsPlatformAdmin = effectiveGlobalRole === 'superadmin' || effectiveGlobalRole === 'platform_admin';
  const isN0User = !effectiveGlobalRole || effectiveGlobalRole === 'base_user';
  const showAdmin = realIsPlatformAdmin || effectiveIsPlatformAdmin;

  const topPadding = (isImpersonating || isRealUserImpersonation) ? 'pt-10' : '';

  // Page title
  useEffect(() => {
    const titles: Record<string, string> = {
      accueil: 'Accueil',
      support: 'Support',
      admin: 'Administration',
    };
    const title = titles[activeView] || activeView.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
    document.title = `${title} - HelpConfort`;
  }, [activeView]);

  // Vue Franchiseur
  if (isFranchiseur && !realIsPlatformAdmin) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <FranchiseurView />
      </Suspense>
    );
  }

  // Determine if current view needs a subscription guard
  const requiredPlan = getRequiredPlan(activeView);
  const planLabels: Record<string, string> = {
    pilotage: 'Pilotage',
    suivi: 'Suivi & Espace Apporteurs',
  };

  const content = requiredPlan ? (
    <SubscriptionGuard plan={requiredPlan} fallback={<UpgradePrompt planLabel={planLabels[requiredPlan]} />}>
      <SidebarContentRouter view={activeView} agencySlug={agence || undefined} isN0User={isN0User} />
    </SubscriptionGuard>
  ) : (
    <SidebarContentRouter view={activeView} agencySlug={agence || undefined} isN0User={isN0User} />
  );

  return (
    <AiUnifiedProvider>
      <TooltipProvider delayDuration={0}>
        {isLoggingOut && <LogoutOverlay />}

        <SidebarProvider defaultOpen={true}>
          <div className={`min-h-screen flex w-full ${topPadding}`}>
            <WorkspaceSidebar
              activeView={activeView}
              onViewChange={setActiveView}
              showAdmin={showAdmin}
            />

            <div className="flex-1 flex flex-col overflow-auto bg-background">
              <header className="h-12 flex items-center border-b px-4 shrink-0">
                <SidebarTrigger />
              </header>

              <main className="flex-1" role="main" id="main-content">
                {content}
              </main>
            </div>
          </div>
        </SidebarProvider>

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
