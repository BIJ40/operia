import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatsHubProvider, useStatsHub } from '../components/stats-hub/StatsHubContext';
import { StatModal } from '../components/stats-hub/StatModal';
import { TABS_CONFIG, TabId } from '../components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab } from '../components/stats-hub/tabs';
import { LayoutDashboard, Building2, Users, Layers, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ROUTES } from '@/config/routes';
import { motion, AnimatePresence } from 'framer-motion';

const TAB_ICONS: Record<TabId, React.ReactNode> = {
  general: <LayoutDashboard className="h-4 w-4" />,
  apporteurs: <Building2 className="h-4 w-4" />,
  techniciens: <Users className="h-4 w-4" />,
  univers: <Layers className="h-4 w-4" />,
  sav: <AlertTriangle className="h-4 w-4" />,
};

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  general: GeneralTab,
  apporteurs: ApporteursTab,
  techniciens: TechniciensTab,
  univers: UniversTab,
  sav: SAVTab,
};

function StatsHubContent() {
  const { activeTab, setActiveTab } = useStatsHub();
  const TabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Hub Statistiques"
        backTo={ROUTES.pilotage.index}
        backLabel="Mon Agence"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          {TABS_CONFIG.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
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
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                {activeTab === tab.id && <TabComponent />}
              </TabsContent>
            ))}
          </motion.div>
        </AnimatePresence>
      </Tabs>

      <StatModal />

      {/* Keyboard hint */}
      <div className="text-center text-xs text-muted-foreground">
        Touches 1-5 pour changer d'onglet • Cliquer sur une tuile pour les détails
      </div>
    </div>
  );
}

export default function StatsHub() {
  return (
    <StatsHubProvider>
      <StatsHubContent />
    </StatsHubProvider>
  );
}
