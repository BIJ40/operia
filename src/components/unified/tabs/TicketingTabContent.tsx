/**
 * TicketingTabContent - Contenu de l'onglet "Ticketing"
 * Avec sous-onglets: Kanban, Liste, Historique, Revue + pseudo-onglet Exporter
 */

import { lazy, Suspense, useState, useEffect } from 'react';
import { Loader2, LayoutGrid, List, History, ListChecks, Download, FileText, Sheet, FileDown } from 'lucide-react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';
import { PillTabsList, PillTabConfig } from '@/components/ui/pill-tabs';
import { useSearchParams } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useApogeeTickets } from '@/apogee-tickets/hooks/useApogeeTickets';
import { exportToCSV, exportToExcel, exportToPDF } from '@/apogee-tickets/utils/exportKanban';
import { cn } from '@/lib/utils';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';

// Lazy load des contenus
const TicketingKanbanView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsKanban'));
const TicketingListView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsList'));
const TicketingHistoryView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsHistory'));
const TicketingReviewView = lazy(() => import('@/apogee-tickets/pages/ApogeeTicketsReview'));

type TicketingSubTab = 'kanban' | 'liste' | 'historique' | 'revue';

const TICKETING_SUBTABS: PillTabConfig[] = [
  { id: 'liste', label: 'Liste', icon: List },
  { id: 'kanban', label: 'Kanban', icon: LayoutGrid },
  { id: 'revue', label: 'Revue', icon: ListChecks },
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
  const { hasModule } = usePermissionsBridge();

  if (!hasModule('ticketing')) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Module Ticketing non disponible</p>
        <p className="text-sm text-muted-foreground">Votre profil n&apos;a pas accès au module Ticketing.</p>
      </div>
    );
  }

  const [searchParams, setSearchParams] = useSearchParams();
  
  // Données pour export
  const { tickets, statuses, modules, priorities, ownerSides } = useApogeeTickets();
  
  // Persister le sous-onglet dans l'URL
  const subtabParam = searchParams.get('subtab') as TicketingSubTab | null;
  const [activeSubTab, setActiveSubTab] = useState<TicketingSubTab>(
    subtabParam && ['kanban', 'liste', 'historique', 'revue'].includes(subtabParam) 
      ? subtabParam 
      : 'liste'
  );

  // Synchroniser avec l'URL
  useEffect(() => {
    const current = new URLSearchParams(searchParams);
    if (activeSubTab !== 'liste') {
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
        {/* Navigation avec pseudo-onglet Exporter */}
        <div className="flex items-center justify-center gap-2">
          <PillTabsList tabs={TICKETING_SUBTABS} />
          
          {/* Pseudo-onglet Exporter - style identique aux pills */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "group flex items-center gap-2 px-4 py-2.5 rounded-xl",
                  "border-2 border-border/50 bg-card/80 backdrop-blur-sm",
                  "text-muted-foreground font-medium text-sm",
                  "shadow-sm hover:shadow-md hover:border-border",
                  "transition-all duration-200",
                  "hover:bg-gradient-to-br hover:from-warm-teal/20 hover:to-accent/15 hover:border-warm-teal/40 hover:text-warm-teal"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-lg",
                  "transition-colors duration-200",
                  "bg-warm-teal/15 text-warm-teal group-hover:bg-warm-teal/25"
                )}>
                  <Download className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline">Exporter</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => exportToCSV({ tickets, statuses, modules, priorities, ownerSides })}>
                <FileText className="h-4 w-4 mr-2 text-green-600" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel({ tickets, statuses, modules, priorities, ownerSides })}>
                <Sheet className="h-4 w-4 mr-2 text-emerald-600" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportToPDF({ tickets, statuses, modules, priorities, ownerSides })}>
                <FileDown className="h-4 w-4 mr-2 text-red-600" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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

            <TabsContent value="revue" className="mt-4">
              {activeSubTab === 'revue' && (
                <Suspense fallback={<LoadingFallback />}>
                  <TicketingReviewView />
                </Suspense>
              )}
            </TabsContent>

          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
