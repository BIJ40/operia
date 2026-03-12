/**
 * StatsTabContent - Contenu de l'onglet "Statistiques"
 * Hub statistiques avec sous-onglets filtrés par permissions
 */

import { useEffect, useMemo } from 'react';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { Tv, LayoutDashboard, Building2, Users, Layers, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { useStatsHub } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { TABS_CONFIG, TabId } from '@/apogee-connect/components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { PeriodDisplay } from '@/apogee-connect/components/filters/PeriodDisplay';
import { openInNewTabPreservingPreviewToken } from '@/lib/openInNewTab';
import { ROUTES } from '@/config/routes';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  general: GeneralTab,
  apporteurs: ApporteursTab,
  techniciens: TechniciensTab,
  univers: UniversTab,
  sav: SAVTab,
  previsionnel: PrevisionnelTab,
};

export default function StatsTabContent() {
  const { activeTab, setActiveTab } = useStatsHub();
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();

  // A: All stats sub-tabs map to real modules (pilotage.statistiques.*) → dynamic labels
  const statsTabs: (PillTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'general', label: getShortLabel('pilotage.statistiques.general', 'Général'), icon: LayoutDashboard, requiresModule: 'pilotage.statistiques.general' },
    { id: 'apporteurs', label: getShortLabel('pilotage.statistiques.apporteurs', 'Apporteurs'), icon: Building2, requiresModule: 'pilotage.statistiques.apporteurs' },
    { id: 'techniciens', label: getShortLabel('pilotage.statistiques.techniciens', 'Techniciens'), icon: Users, requiresModule: 'pilotage.statistiques.techniciens' },
    { id: 'univers', label: getShortLabel('pilotage.statistiques.univers', 'Univers'), icon: Layers, requiresModule: 'pilotage.statistiques.univers' },
    { id: 'sav', label: getShortLabel('pilotage.statistiques.sav', 'SAV'), icon: AlertTriangle, requiresModule: 'pilotage.statistiques.sav' },
    { id: 'previsionnel', label: getShortLabel('pilotage.statistiques.previsionnel', 'Prévisionnel'), icon: CalendarClock, requiresModule: 'pilotage.statistiques.previsionnel' },
  ], [getShortLabel]);

  const visibleTabs = useMemo(() => {
    return statsTabs.map(tab => {
      if (!tab.requiresModule) return tab;
      return { ...tab, disabled: !hasModule(tab.requiresModule) };
    });
  }, [hasModule, statsTabs]);

  const effectiveTab = (visibleTabs.find(t => t.id === activeTab && !t.disabled)) ? activeTab : ((visibleTabs.find(t => !t.disabled)?.id as TabId) ?? 'general');

  useEffect(() => {
    if (effectiveTab !== activeTab) {
      setActiveTab(effectiveTab);
    }
  }, [effectiveTab, activeTab, setActiveTab]);

  const TabComponent = TAB_COMPONENTS[effectiveTab];

  const periodSelector = effectiveTab === 'previsionnel' 
    ? null 
    : <PeriodSelector />;

  const handleOpenDiffusion = () => {
    openInNewTabPreservingPreviewToken(ROUTES.agency.diffusion);
  };

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <PillTabsList tabs={visibleTabs} />

        <div className="flex items-center justify-between mt-4 gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenDiffusion}
            className="gap-2"
          >
            <Tv className="h-4 w-4" />
            Diffusion TV
          </Button>
          
          <div className="flex items-center gap-3">
            <PeriodDisplay />
            {periodSelector}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {TABS_CONFIG.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {effectiveTab === tab.id && <TabComponent />}
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}