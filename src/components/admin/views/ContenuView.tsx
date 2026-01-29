/**
 * ContenuView - Vue Contenu (Guides, FAQ, Templates, Annonces, Notifs, Métadonnées)
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
import { FileText, BookOpen, HelpCircle, FileEdit, Bell, Megaphone, Loader2 } from 'lucide-react';
import { useSessionState } from '@/hooks/useSessionState';

const AdminApogeeGuides = lazy(() => import('@/pages/AdminApogeeGuides'));
const AdminFaq = lazy(() => import('@/pages/admin/AdminFaq'));
const DocTemplatesPage = lazy(() => import('@/pages/admin/DocTemplatesPage'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminNotificationSender = lazy(() => import('@/pages/admin/AdminNotificationSender'));
const AdminPageMetadata = lazy(() => import('@/pages/AdminPageMetadata'));

const SUB_TABS: FolderTabConfig[] = [
  { id: 'guides', label: 'Guides', icon: BookOpen, accent: 'blue' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, accent: 'purple' },
  { id: 'templates', label: 'Templates', icon: FileEdit, accent: 'orange' },
  { id: 'metadata', label: 'Metadata', icon: FileText, accent: 'teal' },
  { id: 'annonces', label: 'Annonces', icon: Megaphone, accent: 'pink' },
  { id: 'notifs', label: 'Notifications', icon: Bell, accent: 'green' },
];

const DEFAULT_TAB_ORDER = ['guides', 'faq', 'templates', 'metadata', 'annonces', 'notifs'];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ContenuView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('adminView') || 'guides';
  const [tabOrder, setTabOrder] = useSessionState<string[]>('admin_contenu_tab_order', DEFAULT_TAB_ORDER);

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'contenu');
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
    pink: 'hsl(var(--warm-pink))',
    teal: 'hsl(var(--warm-teal))',
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
        <TabsContent value="guides" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminApogeeGuides />
          </Suspense>
        </TabsContent>

        <TabsContent value="faq" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminFaq />
          </Suspense>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <DocTemplatesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="annonces" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminAnnouncements />
          </Suspense>
        </TabsContent>

        <TabsContent value="notifs" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminNotificationSender />
          </Suspense>
        </TabsContent>

        <TabsContent value="metadata" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<LoadingFallback />}>
            <AdminPageMetadata />
          </Suspense>
        </TabsContent>
      </DraggableFolderContentContainer>
    </Tabs>
  );
}
