/**
 * WorkspaceTabContent - All tab content panels with lazy loading and error boundaries
 */
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { LocalErrorBoundary } from '@/components/system/LocalErrorBoundary';
import { StatsHubProvider } from '@/apogee-connect/components/stats-hub/StatsHubContext';

// Lazy loaded tab contents
const DashboardContent = lazy(() => import('@/pages/DashboardStatic'));
const DemoAccueilContent = lazy(() => import('@/components/home/DemoAccueilContent').then(m => ({ default: m.DemoAccueilContent })));
const PilotageTabContent = lazy(() => import('@/components/unified/tabs/PilotageTabContent'));
const CommercialTabContent = lazy(() => import('@/components/unified/tabs/CommercialTabContent'));
const OrganisationTabContent = lazy(() => import('@/components/unified/tabs/OrganisationTabContent'));
const AdminTabContent = lazy(() => import('@/components/unified/tabs/AdminTabContent'));
const DocumentsTabContent = lazy(() => import('@/components/unified/tabs/DocumentsTabContent'));
const SupportHubTabContent = lazy(() => import('@/components/unified/tabs/AideTabContent'));
const TicketingTabContent = lazy(() => import('@/pages/ProjectsIndex'));

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

        <TabsContent value="pilotage" className="mt-0">
          <LocalErrorBoundary componentName="Pilotage">
            <StatsHubProvider>
              <PilotageTabContent />
            </StatsHubProvider>
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="commercial" className="mt-0">
          <LocalErrorBoundary componentName="Commercial">
            <CommercialTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="organisation" className="mt-0">
          <LocalErrorBoundary componentName="Organisation">
            <OrganisationTabContent />
          </LocalErrorBoundary>
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          <LocalErrorBoundary componentName="Documents">
            <DocumentsTabContent />
          </LocalErrorBoundary>
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
    </main>
  );
}
