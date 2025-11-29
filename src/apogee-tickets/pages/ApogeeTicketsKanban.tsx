/**
 * Page principale Kanban des tickets Apogée
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Upload, AlertCircle, Settings, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { TicketKanban } from '../components/TicketKanban';
import { TicketFilters } from '../components/TicketFilters';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { ActionsConfigDialog } from '../components/ActionsConfigDialog';
import { useTicketQualification } from '../hooks/useTicketQualification';
import type { ApogeeTicket, TicketFilters as Filters } from '../types';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';

export default function ApogeeTicketsKanban() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<Filters>({});
  const [selectedTicket, setSelectedTicket] = useState<ApogeeTicket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const {
    tickets,
    statuses,
    modules,
    priorities,
    isLoading,
    createTicket,
    updateTicket,
    updateKanbanStatus,
  } = useApogeeTickets(filters);

  const { qualifyAllUnqualified, isQualifying } = useTicketQualification();

  // Compteurs
  const incompleteCount = tickets.filter(t => t.needs_completion).length;
  const unqualifiedCount = tickets.filter(t => !t.is_qualified).length;

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateKanbanStatus.mutate({ ticketId, newStatus });
  };

  const handleTicketClick = (ticket: ApogeeTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdate = (updates: Partial<ApogeeTicket> & { id: string }) => {
    updateTicket.mutate(updates);
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau ticket
          </Button>
          <Link to="/admin/apogee-tickets/import-bugs">
            <Button variant="default" className="bg-orange-600 hover:bg-orange-700">
              <Upload className="h-4 w-4 mr-2" />
              Import BUGS
            </Button>
          </Link>
          <Link to="/admin/apogee-tickets/import-v1">
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
              <Upload className="h-4 w-4 mr-2" />
              Import V1
            </Button>
          </Link>
          <Link to={ROUTES.admin.apogeeTicketsImport}>
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import général
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {unqualifiedCount > 0 && (
            <Button 
              variant="outline" 
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
              onClick={qualifyAllUnqualified}
              disabled={isQualifying}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isQualifying ? 'Qualification...' : `Qualifier ${unqualifiedCount} ticket(s)`}
            </Button>
          )}
          {incompleteCount > 0 && (
            <Link to={ROUTES.admin.apogeeTicketsIncomplete}>
              <Button variant="outline" className="text-orange-600 border-orange-300 hover:bg-orange-50">
                <AlertCircle className="h-4 w-4 mr-2" />
                {incompleteCount} à compléter
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Filtres */}
      <TicketFilters
        filters={filters}
        onFiltersChange={setFilters}
        modules={modules}
        priorities={priorities}
      />

      {/* Stats rapides */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline" className={unqualifiedCount > 0 ? 'text-purple-600 border-purple-300' : 'text-green-600 border-green-300'}>
          {unqualifiedCount > 0 ? `${unqualifiedCount} non qualifiés` : '✓ Tous qualifiés'}
        </Badge>
        {statuses.map((status) => {
          const count = tickets.filter(t => t.kanban_status === status.id).length;
          if (count === 0) return null;
          return (
            <Badge key={status.id} variant="outline" className="text-xs">
              {status.label}: {count}
            </Badge>
          );
        })}
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <TicketKanban
          tickets={tickets}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          onTicketClick={handleTicketClick}
        />
      )}

      {/* Drawer détail */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        modules={modules}
        priorities={priorities}
        statuses={statuses}
        onUpdate={handleTicketUpdate}
      />

      {/* Dialog création */}
      <CreateTicketDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        modules={modules}
        priorities={priorities}
        onCreate={(ticket) => createTicket.mutate(ticket)}
        isCreating={createTicket.isPending}
      />

      {/* Dialog configuration (admin only) */}
      <ActionsConfigDialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
        statuses={statuses}
        modules={modules}
        priorities={priorities}
      />
    </div>
  );
}
