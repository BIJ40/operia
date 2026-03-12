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
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';

const SupportTabContent = lazy(() => import('@/components/unified/tabs/SupportTabContent'));
const TicketingTabContent = lazy(() => import('@/components/unified/tabs/TicketingTabContent'));

type SupportSubTab = 'aide-en-ligne' | 'guides' | 'faq' | 'ticketing';

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

export default function SupportHubTabContent() {
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();
  const [activeGuide, setActiveGuide] = useState('apogee');

  // A: module labels resolved from DB/definitions
  // B: 'FAQ' has no module guard → structural label, keep hardcoded
  const allTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'aide-en-ligne', label: getShortLabel('support.aide_en_ligne', 'Aide en ligne'), icon: Headphones, accent: 'blue', requiresModule: 'support.aide_en_ligne' },
    { id: 'guides', label: getShortLabel('support.guides', 'Guides'), icon: BookOpen, accent: 'purple', requiresModule: 'support.guides' },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, accent: 'green' },
    { id: 'ticketing', label: getShortLabel('ticketing', 'Ticketing'), icon: Ticket, accent: 'orange', requiresModule: 'ticketing' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return allTabs.map(tab => {
      if (!tab.requiresModule) return tab;
      return { ...tab, disabled: !hasModule(tab.requiresModule) };
    });
  }, [hasModule, allTabs]);

  const defaultTab = (visibleTabs.find(t => !t.disabled)?.id as SupportSubTab) ?? 'faq';
  const [activeTab, setActiveTab] = useSessionState<SupportSubTab>('support_sub_tab', defaultTab);
  const effectiveTab = (visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : defaultTab;

  // Filter guide sections by module access
  const visibleGuides = useMemo(() => {
    return GUIDE_SECTIONS.filter(g => {
      if (!g.requiresModule) return true;
      return hasModule(g.requiresModule);
    });
  }, [hasModule]);

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
          {visibleGuides.length > 1 && (
            <div className="flex gap-2 mb-4">
              {visibleGuides.map(guide => (
                <button
                  key={guide.id}
                  onClick={() => setActiveGuide(guide.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeGuide === guide.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {guide.label}
                </button>
              ))}
            </div>
          )}
          {activeGuide === 'apogee' && <InternalApogeeLayout />}
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <SupportTabContent />
          </Suspense>
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
