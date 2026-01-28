/**
 * Page Liste des tickets Apogée - Vue tabulaire avec filtres et actions
 * Utilise usePersistedFilters pour persister les filtres et le ticket sélectionné
 */

import { useMemo, useState, useEffect } from 'react';
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
  Upload, 
  Download, 
  ChevronDown, 
  Flame, 
  Bug, 
  FileSpreadsheet, 
  Files, 
  ListChecks, 
  FileText, 
  Sheet, 
  FileDown, 
  Loader2, 
  ShieldAlert,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { useMyTicketRole, useTicketTransitions } from '../hooks/useTicketPermissions';
import { usePersistedListFilters } from '../hooks/usePersistedListFilters';
import { TicketTable } from '../components/TicketTable';
import { TicketTableFilters } from '../components/TicketTableFilters';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportKanban';
import type { ApogeeTicket, TicketFilters as Filters } from '../types';
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

  // Utiliser les filtres persistés (localStorage + URL pour le ticket sélectionné)
  const { 
    filters, 
    setFilters, 
    selectedTicketId, 
    setSelectedTicketId 
  } = usePersistedListFilters();
  const [showCreateDialog, setShowCreateDialog] = useState(() => {
    // Restaurer l'état du dialog depuis sessionStorage au montage
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
    updateTicket,
    deleteTicket,
  } = useApogeeTickets(filters);

  // Trouver le ticket sélectionné à partir de l'URL
  const selectedTicket = useMemo(() => {
    if (!selectedTicketId) return null;
    return tickets.find(t => t.id === selectedTicketId) ?? null;
  }, [selectedTicketId, tickets]);

  // Récupérer toutes les transitions autorisées
  const { data: allTransitions = [] } = useTicketTransitions();
  
  // Construire une map des transitions autorisées par statut de départ pour le rôle actuel
  const allowedTransitionsMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    statuses.forEach(status => {
      if (isPlatformAdmin) {
        // Admin peut tout faire
        map[status.id] = statuses.filter(s => s.id !== status.id).map(s => s.id);
      } else if (ticketRole) {
        // Filtrer par rôle
        map[status.id] = allTransitions
          .filter(t => t.from_status === status.id && t.allowed_role === ticketRole)
          .map(t => t.to_status);
      } else {
        map[status.id] = [];
      }
    });
    return map;
  }, [allTransitions, statuses, ticketRole, isPlatformAdmin]);

  const handleTicketClick = (ticket: ApogeeTicket) => {
    setSelectedTicketId(ticket.id);
  };

  const handleTicketUpdate = (ticketId: string, updates: Partial<ApogeeTicket>) => {
    updateTicket.mutate({ id: ticketId, ...updates });
  };

  const handleTicketDelete = (id: string) => {
    deleteTicket.mutate(id);
    setSelectedTicketId(null);
  };

  return (
    <div className={embedded ? "space-y-4" : "container mx-auto py-8 px-4 space-y-6"}>
      {!embedded && (
        <PageHeader 
          title="Ticketing - Liste"
          backTo="/"
          backLabel="Accueil"
        />
      )}
      
      {/* Header avec toggle Kanban/Liste */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue - only shown when not embedded */}
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

      {/* Filtres */}
      <TicketTableFilters
        filters={filters}
        onFiltersChange={setFilters}
        modules={modules}
        statuses={statuses}
      />

      {/* Table */}
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
          onTicketUpdate={handleTicketUpdate}
        />
      )}

      {/* Drawer détail */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicketId(null)}
        modules={modules}
        priorities={priorities}
        statuses={statuses}
        onUpdate={(updates) => {
          updateTicket.mutate(updates);
        }}
        onDelete={handleTicketDelete}
      />

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
