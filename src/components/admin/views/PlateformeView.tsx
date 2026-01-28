/**
 * PlateformeView - Vue Plateforme (Santé, Sitemap, Hidden, Flow)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { Activity, Map, FlaskConical, GitBranch, ToggleRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard';

const AdminSystemHealth = lazy(() => import('@/pages/AdminSystemHealth'));
const AdminFeatureFlags = lazy(() => import('@/pages/admin/AdminFeatureFlags'));
const HiddenFeaturesPage = lazy(() => import('@/pages/admin/HiddenFeaturesPage'));
const AdminSitemap = lazy(() => import('@/pages/admin/AdminSitemap'));
const AdminFlow = lazy(() => import('@/pages/admin/AdminFlow'));

const SUB_TABS: PillTabConfig[] = [
  { id: 'health', label: 'Santé', icon: Activity },
  { id: 'modules', label: 'Modules', icon: ToggleRight },
  { id: 'lab', label: 'Laboratoire', icon: FlaskConical },
  { id: 'sitemap', label: 'Sitemap', icon: Map },
  { id: 'flow', label: 'Flow', icon: GitBranch },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PlateformeView() {
  const { hasGlobalRole } = useAuth();
  const isSuperadmin = hasGlobalRole('superadmin');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('adminView') || 'health';

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'plateforme');
    next.set('adminView', value);
    setSearchParams(next);
  };

  return (
    <div className="space-y-4">
      {/* Mode Maintenance - Visible uniquement pour N6 */}
      {isSuperadmin && <MaintenanceModeCard compact />}

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <PillTabsList tabs={SUB_TABS} className="justify-start" />

        <TabsContent value="health" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AdminSystemHealth />
          </Suspense>
        </TabsContent>

        <TabsContent value="modules" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AdminFeatureFlags />
          </Suspense>
        </TabsContent>

        <TabsContent value="lab" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <HiddenFeaturesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="sitemap" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AdminSitemap />
          </Suspense>
        </TabsContent>

        <TabsContent value="flow" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <AdminFlow />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
