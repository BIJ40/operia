/**
 * Page Liste des tickets Apogée - Vue tabulaire avec onglets de tickets
 * Les tickets s'ouvrent en onglets au-dessus de la liste (max 10)
 * Auto-save des modifications avec debounce
 */

import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  LayoutGrid, 
  List, 
  Download, 
  ChevronDown, 
  FileText, 
  Sheet, 
  FileDown, 
  Loader2, 
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApogeeTicket, useApogeeTickets } from '../hooks/useApogeeTickets';
import { useMyTicketRole, useTicketTransitions } from '../hooks/useTicketPermissions';
import { usePersistedListFilters } from '../hooks/usePersistedListFilters';
import { useTicketTabs } from '../hooks/useTicketTabs';
import { TicketTable } from '../components/TicketTable';
import { TicketTableFilters } from '../components/TicketTableFilters';
import { TicketTabBar } from '../components/TicketTabBar';
import { TicketInlinePanel } from '../components/TicketInlinePanel';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportKanban';
import type { ApogeeTicket } from '../types';
import { ROUTES } from '@/config/routes';
import { PageHeader } from '@/components/layout/PageHeader';

interface ApogeeTicketsListPageProps {
  embedded?: boolean;
}

export default function ApogeeTicketsListPage({ embedded = false }: ApogeeTicketsListPageProps) {
  const { data: myTicketRole, isLoading: isLoadingRole, error: roleError } = useMyTicketRole();

  // Chargement des droits
  if (isLoadingRole || !myTicketRole) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Chargement de vos droits tickets…</span>
      </div>
    );
  }

  // Erreur systémique
  if (roleError) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            Impossible de récupérer vos droits d'accès au module tickets.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Pas de droit ticketing
  if (!myTicketRole.canUseTicketing) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Module tickets non disponible</AlertTitle>
          <AlertDescription>
            Votre profil n'a pas accès au module <strong>Ticketing</strong>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ApogeeTicketsListContent roleInfo={myTicketRole} embedded={embedded} />;
}

