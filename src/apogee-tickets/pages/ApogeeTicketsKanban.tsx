/**
 * Page principale Kanban des tickets Apogée
 * Avec guard d'accès basé sur les permissions utilisateur
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Plus, Upload, AlertCircle, Settings, Sparkles, ListChecks, Flame, ChevronDown, Bug, FileSpreadsheet, Files, FolderOpen, Columns, Eye, Shield, Loader2, ShieldAlert, Download, FileText, Sheet, FileDown, LayoutGrid, List, FileCheck, AlertTriangle, Copy, RotateCcw, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApogeeTickets } from '../hooks/useApogeeTickets';
import { usePersistedFilters } from '../hooks/usePersistedFilters';
import { TicketKanban } from '../components/TicketKanban';
import { TicketFilters } from '../components/TicketFilters';
import { TicketDetailDrawer } from '../components/TicketDetailDrawer';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { ActionsConfigDialog } from '../components/ActionsConfigDialog';
import { useTicketQualification } from '../hooks/useTicketQualification';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportKanban';

import { useMyTicketRole, TicketRoleInfo } from '../hooks/useTicketPermissions';
import type { ApogeeTicket, TicketFilters as Filters } from '../types';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/config/routes';
import { useMyRecentlyModifiedTickets } from '../hooks/useMyRecentlyModifiedTickets';
import { useMyTicketViews } from '../hooks/useTicketViews';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ApogeeTicketsKanbanPage() {
  const { data: myTicketRole, isLoading: isLoadingRole, error: roleError } = useMyTicketRole();

  // 1) Chargement des droits
  if (isLoadingRole || !myTicketRole) {
    return (
      <div className="flex items-center justify-center h-full py-16">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>Chargement de vos droits tickets…</span>
      </div>
    );
  }

  // 2) Erreur systémique (profil non trouvé, fetch_error, etc.)
  if (roleError) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            Impossible de récupérer vos droits d'accès au module tickets.
            Les logs d'erreur ont été enregistrés. Réessayez dans quelques instants.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 3) Cas : pas de droit ticketing (module désactivé, non auth, etc.)
  if (!myTicketRole.canUseTicketing) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Module tickets non disponible</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              Votre profil n'a pas accès au module <strong>Gestion de Projet</strong>.
            </p>
            {myTicketRole.reason && (
              <p className="text-xs text-muted-foreground">
                Code technique : <code>{myTicketRole.reason}</code>
              </p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // 4) Cas nominal : on affiche le Kanban
  return <ApogeeTicketsKanbanContent roleInfo={myTicketRole} />;
}

// Composant interne avec le contenu du Kanban
function ApogeeTicketsKanbanContent({ roleInfo }: { roleInfo: TicketRoleInfo }) {
  const { isPlatformAdmin, isSupport, ticketRole, canManage, canImport, canViewKanban } = roleInfo;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: recentTickets = [] } = useMyRecentlyModifiedTickets(5);
  const { data: myViews = [] } = useMyTicketViews();
  
  // Persistance des filtres, UI state et ticket sélectionné
  const { 
    filters, 
    setFilters, 
    resetFilters, 
    selectedTicketId, 
    setSelectedTicketId,
    hasActiveFilters,
    // UI State persisté
    selectedPEC,
    setSelectedPEC,
    filterBlinkingOnly,
    setFilterBlinkingOnly,
    hiddenColumns,
    setHiddenColumns,
    columnWidth,
    setColumnWidth,
  } = usePersistedFilters();
  
  const [selectedTicket, setSelectedTicket] = useState<ApogeeTicket | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  const togglePECFilter = (pecId: string) => {
    setSelectedPEC(prev => {
      const next = new Set(prev);
      if (next.has(pecId)) {
        next.delete(pecId);
      } else {
        next.add(pecId);
      }
      return next;
    });
  };

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
    ownerSides,
    isLoading,
    createTicket,
    updateTicket,
    updateKanbanStatus,
    deleteTicket,
  } = useApogeeTickets(filters);

  const { qualifyAllUnqualified, isQualifying } = useTicketQualification();
  
  // Restaurer le ticket sélectionné depuis l'URL au chargement
  useEffect(() => {
    if (selectedTicketId && tickets.length > 0 && !selectedTicket) {
      const ticket = tickets.find(t => t.id === selectedTicketId);
      if (ticket) {
        setSelectedTicket(ticket);
      }
    }
  }, [selectedTicketId, tickets, selectedTicket]);

  // Compteurs (exclure EN_PROD pour les incomplets)
  const incompleteCount = tickets.filter(t => t.needs_completion && t.kanban_status !== 'EN_PROD').length;
  const unqualifiedCount = tickets.filter(t => !t.is_qualified).length;
  const toClassifyCount = tickets.filter(t => t.kanban_status === 'SPEC_A_FAIRE').length;

  // Compteur de tickets avec nouvelles modifications (blinking)
  const blinkingTicketsCount = tickets.filter(ticket => {
    if (!user?.id || !ticket.last_modified_by_user_id || !ticket.last_modified_at) return false;
    if (ticket.last_modified_by_user_id === user.id) return false;
    const myView = myViews.find(v => v.ticket_id === ticket.id);
    if (!myView) return true;
    return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
  }).length;

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateKanbanStatus.mutate({ ticketId, newStatus });
  };

  const handleTicketClick = (ticket: ApogeeTicket) => {
    setSelectedTicket(ticket);
    setSelectedTicketId(ticket.id);
  };

  const handleDrawerClose = () => {
    setSelectedTicket(null);
    setSelectedTicketId(null);
  };

  // Navigation entre tickets
  const currentTicketIndex = selectedTicket 
    ? tickets.findIndex(t => t.id === selectedTicket.id) 
    : -1;
  
  const handleNavigatePrevious = () => {
    if (currentTicketIndex > 0) {
      const prevTicket = tickets[currentTicketIndex - 1];
      setSelectedTicket(prevTicket);
      setSelectedTicketId(prevTicket.id);
    }
  };

  const handleNavigateNext = () => {
    if (currentTicketIndex >= 0 && currentTicketIndex < tickets.length - 1) {
      const nextTicket = tickets[currentTicketIndex + 1];
      setSelectedTicket(nextTicket);
      setSelectedTicketId(nextTicket.id);
    }
  };

  const handleTicketUpdate = (updates: Partial<ApogeeTicket> & { id: string }) => {
    updateTicket.mutate(updates);
    // Mettre à jour l'état local du ticket sélectionné pour refléter les changements immédiatement
    if (selectedTicket && selectedTicket.id === updates.id) {
      setSelectedTicket({ ...selectedTicket, ...updates });
    }
  };

  const handleTicketDelete = (id: string) => {
    deleteTicket.mutate(id);
    setSelectedTicket(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <PageHeader 
        title="Gestion de Projet - Kanban"
        backTo={ROUTES.projects.index}
        backLabel="Gestion de Projet"
      />
      
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle vue Kanban/Liste */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            <Button variant="default" size="sm" className="h-8">
              <LayoutGrid className="h-4 w-4 mr-1" />
              Kanban
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => navigate(ROUTES.projects.list)}
            >
              <List className="h-4 w-4 mr-1" />
              Liste
            </Button>
          </div>
          {canViewKanban && (
            <Button onClick={() => setShowCreateDialog(true)} size="sm" className="sm:size-default">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau ticket</span>
            </Button>
          )}
          {/* Menu dernières modifications */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Clock className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Dernières modifications</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="bg-background border shadow-lg z-50 w-80">
              {recentTickets.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Aucune modification récente
                </div>
              ) : (
                recentTickets.map((ticket) => (
                  <DropdownMenuItem 
                    key={ticket.id}
                    onClick={() => {
                      const fullTicket = tickets.find(t => t.id === ticket.id);
                      if (fullTicket) {
                        handleTicketClick(fullTicket);
                      }
                    }}
                    className="cursor-pointer flex flex-col items-start gap-1"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Badge variant="outline" className="text-xs shrink-0">
                        #{ticket.ticket_number}
                      </Badge>
                      <span className="truncate text-sm font-medium flex-1">
                        {ticket.element_concerne}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ticket.last_modified_at 
                        ? new Date(ticket.last_modified_at).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Export dropdown */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Exporter</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="bg-background border shadow-lg z-50">
              <DropdownMenuItem onClick={() => exportToCSV({ tickets, statuses, modules, priorities, ownerSides })}>
                <FileText className="h-4 w-4 mr-2 text-green-600" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel({ tickets, statuses, modules, priorities, ownerSides })}>
                <Sheet className="h-4 w-4 mr-2 text-emerald-600" />
                Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportToPDF({ tickets, statuses, modules, priorities, ownerSides })}>
                <FileDown className="h-4 w-4 mr-2 text-red-600" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <Link to={ROUTES.projects.review}>
            <Button variant="outline" size="sm">
              <ListChecks className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Revue en masse</span>
            </Button>
          </Link>
          {/* Bouton complétion */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={ROUTES.projects.incomplete}>
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`h-8 w-8 ${incompleteCount > 0 ? "text-orange-600 border-orange-300 hover:bg-orange-50" : ""}`}
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Incomplets ({incompleteCount})</p>
            </TooltipContent>
          </Tooltip>
          {/* Menu IA regroupé */}
          {/* Menu IA regroupé */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
              >
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">IA</span>
                <ChevronDown className="h-4 w-4 sm:ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border shadow-lg z-50 w-56">
              <DropdownMenuItem 
                onClick={qualifyAllUnqualified}
                disabled={isQualifying || unqualifiedCount === 0}
                className="cursor-pointer"
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                <div className="flex-1">
                  <span>K-LifIA</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (Qualification)
                  </span>
                </div>
                {unqualifiedCount > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {unqualifiedCount}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate(ROUTES.projects.duplicates)}
                className="cursor-pointer"
              >
                <Copy className="h-4 w-4 mr-2 text-indigo-600" />
                <div className="flex-1">
                  <span>IA-IA</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    (Doublons)
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isPlatformAdmin && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link to={ROUTES.projects.permissions}>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Permissions</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" onClick={() => setShowConfigDialog(true)} aria-label="Configuration">
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Badge indicateur du rôle utilisateur */}
          {ticketRole && (
            <Badge variant="outline" className="text-xs">
              Rôle : {ticketRole}
            </Badge>
          )}
        </div>
      </div>

      {/* Filtres + Contrôles */}
      <TicketFilters
        filters={filters}
        onFiltersChange={setFilters}
        modules={modules}
        priorities={priorities}
        ownerSides={ownerSides}
        selectedPEC={selectedPEC}
        onTogglePEC={togglePECFilter}
        onClearPEC={() => setSelectedPEC(new Set())}
        blinkingTicketsCount={blinkingTicketsCount}
        filterBlinkingOnly={filterBlinkingOnly}
        onToggleBlinkingFilter={() => setFilterBlinkingOnly(prev => !prev)}
      />

      {/* Contrôles colonnes */}
      <div className="flex items-center gap-4 flex-wrap">
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
            <PopoverContent align="end" className="w-56 bg-background z-50">
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

      {/* Kanban */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <TicketKanban
          tickets={selectedPEC.size > 0 ? tickets.filter(t => t.owner_side && selectedPEC.has(t.owner_side)) : tickets}
          statuses={statuses.filter(s => !hiddenColumns.has(s.id))}
          modules={modules}
          ownerSides={ownerSides}
          onStatusChange={handleStatusChange}
          onTicketClick={handleTicketClick}
          columnWidth={columnWidth}
          filterBlinkingOnly={filterBlinkingOnly}
        />
      )}

      {/* Drawer détail */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={!!selectedTicket}
        onClose={handleDrawerClose}
        modules={modules}
        priorities={priorities}
        statuses={statuses}
        onUpdate={handleTicketUpdate}
        onDelete={handleTicketDelete}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={currentTicketIndex > 0}
        hasNext={currentTicketIndex >= 0 && currentTicketIndex < tickets.length - 1}
      />

      {/* Dialog création */}
      <CreateTicketDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        modules={modules}
        onCreate={(ticket) => createTicket.mutate(ticket)}
        isCreating={createTicket.isPending}
        userTicketRole={ticketRole}
      />

      {/* Dialog configuration (admin only) */}
      <ActionsConfigDialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
      />
    </div>
  );
}
