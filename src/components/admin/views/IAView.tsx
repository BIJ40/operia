/**
 * IAView - Vue IA (Helpi, STATiA, Validator)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { FolderTabsList, FolderContentContainer, FolderTabConfig } from '@/components/ui/folder-tabs';
import { Bot, FlaskConical, Loader2 } from 'lucide-react';

const AdminHelpi = lazy(() => import('@/pages/AdminHelpi'));
const StatiaBuilderAdminPage = lazy(() => import('@/statia/pages/StatiaBuilderAdminPage'));
const StatiaValidatorPage = lazy(() => import('@/statia/pages/StatiaValidatorPage'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'helpi', label: 'Helpi', icon: Bot },
  { id: 'statia', label: 'STATiA', icon: FlaskConical },
  { id: 'validator', label: 'Validator', icon: FlaskConical },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function IAView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('adminView') || 'helpi';

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'ia');
    next.set('adminView', value);
    setSearchParams(next);
  };

  return (
    <Tabs value={activeView} onValueChange={handleViewChange}>
      <FolderTabsList tabs={SUB_TABS} activeTab={activeView} />

      <FolderContentContainer>
        <TabsContent value="helpi" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminHelpi />
          </Suspense>
        </TabsContent>

        <TabsContent value="statia" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <StatiaBuilderAdminPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="validator" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <StatiaValidatorPage />
          </Suspense>
        </TabsContent>
      </FolderContentContainer>
    </Tabs>
  );
}