function ApogeeTicketsListContent({ roleInfo, embedded = false }: { roleInfo: NonNullable<ReturnType<typeof useMyTicketRole>['data']>; embedded?: boolean }) {
  const navigate = useNavigate();
  const { canViewKanban, canImport, canManage, ticketRole, isPlatformAdmin } = roleInfo;

  // Filtres persistés
  const { filters, setFilters } = usePersistedListFilters();
  
  // Système d'onglets tickets
  const {
    openTabs,
    activeTabId,
    setActiveTabId,
    openTicketTab,
    closeTab,
    closeAllTabs,
    queueChange,
    isSaving,
  } = useTicketTabs();

  const [showCreateDialog, setShowCreateDialog] = useState(() => {
    try {
      const saved = sessionStorage.getItem('create-ticket-dialog-open');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const {
    tickets,
    statuses,
    modules,
    priorities,
    ownerSides,
    isLoading,
    createTicket,
    deleteTicket,
  } = useApogeeTickets(filters);

  // Récupérer toutes les transitions autorisées
  const { data: allTransitions = [] } = useTicketTransitions();
  
  // Map des transitions autorisées par statut
  const allowedTransitionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    statuses.forEach(status => {
      if (isPlatformAdmin) {
        map[status.id] = statuses.filter(s => s.id !== status.id).map(s => s.id);
      } else if (ticketRole) {
        map[status.id] = allTransitions
          .filter(t => t.from_status === status.id && t.allowed_role === ticketRole)
          .map(t => t.to_status);
      } else {
        map[status.id] = [];
      }
    });
    return map;
  }, [allTransitions, statuses, ticketRole, isPlatformAdmin]);

  // Ticket actif depuis la liste filtrée (peut être absent si une recherche/filtre est appliqué)
  const activeTicketFromList = useMemo(() => {
    if (!activeTabId) return null;
    return tickets.find(t => t.id === activeTabId) ?? null;
  }, [activeTabId, tickets]);

  // Fallback robuste : charger le ticket par ID même s'il n'est plus dans la liste filtrée
  const { ticket: activeTicketFromDb, isLoading: isLoadingActiveTicket } = useApogeeTicket(activeTabId);

  const activeTicket = activeTicketFromList ?? activeTicketFromDb;

  const handleTicketClick = (ticket: ApogeeTicket) => {
    openTicketTab(ticket);
  };

  const handleTicketDelete = (id: string) => {
    deleteTicket.mutate(id);
    closeTab(id);
  };

  // Handle inline ticket updates via queue (auto-save)
  const handleTicketQueueChange = (ticketId: string, updates: Partial<ApogeeTicket>) => {
    queueChange(ticketId, updates);
  };

  // Vue active: null = liste, sinon ticket ID
  const showingList = activeTabId === null;

  return (
    <div className={embedded ? "flex flex-col h-full" : "container mx-auto py-8 px-4 flex flex-col h-[calc(100vh-6rem)]"}>
      {!embedded && (
        <PageHeader 
          title="Ticketing - Liste"
          backTo="/"
          backLabel="Accueil"
        />
      )}
      
      {/* Header avec toggle Kanban/Liste */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue */}
          {!embedded && (
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => navigate(ROUTES.projects.kanban)}
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Kanban
              </Button>
              <Button
                variant="default"
                size="sm"
                className="h-8"
              >
                <List className="h-4 w-4 mr-1" />
                Liste
              </Button>
            </div>
          )}

          {canViewKanban && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau ticket</span>
            </Button>
          )}

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Exporter</span>
                <ChevronDown className="h-4 w-4 sm:ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background border shadow-lg z-50">
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
      </div>

      {/* Barre d'onglets: LISTE fixe + tickets à droite */}
      <TicketTabBar
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onCloseAll={closeAllTabs}
        isSaving={isSaving}
      />

      {/* Zone de contenu: soit la liste, soit le ticket actif - avec bordure continue depuis l'onglet */}
      <div className={cn(
        "flex-1 overflow-hidden mx-2 mb-2",
        showingList 
          ? "bg-sky-50 dark:bg-sky-950/50 border-2 border-t-0 border-sky-400 dark:border-sky-500 rounded-b-2xl rounded-tr-2xl" 
          : "bg-violet-50 dark:bg-violet-950/50 border-2 border-t-0 border-violet-400 dark:border-violet-500 rounded-2xl"
      )}>
        {showingList ? (
          /* Vue Liste */
          <div className="h-full flex flex-col">
            {/* Filtres */}
            <div className="py-3">
              <TicketTableFilters
                filters={filters}
                onFiltersChange={setFilters}
                modules={modules}
                statuses={statuses}
              />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <TicketTable
                  tickets={tickets}
                  modules={modules}
                  statuses={statuses}
                  ownerSides={ownerSides}
                  roleInfo={roleInfo}
                  allowedTransitionsMap={allowedTransitionsMap}
                  onTicketClick={handleTicketClick}
                  onTicketUpdate={() => {}}
                />
              )}
            </div>
          </div>
        ) : activeTicket ? (
          /* Vue Ticket en onglet */
          <div className="h-full">
            <TicketInlinePanel
              key={activeTicket.id}
              ticket={activeTicket}
              modules={modules}
              priorities={priorities}
              statuses={statuses}
              onQueueChange={handleTicketQueueChange}
              onDelete={handleTicketDelete}
              onClose={() => closeTab(activeTicket.id)}
            />
          </div>
        ) : isLoadingActiveTicket ? (
          /* Chargement du ticket hors liste (ex: après filtre/recherche) */
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Chargement du ticket…</span>
          </div>
        ) : (
          /* Fallback si ticket non trouvé */
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Ticket introuvable. <Button variant="link" onClick={() => setActiveTabId(null)}>Retour à la liste</Button></p>
          </div>
        )}
      </div>

      {/* Dialog création */}
      <CreateTicketDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        modules={modules}
        onCreate={async (ticket) => {
          const result = await createTicket.mutateAsync(ticket);
          return result?.id;
        }}
        isCreating={createTicket.isPending}
        userTicketRole={ticketRole}
      />
    </div>
  );
}