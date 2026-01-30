/**
 * StatsTabContent - Contenu de l'onglet "Statistiques"
 * Hub statistiques avec sous-onglets
 */

import { Tv, ExternalLink, LayoutDashboard, Building2, Users, Layers, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { useStatsHub } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { TABS_CONFIG, TabId } from '@/apogee-connect/components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { PeriodDisplay } from '@/apogee-connect/components/filters/PeriodDisplay';
import { ROUTES } from '@/config/routes';

const STATS_TABS: PillTabConfig[] = [
  { id: 'general', label: 'Général', icon: LayoutDashboard },
  { id: 'apporteurs', label: 'Apporteurs', icon: Building2 },
  { id: 'techniciens', label: 'Techniciens', icon: Users },
  { id: 'univers', label: 'Univers', icon: Layers },
  { id: 'sav', label: 'SAV', icon: AlertTriangle },
  { id: 'previsionnel', label: 'Prévisionnel', icon: CalendarClock },
];

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
  const TabComponent = TAB_COMPONENTS[activeTab];

  const periodSelector = activeTab === 'previsionnel' 
    ? <PeriodSelector variant="previsionnel" />
    : <PeriodSelector />;

  const handleOpenDiffusion = () => {
    window.open(ROUTES.agency.diffusion, '_blank');
  };

  return (
    <div className="py-6 px-2 sm:px-4 space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <PillTabsList tabs={STATS_TABS} />

        {/* Diffusion TV + Période sélectionnée + Sélecteur de période */}
        <div className="flex items-center justify-between mt-4 gap-3">
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
          
          <div className="flex items-center gap-3">
            {/* Affichage de la période sélectionnée */}
            <PeriodDisplay />
            {periodSelector}
          </div>
        </div>

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

    </div>
  );
}
