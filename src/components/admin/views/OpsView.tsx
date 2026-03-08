/**
 * OpsView - Vue Ops (Backups, HC-Backup, Cache, Rapport Apogée, Stockage)
 * Utilise DraggableFolderTabs avec bordures colorées
 * Exports critiques protégés par MfaGuard
 */

import { lazy, Suspense, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MfaGuard } from '@/components/auth/MfaGuard';
import { 
  DraggableFolderTabsList, 
  DraggableFolderContentContainer,
  FolderTabConfig 
} from '@/components/ui/draggable-folder-tabs';
import { Database, Archive, HardDrive, FileJson, FileStack, Server, Loader2 } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';

const AdminBackup = lazy(() => import('@/pages/AdminBackup'));
const AdminHelpConfortBackup = lazy(() => import('@/pages/AdminHelpConfortBackup'));
const AdminCacheBackup = lazy(() => import('@/pages/AdminCacheBackup'));
const AdminApogeeReport = lazy(() => import('@/pages/admin/AdminApogeeReport'));
const AdminStorageQuota = lazy(() => import('@/pages/AdminStorageQuota'));
const AdminDatabaseExport = lazy(() => import('@/pages/admin/AdminDatabaseExport'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'backup', label: 'Backups', icon: Database, accent: 'blue' },
  { id: 'imports', label: 'Imports', icon: FileStack, accent: 'purple' },
  { id: 'cache', label: 'Cache', icon: Archive, accent: 'orange' },
  { id: 'report', label: 'Reports', icon: FileJson, accent: 'green' },
  { id: 'quota', label: 'Quota', icon: HardDrive, accent: 'teal' },
  { id: 'database', label: 'Database', icon: Server, accent: 'pink' },
];

const DEFAULT_TAB_ORDER = ['backup', 'imports', 'cache', 'report', 'quota', 'database'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function OpsView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('adminView') || 'backup';
  const [tabOrder, setTabOrder] = useSessionState<string[]>('admin_ops_tab_order', DEFAULT_TAB_ORDER);

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'ops');
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
    purple: 'hsl(var(--warm-purple))',
    green: 'hsl(var(--warm-green))',
    orange: 'hsl(var(--warm-orange))',
    teal: 'hsl(var(--warm-teal))',
    pink: 'hsl(var(--warm-pink))',
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
        <TabsContent value="backup" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="imports" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminHelpConfortBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="cache" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminCacheBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="report" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminApogeeReport />
          </Suspense>
        </TabsContent>

        <TabsContent value="quota" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminStorageQuota />
          </Suspense>
        </TabsContent>

        <TabsContent value="database" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminDatabaseExport />
          </Suspense>
        </TabsContent>
      </DraggableFolderContentContainer>
    </Tabs>
  );
}
