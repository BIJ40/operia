/**
 * Page principale Kanban des tickets Apogée
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Upload, AlertCircle, Settings, Sparkles, ListChecks, Flame, ChevronDown, Bug, FileSpreadsheet, Files, FolderOpen, Columns, Eye, EyeOff, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { TicketKanban } from '../components/TicketKanban';
import { TicketFilters } from '../components/TicketFilters';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { ActionsConfigDialog } from '../components/ActionsConfigDialog';
import { useTicketQualification } from '../hooks/useTicketQualification';
import { useRecalculateHeatPriority } from '../hooks/useRecalculateHeatPriority';
import { useMyTicketRole } from '../hooks/useTicketPermissions';
import type { ApogeeTicket, TicketFilters as Filters } from '../types';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { useAuth } from '@/contexts/AuthContext';

export default function ApogeeTicketsKanban() {
  const { isAdmin } = useAuth();
  const { data: myTicketRole } = useMyTicketRole();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Filters>({});
  const [selectedTicket, setSelectedTicket] = useState<ApogeeTicket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [columnWidth, setColumnWidth] = useState(288); // 288px = w-72
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());

  const toggleColumnVisibility = (statusId: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(statusId)) {
        next.delete(statusId);
      } else {
        next.add(statusId);
      }
      return next;
    });
  };

  const showAllColumns = () => setHiddenColumns(new Set());
  const hideAllColumns = () => setHiddenColumns(new Set(statuses.map(s => s.id)));

  const {
    tickets,
    statuses,
    modules,
    priorities,
    impactTags,
    ownerSides,
    isLoading,
    createTicket,
    updateTicket,
    updateKanbanStatus,
  } = useApogeeTickets(filters);

  const { qualifyAllUnqualified, isQualifying } = useTicketQualification();
  const { recalculateAll, isRecalculating } = useRecalculateHeatPriority();

  // Compteurs
  const incompleteCount = tickets.filter(t => t.needs_completion).length;
  const unqualifiedCount = tickets.filter(t => !t.is_qualified).length;
  const toClassifyCount = tickets.filter(t => t.kanban_status === 'SPEC_A_FAIRE').length;

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateKanbanStatus.mutate({ ticketId, newStatus });
  };

  const handleTicketClick = (ticket: ApogeeTicket) => {
    setSelectedTicket(ticket);
  };

  const handleTicketUpdate = (updates: Partial<ApogeeTicket> & { id: string }) => {
    updateTicket.mutate(updates);
    // Mettre à jour l'état local du ticket sélectionné pour refléter les changements immédiatement
    if (selectedTicket && selectedTicket.id === updates.id) {
      setSelectedTicket({ ...selectedTicket, ...updates });
    }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Importer
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => navigate(ROUTES.admin.apogeeTicketsImportPriorities)}>
                <Flame className="h-4 w-4 mr-2 text-red-600" />
                Priorités A / B
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/apogee-tickets/import-bugs')}>
                <Bug className="h-4 w-4 mr-2 text-orange-600" />
                Import BUGS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/apogee-tickets/import-v1')}>
                <FileSpreadsheet className="h-4 w-4 mr-2 text-blue-600" />
                Import V1
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(ROUTES.admin.apogeeTicketsImport)}>
                <Files className="h-4 w-4 mr-2" />
                Import général
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Link to={ROUTES.admin.apogeeTicketsReview}>
            <Button variant="outline">
              <ListChecks className="h-4 w-4 mr-2" />
              Revue en masse
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => recalculateAll()}
            disabled={isRecalculating}
          >
            <Flame className="h-4 w-4 mr-2" />
            {isRecalculating ? 'Recalcul...' : 'Recalculer priorités'}
          </Button>
          {/* Bouton complétion - toujours visible avec juste le chiffre */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={ROUTES.admin.apogeeTicketsIncomplete}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={incompleteCount > 0 ? "text-orange-600 border-orange-300 hover:bg-orange-50" : ""}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {incompleteCount}
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{incompleteCount} ticket{incompleteCount > 1 ? 's' : ''} à compléter</p>
            </TooltipContent>
          </Tooltip>
          {/* Bouton classification "À spécifier" */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={ROUTES.admin.apogeeTicketsClassify}>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={toClassifyCount > 0 ? "text-amber-600 border-amber-300 hover:bg-amber-50" : ""}
                >
                  <FolderOpen className="h-4 w-4 mr-1" />
                  {toClassifyCount}
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>{toClassifyCount} ticket{toClassifyCount > 1 ? 's' : ''} à classifier</p>
            </TooltipContent>
          </Tooltip>
          {/* Bouton qualification IA - toujours visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={unqualifiedCount > 0 ? "text-purple-600 border-purple-300 hover:bg-purple-50" : ""}
                onClick={qualifyAllUnqualified}
                disabled={isQualifying || unqualifiedCount === 0}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                IA {unqualifiedCount > 0 && `(${unqualifiedCount})`}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{unqualifiedCount} ticket{unqualifiedCount > 1 ? 's' : ''} non qualifié{unqualifiedCount > 1 ? 's' : ''}</p>
            </TooltipContent>
          </Tooltip>
          {isAdmin && (
            <>
              <Link to={ROUTES.admin.apogeeTicketsPermissions}>
                <Button variant="outline" size="sm">
                  <Shield className="h-4 w-4 mr-2" />
                  Permissions
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtres */}
      <TicketFilters
        filters={filters}
        onFiltersChange={setFilters}
        modules={modules}
        priorities={priorities}
        impactTags={impactTags}
      />

      {/* Stats rapides + Largeur colonnes */}
      <div className="flex flex-wrap items-center gap-4">
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
        
        {/* Contrôles colonnes */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Visibilité colonnes */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Colonnes
                {hiddenColumns.size > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {statuses.length - hiddenColumns.size}/{statuses.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Colonnes visibles</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={showAllColumns}>
                      Tout
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={hideAllColumns}>
                      Aucun
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  {statuses.map((status) => (
                    <label
                      key={status.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                    >
                      <Checkbox
                        checked={!hiddenColumns.has(status.id)}
                        onCheckedChange={() => toggleColumnVisibility(status.id)}
                      />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Largeur colonnes */}
          <div className="flex items-center gap-2">
            <Columns className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[columnWidth]}
              onValueChange={([v]) => setColumnWidth(v)}
              min={200}
              max={450}
              step={10}
              className="w-28"
            />
            <span className="text-xs text-muted-foreground w-12">{columnWidth}px</span>
          </div>
        </div>
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <TicketKanban
          tickets={tickets}
          statuses={statuses.filter(s => !hiddenColumns.has(s.id))}
          modules={modules}
          ownerSides={ownerSides}
          onStatusChange={handleStatusChange}
          onTicketClick={handleTicketClick}
          columnWidth={columnWidth}
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
        onCreate={(ticket) => createTicket.mutate(ticket)}
        isCreating={createTicket.isPending}
        userTicketRole={myTicketRole}
      />

      {/* Dialog configuration (admin only) */}
      <ActionsConfigDialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
      />
    </div>
  );
}
