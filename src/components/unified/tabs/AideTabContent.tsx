/**
 * AideTabContent - Onglet "Aide"
 * Sous-onglets : Support, Guides, FAQ
 */

import { lazy, Suspense, useMemo } from 'react';
import { Headphones, BookOpen, HelpCircle, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { ModuleKey } from '@/types/modules';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';

const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));

type AideSubTab = 'support' | 'guides' | 'faq';

const ALL_AIDE_TABS: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'support', label: 'Support', icon: Headphones, accent: 'blue', requiresModule: 'aide' },
  { id: 'guides', label: 'Guides', icon: BookOpen, accent: 'purple', requiresModule: 'guides' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, accent: 'green' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function AideTabContent() {
  const { hasModule } = useEffectiveModules();

  const visibleTabs = useMemo(() => {
    return ALL_AIDE_TABS.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });
  }, [hasModule]);

  const defaultTab = visibleTabs[0]?.id as AideSubTab ?? 'support';
  const [activeTab, setActiveTab] = useSessionState<AideSubTab>('aide_sub_tab', defaultTab);
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : defaultTab;

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as AideSubTab)}>
        <PillTabsList tabs={visibleTabs} />

        <TabsContent value="support" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <SupportTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <InternalApogeeLayout />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">FAQ</p>
            <p className="text-sm">Questions fréquentes (à venir)</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
