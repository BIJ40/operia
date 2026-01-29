/**
 * IAView - Vue IA (Helpi, STATiA, Validator)
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
import { Bot, FlaskConical, Loader2, TestTube } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';

const AdminHelpi = lazy(() => import('@/pages/AdminHelpi'));
const StatiaBuilderAdminPage = lazy(() => import('@/statia/pages/StatiaBuilderAdminPage'));
const StatiaValidatorPage = lazy(() => import('@/statia/pages/StatiaValidatorPage'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'helpi', label: 'Helpi', icon: Bot, accent: 'blue' },
  { id: 'statia', label: 'STATiA', icon: FlaskConical, accent: 'purple' },
  { id: 'validator', label: 'Validator', icon: TestTube, accent: 'green' },
];

const DEFAULT_TAB_ORDER = ['helpi', 'statia', 'validator'];

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
  const [tabOrder, setTabOrder] = useSessionState<string[]>('admin_ia_tab_order', DEFAULT_TAB_ORDER);

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'ia');
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
      </DraggableFolderContentContainer>
    </Tabs>
  );
}
