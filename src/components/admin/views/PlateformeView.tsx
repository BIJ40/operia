/**
 * PlateformeView - Vue Plateforme (Santé, Modules, Sitemap, Flow)
 * Utilise DraggableFolderTabs avec bordures colorées
 */

import { lazy, Suspense, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { 
  DraggableFolderTabsList, 
  DraggableFolderContentContainer,
  FolderTabConfig 
} from '@/components/ui/draggable-folder-tabs';
import { Activity, Map, GitBranch, Bell, Database, Loader2 } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionsContext';
import { MaintenanceModeCard } from '@/components/admin/MaintenanceModeCard';
import { useSessionState } from '@/hooks/useSessionState';
import { usePersistedTab } from '@/hooks/usePersistedState';

const AdminSystemHealth = lazy(() => import('@/pages/AdminSystemHealth'));
const AdminSitemap = lazy(() => import('@/pages/admin/AdminSitemap'));
const AdminFlow = lazy(() => import('@/pages/admin/AdminFlow'));
const TicketNotificationSettings = lazy(() => import('@/components/admin/TicketNotificationSettings'));
const AdminMirrorMonitor = lazy(() => import('@/components/admin/AdminMirrorMonitor'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'health', label: 'Santé', icon: Activity, accent: 'green' },
  { id: 'mirror', label: 'Miroir', icon: Database, accent: 'blue' },
  { id: 'sitemap', label: 'Sitemap', icon: Map, accent: 'purple' },
  { id: 'flow', label: 'Flow', icon: GitBranch, accent: 'orange' },
  { id: 'notifications', label: 'Notifs', icon: Bell, accent: 'orange' },
];

const DEFAULT_TAB_ORDER = ['health', 'mirror', 'sitemap', 'flow', 'notifications'];
const PLATFORM_TAB_IDS = SUB_TABS.map(tab => tab.id);

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function PlateformeView() {
  const { hasGlobalRole } = usePermissions();
  const isSuperadmin = hasGlobalRole('superadmin');
  const [searchParams, setSearchParams] = useSearchParams();
  const [persistedView, setPersistedView] = usePersistedTab('admin_plateforme_active_view', 'health', PLATFORM_TAB_IDS);
  const activeViewParam = searchParams.get('adminView');
  const activeView = activeViewParam && PLATFORM_TAB_IDS.includes(activeViewParam) ? activeViewParam : persistedView;
  const [tabOrder, setTabOrder] = useSessionState<string[]>('admin_plateforme_tab_order', DEFAULT_TAB_ORDER);

  useEffect(() => {
    if (activeViewParam && PLATFORM_TAB_IDS.includes(activeViewParam)) {
      if (activeViewParam !== persistedView) {
        setPersistedView(activeViewParam);
      }
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'plateforme');
    next.set('adminView', persistedView);
    setSearchParams(next, { replace: true });
  }, [activeViewParam, persistedView, searchParams, setSearchParams, setPersistedView]);

  const handleViewChange = (value: string) => {
    setPersistedView(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'plateforme');
    next.set('adminView', value);
    setSearchParams(next, { replace: true });
  };

  const handleReorder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
  }, [setTabOrder]);

  // Trouver la couleur de l'onglet actif
  const activeTab = SUB_TABS.find(t => t.id === activeView);
  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
  };
  const activeAccent = activeTab?.accent ? accentColors[activeTab.accent] : undefined;

  return (
    <div className="space-y-4">
      {/* Mode Maintenance - Visible uniquement pour N6 */}
      {isSuperadmin && <MaintenanceModeCard compact />}

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <DraggableFolderTabsList 
          tabs={SUB_TABS} 
          tabOrder={tabOrder}
          activeTab={activeView}
          onTabChange={handleViewChange}
          onReorder={handleReorder}
          isDraggable={true}
        />

        <DraggableFolderContentContainer accentColor={activeAccent}>
          <TabsContent value="health" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <AdminSystemHealth />
            </Suspense>
          </TabsContent>

          <TabsContent value="mirror" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <AdminMirrorMonitor />
            </Suspense>
          </TabsContent>

          <TabsContent value="sitemap" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <AdminSitemap />
            </Suspense>
          </TabsContent>

          <TabsContent value="flow" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <AdminFlow />
            </Suspense>
          </TabsContent>


          <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
            <Suspense fallback={<LoadingFallback />}>
              <TicketNotificationSettings />
            </Suspense>
          </TabsContent>
        </DraggableFolderContentContainer>
      </Tabs>
    </div>
  );
}
