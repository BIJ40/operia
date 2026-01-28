/**
 * DiversTabContent - Contenu de l'onglet "Divers"
 * Sous-onglets: Apporteurs, Plannings, Réunions, Documents
 */

import { lazy, Suspense } from 'react';
import { FileText, Users2, Loader2, Users, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSessionState } from '@/hooks/useSessionState';

const RHMeetingsPage = lazy(() => import('@/pages/rh/RHMeetingsPage'));
const DocGenPage = lazy(() => import('@/pages/rh/DocGenPage'));
const MesApporteursTab = lazy(() => import('@/components/pilotage/MesApporteursTab').then(m => ({ default: m.MesApporteursTab })));
const PlanningHebdo = lazy(() => import('@/pages/PlanningTechniciensSemaine'));

type DiversSubTab = 'apporteurs' | 'plannings' | 'reunions' | 'docgen';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DiversTabContent() {
  const [activeSubTab, setActiveSubTab] = useSessionState<DiversSubTab>('divers_sub_tab', 'apporteurs');

  const subTabs = [
    { id: 'apporteurs' as const, label: 'Apporteurs', icon: Users },
    { id: 'plannings' as const, label: 'Plannings', icon: CalendarDays },
    { id: 'reunions' as const, label: 'Réunions', icon: Users2 },
    { id: 'docgen' as const, label: 'Documents', icon: FileText },
  ];

  return (
    <div className="py-3 px-2 sm:px-4">
      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as DiversSubTab)}>
        <TabsList className="flex flex-wrap justify-start gap-2 bg-transparent h-auto p-2 mb-4">
          {subTabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
              >
                <TabsTrigger 
                  value={tab.id} 
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                    bg-background border border-border rounded-xl shadow-sm
                    transition-all duration-300 ease-out
                    hover:scale-105 hover:shadow-md hover:border-primary/30 hover:bg-primary/5
                    data-[state=active]:bg-primary data-[state=active]:text-primary-foreground 
                    data-[state=active]:border-primary data-[state=active]:shadow-lg 
                    data-[state=active]:scale-105"
                >
                  <Icon className="w-4 h-4 transition-transform duration-200" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              </motion.div>
            );
          })}
        </TabsList>

        <TabsContent value="apporteurs" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <MesApporteursTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="plannings" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <PlanningHebdo />
          </Suspense>
        </TabsContent>

        <TabsContent value="reunions" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <RHMeetingsPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="docgen" className="mt-0">
          <Suspense fallback={<LoadingFallback />}>
            <DocGenPage />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
