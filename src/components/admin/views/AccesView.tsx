/**
 * AccesView - Vue Accès (Utilisateurs, Activité)
 * Utilise DraggableFolderTabs avec bordures colorées
 */

import { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { 
  DraggableFolderTabsList, 
  DraggableFolderContentContainer,
  FolderTabConfig 
} from '@/components/ui/draggable-folder-tabs';
import { Users, Activity, Loader2, Building2 } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';

const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminUserActivity = lazy(() => import('@/pages/AdminUserActivity'));
const ApporteurManagersAdminView = lazy(() => import('@/components/admin/views/ApporteurManagersAdminView'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'users', label: 'Utilisateurs', icon: Users, accent: 'blue' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Building2, accent: 'orange' },
  { id: 'activity', label: 'Activité', icon: Activity, accent: 'green' },
];

const DEFAULT_TAB_ORDER = ['users', 'apporteurs', 'activity'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AccesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('adminView') || 'users';
  const [tabOrder, setTabOrder] = useSessionState<string[]>('admin_acces_tab_order', DEFAULT_TAB_ORDER);

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'acces');
    next.set('adminView', value);
    setSearchParams(next);
  };

  const handleReorder = useCallback((newOrder: string[]) => {
    setTabOrder(newOrder);
  }, [setTabOrder]);

  // Trouver la couleur de l'onglet actif
  const activeTab = SUB_TABS.find(t => t.id === activeView);
  const accentColors: Record<string, string> = {
    blue: 'hsl(var(--warm-blue))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange, 30 90% 50%))',
  };
  const activeAccent = activeTab?.accent ? accentColors[activeTab.accent] : undefined;

  return (
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
        <TabsContent value="users" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <TDRUsersPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="apporteurs" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <ApporteurManagersAdminView />
          </Suspense>
        </TabsContent>

        <TabsContent value="activity" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminUserActivity />
          </Suspense>
        </TabsContent>
      </DraggableFolderContentContainer>
    </Tabs>
  );
}
