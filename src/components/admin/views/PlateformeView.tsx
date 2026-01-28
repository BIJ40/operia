/**
 * PlateformeView - Vue Plateforme (Santé, Sitemap, Hidden, Flow)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { AdminViewHeader } from '../AdminViewHeader';
import { Cpu, Activity, Map, EyeOff, GitBranch, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard';

const AdminSystemHealth = lazy(() => import('@/pages/AdminSystemHealth'));
const AdminSitemap = lazy(() => import('@/pages/admin/AdminSitemap'));
const HiddenFeaturesPage = lazy(() => import('@/pages/admin/HiddenFeaturesPage'));
const AdminFlow = lazy(() => import('@/pages/admin/AdminFlow'));

const SUB_TABS: PillTabConfig[] = [
  { id: 'health', label: 'Santé', icon: Activity },
  { id: 'sitemap', label: 'Sitemap', icon: Map },
  { id: 'hidden', label: 'Masqué', icon: EyeOff },
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

  const currentTab = SUB_TABS.find(t => t.id === activeView);
  const breadcrumb = ['Admin', 'Plateforme', currentTab?.label || 'Santé'];

  return (
    <div className="space-y-4">
      <AdminViewHeader
        title="Plateforme"
        subtitle="Santé système, routes et outils"
        breadcrumb={breadcrumb}
        icon={<Cpu className="h-5 w-5 text-primary" />}
      />

      {/* Mode Maintenance - Visible uniquement pour N6 */}
      {isSuperadmin && <MaintenanceModeCard compact />}

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <PillTabsList tabs={SUB_TABS} className="justify-start" />

        <TabsContent value="health" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminSystemHealth />
          </Suspense>
        </TabsContent>

        <TabsContent value="sitemap" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminSitemap />
          </Suspense>
        </TabsContent>

        <TabsContent value="hidden" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <HiddenFeaturesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="flow" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminFlow />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
