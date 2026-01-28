/**
 * TicketingTabContent - Contenu de l'onglet "Ticketing"
 * Avec sous-onglets: Kanban, Liste, Historique
 */

import { lazy, Suspense, useState, useEffect } from 'react';
import { Loader2, LayoutGrid, List, History } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSearchParams } from 'react-router-dom';

// Lazy load des contenus
const TicketingKanbanView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsKanban'));
const TicketingListView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsList'));
const TicketingHistoryView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsHistory'));

type TicketingSubTab = 'kanban' | 'liste' | 'historique';

const TICKETING_SUBTABS: PillTabConfig[] = [
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'liste', label: 'Liste', icon: List },
  { id: 'historique', label: 'Historique', icon: History },
];

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function TicketingTabContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persister le sous-onglet dans l'URL
  const subtabParam = searchParams.get('subtab') as TicketingSubTab | null;
  const [activeSubTab, setActiveSubTab] = useState<TicketingSubTab>(
    subtabParam && ['kanban', 'liste', 'historique'].includes(subtabParam) 
      ? subtabParam 
      : 'kanban'
  );

  // Synchroniser avec l'URL
  useEffect(() => {
    const current = new URLSearchParams(searchParams);
    if (activeSubTab !== 'kanban') {
      current.set('subtab', activeSubTab);
    } else {
      current.delete('subtab');
    }
    setSearchParams(current, { replace: true });
  }, [activeSubTab, setSearchParams, searchParams]);

  const handleTabChange = (value: string) => {
    setActiveSubTab(value as TicketingSubTab);
  };

  return (
    <div className="py-3 px-2 sm:px-4 space-y-4">
      <Tabs value={activeSubTab} onValueChange={handleTabChange}>
        <PillTabsList tabs={TICKETING_SUBTABS} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeSubTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <TabsContent value="kanban" className="mt-4">
              {activeSubTab === 'kanban' && (
                <Suspense fallback={<LoadingFallback />}>
                  <TicketingKanbanView embedded />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="liste" className="mt-4">
              {activeSubTab === 'liste' && (
                <Suspense fallback={<LoadingFallback />}>
                  <TicketingListView embedded />
                </Suspense>
              )}
            </TabsContent>

            <TabsContent value="historique" className="mt-4">
              {activeSubTab === 'historique' && (
                <Suspense fallback={<LoadingFallback />}>
                  <TicketingHistoryView embedded />
                </Suspense>
              )}
            </TabsContent>
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
