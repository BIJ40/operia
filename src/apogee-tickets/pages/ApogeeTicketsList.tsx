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
  AlertTriangle,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApogeeTicket, useApogeeTickets } from '../hooks/useApogeeTickets';
import { useMyTicketRole, useTicketTransitions } from '../hooks/useTicketPermissions';
import { usePersistedListFilters } from '../hooks/usePersistedListFilters';
import { useTicketTabs } from '../hooks/useTicketTabs';
import { useMyTicketViews } from '../hooks/useTicketViews';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { TicketTable } from '../components/TicketTable';
import { TicketTableFilters } from '../components/TicketTableFilters';
import { TicketTabBar } from '../components/TicketTabBar';
import { TicketInlinePanel } from '../components/TicketInlinePanel';
import { CreateTicketDialog } from '../components/CreateTicketDialog';
import { LateTicketsPanel } from '../components/LateTicketsPanel';
import { NewTicketsPanel } from '../components/NewTicketsPanel';
import { NewRepliesPanel } from '../components/NewRepliesPanel';
import { useTicketsWithNewReplies } from '../hooks/useTicketsWithNewReplies';
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
  const { user } = useAuthCore();
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

  // État pour afficher l'onglet RETARD
  const [showLateTab, setShowLateTab] = useState(false);
  const [isLateTabActive, setIsLateTabActive] = useState(false);

  // État pour afficher l'onglet NOUVEAUX
  const [showNewTab, setShowNewTab] = useState(false);
  const [isNewTabActive, setIsNewTabActive] = useState(false);

  // État pour afficher l'onglet RÉPONSES
  const [showRepliesTab, setShowRepliesTab] = useState(false);
  const [isRepliesTabActive, setIsRepliesTabActive] = useState(false);

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

  // Récupérer les vues de l'utilisateur pour calculer les "nouveaux"
  const { data: myViews = [] } = useMyTicketViews();

  // Récupérer les tickets avec nouvelles réponses
  const { data: repliesData = [], markAsRead } = useTicketsWithNewReplies();
  const repliesCount = repliesData.length;

  // Compter les tickets en retard (BUG > 48h)
  const lateTicketsCount = useMemo(() => {
    const now = new Date();
    const hours48Ago = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    return tickets.filter(ticket => {
      const hasBugTag = ticket.impact_tags?.some(tag => tag.toUpperCase() === 'BUG');
      if (!hasBugTag) return false;
      const createdAt = new Date(ticket.created_at);
      if (createdAt > hours48Ago) return false;
      const status = statuses.find(s => s.id === ticket.kanban_status);
      return !status?.is_final;
    }).length;
  }, [tickets, statuses]);

  // Set of ticket IDs with unread replies (Réponses takes priority over Nouveaux)
  const repliesTicketIds = useMemo(() => {
    return new Set(repliesData.map(r => r.ticketId));
  }, [repliesData]);

  // Tickets "nouveaux" (modifiés depuis la dernière visite, EXCLUDING those already in Réponses)
  const newTickets = useMemo(() => {
    if (!user?.id) return [];

    return tickets
      .filter((ticket) => {
        if (!ticket.last_modified_by_user_id || !ticket.last_modified_at) {
          return false;
        }

        // Exclude if author of the modification
        if (ticket.last_modified_by_user_id === user.id) {
          return false;
        }

        // Réponses takes priority: if ticket has unread replies, don't show in Nouveaux
        if (repliesTicketIds.has(ticket.id)) {
          return false;
        }

        const myView = myViews.find((v) => v.ticket_id === ticket.id);
        if (!myView) return true;

        return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
      })
      .sort((a, b) => new Date(b.last_modified_at!).getTime() - new Date(a.last_modified_at!).getTime());
  }, [tickets, myViews, user?.id, repliesTicketIds]);

  const newTicketsCount = newTickets.length;

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
    setIsLateTabActive(false);
    setIsNewTabActive(false);
    setIsRepliesTabActive(false);
    openTicketTab(ticket);
    // Mark replies as read for this ticket
    markAsRead(ticket.id);
  };

  const handleTicketDelete = (id: string) => {
    deleteTicket.mutate(id);
    closeTab(id);
  };

  const handleTicketQueueChange = (ticketId: string, updates: Partial<ApogeeTicket>) => {
    queueChange(ticketId, updates);
  };

  const handleLateTabClick = () => {
    setIsLateTabActive(true);
    setIsNewTabActive(false);
    setIsRepliesTabActive(false);
    setActiveTabId(null);
  };

  const handleNewTabClick = () => {
    setIsNewTabActive(true);
    setIsLateTabActive(false);
    setIsRepliesTabActive(false);
    setActiveTabId(null);
  };

  const handleRepliesTabClick = () => {
    setIsRepliesTabActive(true);
    setIsNewTabActive(false);
    setIsLateTabActive(false);
    setActiveTabId(null);
  };

  const handleTabClick = (tabId: string | null) => {
    setIsLateTabActive(false);
    setIsNewTabActive(false);
    setIsRepliesTabActive(false);
    setActiveTabId(tabId);
  };

  const showingNew = isNewTabActive;
  const showingReplies = isRepliesTabActive && !isNewTabActive;
  const showingLate = isLateTabActive && !isNewTabActive && !isRepliesTabActive;
  const showingList = activeTabId === null && !isLateTabActive && !isNewTabActive && !isRepliesTabActive;

  return (
    <div className={embedded ? "flex flex-col h-full" : "container mx-auto max-w-app py-8 px-4 flex flex-col h-[calc(100vh-6rem)]"}>
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
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              size="sm"
              className="bg-warm-blue/90 hover:bg-warm-blue text-white border-0 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Nouveau ticket</span>
            </Button>
          )}

          {/* Bouton Nouveaux */}
          <Button
            variant={showNewTab ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (!showNewTab) {
                setShowNewTab(true);
                setIsNewTabActive(true);
                setIsLateTabActive(false);
                setActiveTabId(null);
              } else {
                setShowNewTab(false);
                setIsNewTabActive(false);
              }
            }}
            className={cn(
              "gap-2 transition-all",
              newTicketsCount > 0 && !showNewTab && "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Nouveaux</span>
            {newTicketsCount > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full",
                showNewTab 
                  ? "bg-emerald-500 text-white" 
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 animate-pulse"
              )}>
                {newTicketsCount}
              </span>
            )}
          </Button>

          {/* Bouton Réponses */}
          <Button
            variant={showRepliesTab ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (!showRepliesTab) {
                setShowRepliesTab(true);
                setIsRepliesTabActive(true);
                setIsNewTabActive(false);
                setIsLateTabActive(false);
                setActiveTabId(null);
              } else {
                setShowRepliesTab(false);
                setIsRepliesTabActive(false);
              }
            }}
            className={cn(
              "gap-2 transition-all",
              repliesCount > 0 && !showRepliesTab && "border-blue-500/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Réponses</span>
            {repliesCount > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full",
                showRepliesTab 
                  ? "bg-blue-500 text-white" 
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 animate-pulse"
              )}>
                {repliesCount}
              </span>
            )}
          </Button>
          
          {/* Bouton En retard */}
          <Button
            variant={showLateTab ? "secondary" : "outline"}
            size="sm"
            onClick={() => {
              if (!showLateTab) {
                setShowLateTab(true);
                setIsLateTabActive(true);
                setIsNewTabActive(false);
                setActiveTabId(null);
              } else {
                setShowLateTab(false);
                setIsLateTabActive(false);
              }
            }}
            className={cn(
              "gap-2 transition-all",
              lateTicketsCount > 0 && !showLateTab && "border-destructive/50 text-destructive hover:bg-destructive/10"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">En retard</span>
            {lateTicketsCount > 0 && (
              <span className={cn(
                "inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-xs font-medium rounded-full",
                showLateTab 
                  ? "bg-destructive text-destructive-foreground" 
                  : "bg-destructive/10 text-destructive"
              )}>
                {lateTicketsCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Barre d'onglets: LISTE fixe + NOUVEAUX optionnel + RETARD optionnel + tickets à droite */}
      <TicketTabBar
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabClick={handleTabClick}
        onTabClose={closeTab}
        onCloseAll={closeAllTabs}
        isSaving={isSaving}
        showNewTab={showNewTab}
        isNewTabActive={isNewTabActive}
        onNewTabClick={handleNewTabClick}
        newCount={newTicketsCount}
        showLateTab={showLateTab}
        isLateTabActive={isLateTabActive}
        onLateTabClick={handleLateTabClick}
        lateCount={lateTicketsCount}
        showRepliesTab={showRepliesTab}
        isRepliesTabActive={isRepliesTabActive}
        onRepliesTabClick={handleRepliesTabClick}
        repliesCount={repliesCount}
      />

      {/* Zone de contenu */}
      <div className={cn(
        "flex-1 overflow-hidden mx-2 mb-2 border-2",
        showingNew
          ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-500 rounded-2xl"
          : showingReplies
            ? "bg-blue-50/50 dark:bg-blue-950/30 border-blue-400 dark:border-blue-500 rounded-2xl"
            : showingLate
              ? "bg-destructive/5 dark:bg-destructive/10 border-destructive/30 rounded-2xl"
              : showingList 
                ? "bg-sky-50 dark:bg-sky-950/50 border-sky-400 dark:border-sky-500 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl"
                : "bg-violet-50 dark:bg-violet-950/50 border-violet-400 dark:border-violet-500 rounded-2xl"
      )}>
        {showingNew ? (
          <NewTicketsPanel onTicketClick={handleTicketClick} tickets={newTickets} statuses={statuses} modules={modules} isLoading={isLoading} />
        ) : showingReplies ? (
          <NewRepliesPanel onTicketClick={handleTicketClick} />
        ) : showingLate ? (
          <LateTicketsPanel onTicketClick={handleTicketClick} />
        ) : showingList ? (
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
                  onTicketUpdate={handleTicketQueueChange}
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
            <p>Ticket introuvable. <Button variant="link" onClick={() => handleTabClick(null)}>Retour à la liste</Button></p>
          </div>
        )}
      </div>

      {/* Dialog création */}
      <CreateTicketDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        modules={modules}
        statuses={statuses}
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
