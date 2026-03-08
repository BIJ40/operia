/**
 * WorkspaceTabContent - All tab content panels with lazy loading and error boundaries
 */
import { lazy, Suspense } from 'react';
import { Loader2, FlaskConical } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';

// Lazy loaded tab contents
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));
const DemoAccueilContent = lazy(() => import('@/components/home/DemoAccueilContent').then(m => ({ default: m.DemoAccueilContent })));
const StatsTabContent = lazy(() => import('@/components/unified/tabs/StatsTabContent'));
const CollaborateursTabContent = lazy(() => import('@/components/unified/tabs/CollaborateursTabContent'));
const DiversTabContent = lazy(() => import('@/components/unified/tabs/DiversTabContent'));
const GuidesTabContent = lazy(() => import('@/components/unified/tabs/GuidesTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));
const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));
const AdminTabContent = lazy(() => import('@/components/unified/tabs/AdminTabContent'));
const DocumentsTabContent = lazy(() => import('@/components/unified/tabs/DocumentsTabContent'));

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

export function WorkspaceTabContent({ isN0User }: WorkspaceTabContentProps) {
  return (
    <main id="main-content" className="flex-1 overflow-auto" role="main">
      <Suspense fallback={<LoadingFallback />}>
        <TabsContent value="accueil" className="mt-0 h-full">
          {isN0User ? <DemoAccueilContent /> : <DashboardContent />}
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <LocalErrorBoundary componentName="Statistiques">
            <StatsHubProvider>
              <StatsTabContent />
            </StatsHubProvider>
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="salaries" className="mt-0">
          <LocalErrorBoundary componentName="Collaborateurs">
            <CollaborateursTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="outils" className="mt-0">
          <LocalErrorBoundary componentName="Outils">
            <DiversTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <LocalErrorBoundary componentName="Documents">
            <DocumentsTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="guides" className="mt-0">
          <LocalErrorBoundary componentName="Guides">
            <GuidesTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="ticketing" className="mt-0">
          <LocalErrorBoundary componentName="Ticketing">
            <TicketingTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="aide" className="mt-0">
          <LocalErrorBoundary componentName="Support">
            <SupportTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="admin" className="mt-0">
          <LocalErrorBoundary componentName="Administration">
            <AdminTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="test" className="mt-0">
          <div className="p-8 text-center space-y-4">
            <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-semibold text-foreground">Onglet TEST</h2>
            <p className="text-muted-foreground">Cet onglet est réservé aux tests.</p>
          </div>
        </TabsContent>
      </Suspense>
    </main>
  );
}
