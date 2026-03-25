/**
 * StatsTabContent - Contenu de l'onglet "Statistiques"
 * Hub statistiques avec sous-onglets filtrés par permissions
 */

import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useNavigationMode } from '@/hooks/useNavigationMode';
import { Tv, LayoutDashboard, Building2, Users, Layers, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useStatsHub } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { TabId } from '@/apogee-connect/components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { PeriodDisplay } from '@/apogee-connect/components/filters/PeriodDisplay';
import { openInNewTabPreservingPreviewToken } from '@/lib/openInNewTab';
import { ROUTES } from '@/config/routes';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';
import { useModuleLabels } from '@/hooks/useModuleLabels';
import { 
  SimpleFolderTabsList, 
  DraggableFolderContentContainer,
  FolderTabConfig 
} from '@/components/ui/draggable-folder-tabs';

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  general: GeneralTab,
  apporteurs: ApporteursTab,
  techniciens: TechniciensTab,
  univers: UniversTab,
  sav: SAVTab,
  previsionnel: PrevisionnelTab,
};

const TAB_ACCENT_COLORS: Record<string, string> = {
  blue: 'hsl(var(--warm-blue))',
  purple: 'hsl(var(--warm-purple))',
  green: 'hsl(var(--warm-green))',
  orange: 'hsl(var(--warm-orange))',
  pink: 'hsl(var(--warm-pink))',
  teal: 'hsl(var(--warm-teal))',
};

export default function StatsTabContent() {
  const { activeTab, setActiveTab } = useStatsHub();
  const { hasModule } = usePermissions();
  const { getShortLabel } = useModuleLabels();
  const { mode: navMode } = useNavigationMode();

  const statsTabs: (FolderTabConfig & { requiresModule?: ModuleKey })[] = useMemo(() => [
    { id: 'general', label: getShortLabel('pilotage.statistiques.general', 'Général'), icon: LayoutDashboard, accent: 'blue' as const, requiresModule: 'pilotage.statistiques.general' as ModuleKey },
    { id: 'apporteurs', label: getShortLabel('pilotage.statistiques.apporteurs', 'Apporteurs'), icon: Building2, accent: 'purple' as const, requiresModule: 'pilotage.statistiques.apporteurs' as ModuleKey },
    { id: 'techniciens', label: getShortLabel('pilotage.statistiques.techniciens', 'Techniciens'), icon: Users, accent: 'green' as const, requiresModule: 'pilotage.statistiques.techniciens' as ModuleKey },
    { id: 'univers', label: getShortLabel('pilotage.statistiques.univers', 'Univers'), icon: Layers, accent: 'orange' as const, requiresModule: 'pilotage.statistiques.univers' as ModuleKey },
    { id: 'sav', label: getShortLabel('pilotage.statistiques.sav', 'SAV'), icon: AlertTriangle, accent: 'pink' as const, requiresModule: 'pilotage.statistiques.sav' as ModuleKey },
    { id: 'previsionnel', label: getShortLabel('pilotage.statistiques.previsionnel', 'Prévisionnel'), icon: CalendarClock, accent: 'teal' as const, requiresModule: 'pilotage.statistiques.previsionnel' as ModuleKey },
  ], [getShortLabel]);

  const { isDeployedModule } = usePermissions();

  const visibleTabs = useMemo(() => {
    return statsTabs
      .filter(tab => {
        if (tab.requiresModule && !isDeployedModule(tab.requiresModule)) return false;
        return true;
      })
      .map(tab => {
        if (!tab.requiresModule) return tab;
        return { ...tab, disabled: !hasModule(tab.requiresModule) };
      });
  }, [hasModule, isDeployedModule, statsTabs]);

  const effectiveTab = (visibleTabs.find(t => t.id === activeTab && !(t as any).disabled)) ? activeTab : ((visibleTabs.find(t => !(t as any).disabled)?.id as TabId) ?? 'general');

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

  // Get accent color for the active tab's content container
  const activeTabConfig = visibleTabs.find(t => t.id === effectiveTab);
  const activeAccentColor = activeTabConfig?.accent ? TAB_ACCENT_COLORS[activeTabConfig.accent] : undefined;

  return (
    <div className={cn("container mx-auto max-w-app", navMode === 'header' ? 'pt-1 px-2 sm:px-4 space-y-0' : 'py-6 px-2 sm:px-4 space-y-0')}>
      <SimpleFolderTabsList 
        tabs={visibleTabs} 
        activeTab={effectiveTab} 
        onTabChange={(v) => setActiveTab(v as TabId)} 
      />

      <DraggableFolderContentContainer accentColor={activeAccentColor}>
        <div className="flex items-center justify-between mb-4 gap-3">
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
            <TabComponent />
          </motion.div>
        </AnimatePresence>
      </DraggableFolderContentContainer>
    </div>
  );
}
