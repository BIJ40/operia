/**
 * AccesView - Vue Accès (Utilisateurs, Activité, Flags)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { AdminViewHeader } from '../AdminViewHeader';
import { Users, Activity, Loader2 } from 'lucide-react';

const TDRUsersPage = lazy(() => import('@/pages/TDRUsersPage'));
const AdminUserActivity = lazy(() => import('@/pages/AdminUserActivity'));

const SUB_TABS: PillTabConfig[] = [
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'activity', label: 'Activité', icon: Activity },
];

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

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'acces');
    next.set('adminView', value);
    setSearchParams(next);
  };

  const currentTab = SUB_TABS.find(t => t.id === activeView);
  const breadcrumb = ['Admin', 'Accès', currentTab?.label || 'Utilisateurs'];

  return (
    <div className="space-y-4">
      <AdminViewHeader
        title="Gestion des Accès"
        subtitle="Utilisateurs, activité et modules"
        breadcrumb={breadcrumb}
        icon={<Users className="h-5 w-5 text-primary" />}
      />

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <PillTabsList tabs={SUB_TABS} className="justify-start" />

        <TabsContent value="users" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <TDRUsersPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminUserActivity />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
