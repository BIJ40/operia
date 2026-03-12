/**
 * GuidesTabContent - Contenu de l'onglet "Guides"
 * Sous-onglets: Apogée, Apporteurs, HelpConfort, FAQ
 */

import { lazy, Suspense } from 'react';
import { BookOpen, Users, Building2, HelpCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';

const ApporteurGuide = lazy(() => import('@/pages/ApporteurGuide'));
const HelpConfort = lazy(() => import('@/pages/HelpConfort'));

type GuideTab = 'apogee' | 'apporteurs' | 'helpconfort' | 'faq';

const GUIDE_TABS: PillTabConfig[] = [
  { id: 'apogee', label: 'Apogée', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function GuidesTabContent() {
  const [activeGuide, setActiveGuide] = useSessionState<GuideTab>('guides_sub_tab', 'apogee');
  const { mode: navMode } = useNavigationMode();

  return (
    <div className={navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-3 px-2 sm:px-4 space-y-4'}>
      <Tabs value={activeGuide} onValueChange={(v) => setActiveGuide(v as GuideTab)}>
        <PillTabsList tabs={GUIDE_TABS} variant={navMode === 'header' ? 'switcher' : 'pill'} />

        {/* Apogée - Layout avec sidebar intégré (pas de Suspense car pas lazy) */}
        <TabsContent value="apogee" className="mt-4">
          <InternalApogeeLayout />
        </TabsContent>

        <Suspense fallback={<LoadingFallback />}>
          <TabsContent value="apporteurs" className="mt-4">
            <ApporteurGuide />
          </TabsContent>
          
          <TabsContent value="helpconfort" className="mt-4">
            <HelpConfort />
          </TabsContent>
          
          <TabsContent value="faq" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">FAQ</p>
              <p className="text-sm">Questions fréquentes (à venir)</p>
            </div>
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
