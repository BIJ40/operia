/**
 * OpsView - Vue Ops (Backups, HC-Backup, Cache, Rapport Apogée, Stockage)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { AdminViewHeader } from '../AdminViewHeader';
import { Database, Archive, HardDrive, FileJson, FileStack, Loader2 } from 'lucide-react';

const AdminBackup = lazy(() => import('@/pages/AdminBackup'));
const AdminHelpConfortBackup = lazy(() => import('@/pages/AdminHelpConfortBackup'));
const AdminCacheBackup = lazy(() => import('@/pages/AdminCacheBackup'));
const AdminApogeeReport = lazy(() => import('@/pages/admin/AdminApogeeReport'));
const AdminStorageQuota = lazy(() => import('@/pages/AdminStorageQuota'));

const SUB_TABS: PillTabConfig[] = [
  { id: 'backup', label: 'Backups', icon: Database },
  { id: 'imports', label: 'Imports', icon: FileStack },
  { id: 'cache', label: 'Cache', icon: Archive },
  { id: 'report', label: 'Reports', icon: FileJson },
  { id: 'quota', label: 'Quota', icon: HardDrive },
];

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

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'ops');
    next.set('adminView', value);
    setSearchParams(next);
  };

  const currentTab = SUB_TABS.find(t => t.id === activeView);
  const breadcrumb = ['Admin', 'Ops', currentTab?.label || 'Backups'];

  return (
    <div className="space-y-4">
      <AdminViewHeader
        title="Opérations"
        subtitle="Backups, stockage et rapports"
        breadcrumb={breadcrumb}
        icon={<Database className="h-5 w-5 text-primary" />}
      />

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <PillTabsList tabs={SUB_TABS} className="justify-start" />

        <TabsContent value="backup" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="imports" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminHelpConfortBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="cache" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminCacheBackup />
          </Suspense>
        </TabsContent>

        <TabsContent value="report" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminApogeeReport />
          </Suspense>
        </TabsContent>

        <TabsContent value="quota" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminStorageQuota />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
