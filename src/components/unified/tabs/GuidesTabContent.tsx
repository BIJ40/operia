/**
 * GuidesTabContent - Contenu de l'onglet "Guides"
 * Sous-onglets: Apogée, HelpConfort, Apporteurs, Operia, FAQ
 * Visibilité/accessibilité contrôlée par permissions (support.guides options)
 */

import { lazy, Suspense, useMemo } from 'react';
import { BookOpen, Users, Building2, HelpCircle, Loader2, Home, type LucideIcon } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSessionState } from '@/hooks/useSessionState';
import { InternalApogeeLayout } from '@/components/guides/apogee/InternalApogeeLayout';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { DomainAccentProvider } from '@/contexts/DomainAccentContext';
import { usePermissions } from '@/contexts/PermissionsContext';

const ApporteurGuide = lazy(() => import('@/pages/ApporteurGuide'));
const HelpConfort = lazy(() => import('@/pages/HelpConfort'));

type GuideTab = 'apogee' | 'apporteurs' | 'helpconfort' | 'operia' | 'faq';

interface GuideTabDef {
  id: GuideTab;
  label: string;
  icon: LucideIcon;
  /** Permission option key in support.guides — null = always visible */
  permissionOption: 'apogee' | 'apporteurs' | 'helpconfort' | null;
  /** If true, tab is always disabled (content not yet available) */
  comingSoon?: boolean;
}

const ALL_GUIDE_TABS: GuideTabDef[] = [
  { id: 'apogee', label: 'Apogée', icon: BookOpen, permissionOption: 'apogee' },
  { id: 'helpconfort', label: 'Help Confort', icon: Building2, permissionOption: 'helpconfort' },
  { id: 'apporteurs', label: 'Apporteurs', icon: Users, permissionOption: 'apporteurs' },
  { id: 'operia', label: 'Operia', icon: Home, permissionOption: null, comingSoon: true },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, permissionOption: null },
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
  const { hasModuleOption, hasGlobalRole } = usePermissions();
  const isAdmin = hasGlobalRole('platform_admin');

  const visibleTabs: PillTabConfig[] = useMemo(() => {
    return ALL_GUIDE_TABS
      .filter((tab) => {
        // Always show tabs with no permission check, or coming soon tabs
        if (tab.permissionOption === null) return true;
        // Admins see everything
        if (isAdmin) return true;
        // Show if user has the option (even if disabled, we show greyed out)
        // For now: show all deployed tabs, disable if no access
        return true;
      })
      .map((tab) => {
        const hasAccess = tab.permissionOption === null
          || isAdmin
          || hasModuleOption('support.guides', tab.permissionOption);

        return {
          id: tab.id,
          label: tab.label,
          icon: tab.icon,
          disabled: tab.comingSoon || !hasAccess,
        };
      });
  }, [isAdmin, hasModuleOption]);

  return (
    <DomainAccentProvider accent="purple">
    <div className={cn("container mx-auto max-w-7xl", navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-3' : 'py-3 px-2 sm:px-4 space-y-4')}>
      <Tabs value={activeGuide} onValueChange={(v) => setActiveGuide(v as GuideTab)}>
        <PillTabsList tabs={visibleTabs} variant={navMode === 'header' ? 'switcher' : 'pill'} />

        {/* Apogée */}
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

          <TabsContent value="operia" className="mt-4">
            <div className="text-center py-12 text-muted-foreground">
              <Home className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Operia</p>
              <p className="text-sm">Bientôt disponible</p>
            </div>
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
    </DomainAccentProvider>
  );
}
