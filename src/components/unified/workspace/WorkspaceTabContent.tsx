/**
 * WorkspaceTabContent - All tab content panels with lazy loading and error boundaries
 */
import { lazy, Suspense, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { SubscriptionGuard } from '@/components/guards/SubscriptionGuard';
import { UpgradePrompt } from '@/components/pricing/UpgradePrompt';
import { PricingPlans } from '@/components/pricing/PricingPlans';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { WorkspaceSidebar, type SidebarView, getSidebarSection } from './WorkspaceSidebar';
import { SidebarContentRouter } from './SidebarContentRouter';
import { useProfile } from '@/contexts/ProfileContext';
import { useSessionState } from '@/hooks/useSessionState';

// Lazy loaded tab contents
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));
const DemoAccueilContent = lazy(() => import('@/components/home/DemoAccueilContent').then(m => ({ default: m.DemoAccueilContent })));
const AdminTabContent = lazy(() => import('@/components/unified/tabs/AdminTabContent'));
const SupportHubTabContent = lazy(() => import('@/components/unified/tabs/AideTabContent'));

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

interface WorkspaceTabContentProps {
  isN0User: boolean;
}

/**
 * SidebarLayout — used for Pilotage + Relations tabs
 * Shows the blue sidebar + routed content
 */
function SidebarLayout({ requiredPlan, planLabel }: { requiredPlan: 'pilotage' | 'suivi'; planLabel: string }) {
  const { agence } = useProfile();
  const defaultView: SidebarView = requiredPlan === 'pilotage' ? 'stats-general' : 'suivi-parametres';
  const [activeView, setActiveView] = useSessionState<SidebarView>(`sidebar_view_${requiredPlan}`, defaultView);

  // Ensure the active view matches the section
  const section = getSidebarSection(activeView);
  const effectiveView = section === requiredPlan ? activeView : defaultView;

  return (
    <SubscriptionGuard plan={requiredPlan} fallback={<UpgradePrompt planLabel={planLabel} />}>
      <LocalErrorBoundary componentName={planLabel}>
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-[calc(100vh-80px)] w-full">
            <WorkspaceSidebar activeView={effectiveView} onViewChange={setActiveView} />
            <main className="flex-1 overflow-auto">
              <div className="flex items-center gap-2 px-4 pt-3 pb-0">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              </div>
              <SidebarContentRouter view={effectiveView} agencySlug={agence || undefined} />
            </main>
          </div>
        </SidebarProvider>
      </LocalErrorBoundary>
    </SubscriptionGuard>
  );
}

export function WorkspaceTabContent({ isN0User }: WorkspaceTabContentProps) {
  return (
    <div id="main-content" className="flex-1 overflow-auto" role="main">
      <Suspense fallback={<LoadingFallback />}>
        <TabsContent value="accueil" className="mt-0 h-full">
          {isN0User ? <DemoAccueilContent /> : <DashboardContent />}
          <PricingPlans />
        </TabsContent>

        <TabsContent value="pilotage" className="mt-0 p-0">
          <SidebarLayout requiredPlan="pilotage" planLabel="Pilotage" />
        </TabsContent>

        <TabsContent value="commercial" className="mt-0 p-0">
          <SidebarLayout requiredPlan="pilotage" planLabel="Pilotage" />
        </TabsContent>

        <TabsContent value="relations" className="mt-0 p-0">
          <SidebarLayout requiredPlan="suivi" planLabel="Suivi & Espace Apporteurs" />
        </TabsContent>

        <TabsContent value="support" className="mt-0">
          <LocalErrorBoundary componentName="Support">
            <SupportHubTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="admin" className="mt-0">
          <LocalErrorBoundary componentName="Administration">
            <AdminTabContent />
          </LocalErrorBoundary>
        </TabsContent>
      </Suspense>
    </div>
  );
}
