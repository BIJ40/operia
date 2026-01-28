import { Building2, BarChart3, Users, Tv, ExternalLink } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';
import { MesApporteursTab } from '@/components/pilotage/MesApporteursTab';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectiveModules } from '@/hooks/access-rights/useEffectiveModules';
import { useSessionState } from '@/hooks/useSessionState';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { FiltersProvider } from '@/apogee-connect/contexts/FiltersContext';
import { SecondaryFiltersProvider } from '@/apogee-connect/contexts/SecondaryFiltersContext';
import { StatsHubProvider, useStatsHub } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { TABS_CONFIG, TabId } from '@/apogee-connect/components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { LayoutDashboard, Layers, AlertTriangle, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROUTES } from '@/config/routes';

type MainTab = 'agence' | 'stats' | 'apporteurs';

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

function StatsHubContent() {
  const { activeTab, setActiveTab } = useStatsHub();
  const TabComponent = TAB_COMPONENTS[activeTab];

  const periodSelector = activeTab === 'previsionnel' 
    ? <PeriodSelector variant="previsionnel" />
    : <PeriodSelector />;

  const handleOpenDiffusion = () => {
    window.open(ROUTES.agency.diffusion, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton TV et sélecteur de période */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleOpenDiffusion}
          className="gap-2"
        >
          <Tv className="h-4 w-4" />
          Diffusion TV
          <ExternalLink className="h-3 w-3" />
        </Button>
        {periodSelector}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="grid w-full grid-cols-6">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5 text-xs">
              {TAB_ICONS[tab.id]}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {TABS_CONFIG.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-4">
                {activeTab === tab.id && <TabComponent />}
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <div className="text-center text-xs text-muted-foreground">
        Touches 1-6 pour changer d'onglet
      </div>
    </div>
  );
}

function PilotageContent() {
  const { globalRole } = useAuth();
  const { hasModuleOption } = useEffectiveModules();
  const [activeTab, setActiveTab] = useSessionState<MainTab>('pilotage_active_tab', 'agence');
  
  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  // Vérifier les permissions pour chaque onglet
  const hasStatsAccess = isPlatformAdmin || hasModuleOption('pilotage_agence', 'stats_hub');
  const hasApporteursAccess = isPlatformAdmin || hasModuleOption('pilotage_agence', 'mes_apporteurs');

  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      {/* Header avec titre et onglets sur la même ligne */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)}>
        <div className="flex items-center gap-6 border-b border-border pb-0">
          {/* Titre */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Mon Agence</h1>
          </div>

          {/* Onglets */}
          <TabsList className="h-auto p-0 bg-transparent gap-0">
            <TabsTrigger 
              value="agence" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-helpconfort-blue data-[state=active]:bg-transparent bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:text-helpconfort-blue data-[state=active]:shadow-none"
            >
              <Building2 className="h-4 w-4 mr-2" />
              Mon agence
            </TabsTrigger>
            {hasStatsAccess && (
              <TabsTrigger 
                value="stats" 
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-helpconfort-blue data-[state=active]:bg-transparent bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:text-helpconfort-blue data-[state=active]:shadow-none"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques
              </TabsTrigger>
            )}
            {hasApporteursAccess && (
              <TabsTrigger 
                value="apporteurs" 
                className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-helpconfort-blue data-[state=active]:bg-transparent bg-transparent px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:text-helpconfort-blue data-[state=active]:shadow-none"
              >
                <Users className="h-4 w-4 mr-2" />
                Mes apporteurs
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="pt-4">
          <TabsContent value="agence" className="mt-0">
            <AgencyInfoCompact />
            <div className="mt-4">
              <ActionsAMenerTab />
            </div>
          </TabsContent>

          {hasStatsAccess && (
            <TabsContent value="stats" className="mt-0">
              <StatsHubProvider>
                <StatsHubContent />
              </StatsHubProvider>
            </TabsContent>
          )}

          {hasApporteursAccess && (
            <TabsContent value="apporteurs" className="mt-0">
              <MesApporteursTab />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}

export default function PilotageIndex() {
  return (
    <ApiToggleProvider>
      <AgencyProvider>
        <FiltersProvider>
          <SecondaryFiltersProvider>
            <PilotageContent />
          </SecondaryFiltersProvider>
        </FiltersProvider>
      </AgencyProvider>
    </ApiToggleProvider>
  );
}
