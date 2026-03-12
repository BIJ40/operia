import { Building2, BarChart3, Users, Tv } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AgencyInfoCompact } from '@/components/pilotage/AgencyInfoCompact';
import { ActionsAMenerTab } from '@/components/pilotage/ActionsAMenerTab';
import { MesApporteursTab } from '@/components/pilotage/MesApporteursTab';
import { usePermissions } from '@/contexts/PermissionsContext';
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
import { openInNewTabPreservingPreviewToken } from '@/lib/openInNewTab';

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
    // Nouveau onglet + préservation du token de preview si présent
    openInNewTabPreservingPreviewToken(ROUTES.agency.diffusion);
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
  const { globalRole, hasModule } = usePermissions();
  const [activeTab, setActiveTab] = useSessionState<MainTab>('pilotage_active_tab', 'agence');
  
  const isPlatformAdmin = globalRole === 'superadmin' || globalRole === 'platform_admin';

  // Vérifier les permissions pour chaque onglet — clés canoniques G3
  const hasStatsAccess = isPlatformAdmin || hasModule('pilotage.statistiques' as any);
  const hasApporteursAccess = isPlatformAdmin || hasModule('organisation.apporteurs' as any);

  return (
    <div className="container mx-auto py-4 px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MainTab)}>
        <div className="flex items-end gap-1 pb-0">
        <TabsList className="h-auto p-0 bg-transparent gap-0.5 items-end">
            {/* Onglet Mon Agence */}
            <TabsTrigger 
              value="agence" 
              className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                  <Building2 className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-lg font-semibold tracking-tight">Mon Agence</span>
              </div>
            </TabsTrigger>
            {hasStatsAccess && (
              <TabsTrigger 
                value="stats" 
                className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                  data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                  data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                    <BarChart3 className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight">Statistiques</span>
                </div>
              </TabsTrigger>
            )}
            {hasApporteursAccess && (
              <TabsTrigger 
                value="apporteurs" 
                className="relative px-5 py-3 rounded-t-2xl border-2 border-b-0 transition-all duration-200
                  data-[state=inactive]:bg-muted/40 data-[state=inactive]:border-border/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:border-border/60
                  data-[state=active]:bg-background data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:z-10 data-[state=active]:-mb-[2px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/70 flex items-center justify-center shadow-sm">
                    <Users className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-lg font-semibold tracking-tight">Mes apporteurs</span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>
          {/* Ligne de séparation qui passe "sous" l'onglet actif */}
          <div className="flex-1 border-b border-border" />
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
