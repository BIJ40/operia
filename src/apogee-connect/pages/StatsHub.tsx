import { useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsHubProvider, useStatsHub } from '../components/stats-hub/StatsHubContext';
import { TABS_CONFIG, TabId } from '../components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '../components/stats-hub/tabs';
import { LayoutDashboard, Building2, Users, Layers, AlertTriangle, CalendarClock, Tv } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiltersProvider } from '../contexts/FiltersContext';
import { ApiToggleProvider } from '../contexts/ApiToggleContext';
import { AgencyProvider } from '../contexts/AgencyContext';
import { SecondaryFiltersProvider } from '../contexts/SecondaryFiltersContext';
import { PeriodSelector } from '../components/filters/PeriodSelector';
import { PeriodDisplay } from '../components/filters/PeriodDisplay';
import { Button } from '@/components/ui/button';
import { openInNewTabPreservingPreviewToken } from '@/lib/openInNewTab';
import { ROUTES } from '@/config/routes';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ModuleKey } from '@/types/modules';

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  general: <LayoutDashboard className="h-4 w-4" />,
  apporteurs: <Building2 className="h-4 w-4" />,
  techniciens: <Users className="h-4 w-4" />,
  univers: <Layers className="h-4 w-4" />,
  sav: <AlertTriangle className="h-4 w-4" />,
  previsionnel: <CalendarClock className="h-4 w-4" />,
};

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  general: GeneralTab,
  apporteurs: ApporteursTab,
  techniciens: TechniciensTab,
  univers: UniversTab,
  sav: SAVTab,
  previsionnel: PrevisionnelTab,
};

const TAB_MODULE_KEYS: Record<TabId, ModuleKey> = {
  general: 'pilotage.statistiques.general',
  apporteurs: 'pilotage.statistiques.apporteurs',
  techniciens: 'pilotage.statistiques.techniciens',
  univers: 'pilotage.statistiques.univers',
  sav: 'pilotage.statistiques.sav',
  previsionnel: 'pilotage.statistiques.previsionnel',
};

function StatsHubContent() {
  const { activeTab, setActiveTab } = useStatsHub();
  const { hasModule, isDeployedModule } = usePermissions();

  const visibleTabs = useMemo(() => {
    return TABS_CONFIG.filter(tab => {
      const moduleKey = TAB_MODULE_KEYS[tab.id];
      return hasModule(moduleKey) && isDeployedModule(moduleKey);
    });
  }, [hasModule, isDeployedModule]);

  const effectiveTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : (visibleTabs[0]?.id as TabId ?? 'general');

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
    <div className="container mx-auto max-w-app px-4 py-6 space-y-4">
      <Tabs value={effectiveTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="flex flex-wrap justify-center gap-2 bg-transparent h-auto p-0">
          {visibleTabs.map(tab => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/30 text-muted-foreground shadow-sm transition-all duration-200 hover:bg-muted/40 data-[state=active]:bg-gradient-to-br data-[state=active]:from-warm-blue/15 data-[state=active]:to-warm-teal/10 data-[state=active]:text-warm-blue data-[state=active]:border-warm-blue/30 data-[state=active]:shadow-md"
            >
              {TAB_ICONS[tab.id]}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleOpenDiffusion}
        >
          <Tv className="h-4 w-4" />
          <span>Diffusion TV</span>
        </Button>
        <div className="flex items-center gap-3 shrink-0">
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
            {visibleTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                {effectiveTab === tab.id && <TabComponent />}
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

export default function StatsHub() {
  return (
    <AgencyProvider>
      <ApiToggleProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <StatsHubProvider>
              <StatsHubContent />
            </StatsHubProvider>
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </ApiToggleProvider>
    </AgencyProvider>
  );
}