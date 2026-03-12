/**
 * SupportHubTabContent - Onglet unifié "Support"
 * Sous-onglets : Aide en ligne, Guides, FAQ, Ticketing (conditionnel)
 * 
 * Guides contient des sous-catégories (Apogée, et futures : Apporteurs, HelpConfort)
 */

import { lazy, Suspense, useMemo, useState } from 'react';
import { Headphones, BookOpen, HelpCircle, Ticket, Loader2 } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';

const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));

type SupportSubTab = 'aide-en-ligne' | 'guides' | 'faq' | 'ticketing';

const ALL_SUPPORT_TABS: (PillTabConfig & { requiresModule?: ModuleKey })[] = [
  { id: 'aide-en-ligne', label: 'Aide en ligne', icon: Headphones, accent: 'blue', requiresModule: 'support.aide_en_ligne' },
  { id: 'guides', label: 'Guides', icon: BookOpen, accent: 'purple', requiresModule: 'support.guides' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, accent: 'green' },
  { id: 'ticketing', label: 'Ticketing', icon: Ticket, accent: 'orange' },
];

/** Configuration des guides disponibles (extensible) */
interface GuideConfig {
  id: string;
  label: string;
  requiresModule?: ModuleKey;
}

const GUIDE_SECTIONS: GuideConfig[] = [
  { id: 'apogee', label: 'Apogée' },
  // Futures sections : décommenter quand activées
  // { id: 'apporteurs', label: 'Apporteurs', requiresModule: 'divers_apporteurs' },
  // { id: 'helpconfort', label: 'HelpConfort', requiresModule: 'helpconfort' },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Sous-composant Guides avec navigation par catégorie */
function GuidesSection() {
  const { hasModule } = usePermissions();
  
  const visibleGuides = useMemo(() => {
    return GUIDE_SECTIONS.filter(g => {
      if (!g.requiresModule) return true;
      return hasModule(g.requiresModule);
    });
  }, [hasModule]);

  const [activeGuide, setActiveGuide] = useState(visibleGuides[0]?.id ?? 'apogee');

  // Si un seul guide, pas besoin de sous-navigation
  if (visibleGuides.length <= 1) {
    return <InternalApogeeLayout />;
  }

  // Multi-guides : afficher des pills secondaires
  const guidePills: PillTabConfig[] = visibleGuides.map(g => ({
    id: g.id,
    label: g.label,
    icon: BookOpen,
    accent: 'purple',
  }));

  return (
    <Tabs value={activeGuide} onValueChange={setActiveGuide}>
      <PillTabsList tabs={guidePills} />
      <TabsContent value="apogee" className="mt-4">
        <InternalApogeeLayout />
      </TabsContent>
      {/* Future guide TabsContent ici */}
    </Tabs>
  );
}

export default function SupportHubTabContent() {
  const { hasModule } = usePermissions();

  const visibleTabs = useMemo(() => {
    const tabs = ALL_SUPPORT_TABS.filter(tab => {
      if (!tab.requiresModule) return true;
      return hasModule(tab.requiresModule);
    });

    // Phase 0 safety net: Ticketing doit toujours rester visible
    if (!tabs.some(tab => tab.id === 'ticketing')) {
      const ticketingTab = ALL_SUPPORT_TABS.find(tab => tab.id === 'ticketing');
      if (ticketingTab) tabs.push(ticketingTab);
    }

    return tabs;
  }, [hasModule]);

  const defaultTab = visibleTabs[0]?.id as SupportSubTab ?? 'aide-en-ligne';
  const [activeTab, setActiveTab] = useSessionState<SupportSubTab>('support_sub_tab', defaultTab);
  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : defaultTab;

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as SupportSubTab)}>
        <PillTabsList tabs={visibleTabs} />

        <TabsContent value="aide-en-ligne" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <SupportTabContent />
          </Suspense>
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <GuidesSection />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">FAQ</p>
            <p className="text-sm">Questions fréquentes (à venir)</p>
          </div>
        </TabsContent>

        <TabsContent value="ticketing" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <TicketingTabContent />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
