/**
 * StatsTabContent - Contenu de l'onglet "Statistiques"
 * Hub statistiques avec sous-onglets
 */

import { useState } from 'react';
import { Tv, ExternalLink, LayoutDashboard, Building2, Users, Layers, AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { useStatsHub } from '@/apogee-connect/components/stats-hub/StatsHubContext';
import { TABS_CONFIG, TabId } from '@/apogee-connect/components/stats-hub/types';
import { GeneralTab, ApporteursTab, TechniciensTab, UniversTab, SAVTab, PrevisionnelTab } from '@/apogee-connect/components/stats-hub/tabs';
import { PeriodSelector } from '@/apogee-connect/components/filters/PeriodSelector';
import { ROUTES } from '@/config/routes';

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
    <div className="container mx-auto py-4 px-4 space-y-4">
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
