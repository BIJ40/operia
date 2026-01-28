/**
 * ContenuView - Vue Contenu (Guides, FAQ, Templates, Annonces, Notifs, Métadonnées)
 */

import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { AdminViewHeader } from '../AdminViewHeader';
import { FileText, BookOpen, HelpCircle, FileEdit, Bell, Megaphone, Loader2 } from 'lucide-react';

const AdminApogeeGuides = lazy(() => import('@/pages/AdminApogeeGuides'));
const AdminFaq = lazy(() => import('@/pages/admin/AdminFaq'));
const DocTemplatesPage = lazy(() => import('@/pages/admin/DocTemplatesPage'));
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'));
const AdminNotificationSender = lazy(() => import('@/pages/admin/AdminNotificationSender'));
const AdminPageMetadata = lazy(() => import('@/pages/AdminPageMetadata'));

const SUB_TABS: PillTabConfig[] = [
  { id: 'guides', label: 'Guides', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'templates', label: 'Templates', icon: FileEdit },
  { id: 'metadata', label: 'Metadata', icon: FileText },
  { id: 'annonces', label: 'Annonces', icon: Megaphone },
  { id: 'notifs', label: 'Notifications', icon: Bell },
];

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

  const handleViewChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'admin');
    next.set('adminTab', 'contenu');
    next.set('adminView', value);
    setSearchParams(next);
  };

  const currentTab = SUB_TABS.find(t => t.id === activeView);
  const breadcrumb = ['Admin', 'Contenu', currentTab?.label || 'Guides'];

  return (
    <div className="space-y-4">
      <AdminViewHeader
        title="Gestion du Contenu"
        subtitle="Guides, FAQ, templates et annonces"
        breadcrumb={breadcrumb}
        icon={<FileText className="h-5 w-5 text-primary" />}
      />

      <Tabs value={activeView} onValueChange={handleViewChange}>
        <PillTabsList tabs={SUB_TABS} className="justify-start" />

        <TabsContent value="guides" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminApogeeGuides />
          </Suspense>
        </TabsContent>

        <TabsContent value="faq" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminFaq />
          </Suspense>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <DocTemplatesPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="annonces" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminAnnouncements />
          </Suspense>
        </TabsContent>

        <TabsContent value="notifs" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminNotificationSender />
          </Suspense>
        </TabsContent>

        <TabsContent value="metadata" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <AdminPageMetadata />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
