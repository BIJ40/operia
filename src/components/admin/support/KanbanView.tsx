/**
 * Vue Kanban des tickets support
 * Mise à jour Phase 3 : utilise les nouveaux statuts (new, in_progress, waiting_user, resolved, closed)
 * P3#1 : Intégration SLA badges et highlight retard
 * Notification clignotante : pastille orange quand un autre utilisateur a répondu
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SupportTicket } from '@/hooks/use-admin-support';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { logError } from '@/lib/logger';
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
} from '@/services/supportService';
import { useSupportTicketsBlinkStatus, useMarkSupportTicketAsViewed } from '@/hooks/useSupportTicketViews';

interface KanbanViewProps {
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
  onTicketsUpdate: () => void;
}

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  color: string;
}

// Colonnes Kanban avec les NOUVEAUX statuts
const columns: KanbanColumn[] = [
  { 
    id: TICKET_STATUSES.NEW, 
    title: TICKET_STATUS_LABELS.new, 
    status: TICKET_STATUSES.NEW, 
    color: 'bg-blue-100 border-blue-300' 
  },
  { 
    id: TICKET_STATUSES.IN_PROGRESS, 
    title: TICKET_STATUS_LABELS.in_progress, 
    status: TICKET_STATUSES.IN_PROGRESS, 
    color: 'bg-orange-100 border-orange-300' 
  },
  { 
    id: TICKET_STATUSES.WAITING_USER, 
    title: TICKET_STATUS_LABELS.waiting_user, 
    status: TICKET_STATUSES.WAITING_USER, 
    color: 'bg-yellow-100 border-yellow-300' 
  },
  { 
    id: TICKET_STATUSES.RESOLVED, 
    title: TICKET_STATUS_LABELS.resolved, 
    status: TICKET_STATUSES.RESOLVED, 
    color: 'bg-green-100 border-green-300' 
  },
  { 
    id: TICKET_STATUSES.CLOSED, 
    title: TICKET_STATUS_LABELS.closed, 
    status: TICKET_STATUSES.CLOSED, 
    color: 'bg-gray-100 border-gray-300' 
  },
];

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id, data: { type: 'column', status: id } });
  return (
    <div ref={setNodeRef} className="h-full">
      {children}
    </div>
  );
}

/** Pastille clignotante pour nouvelle réponse */
function BlinkingIndicator() {
  return (
    <span 
      className="absolute top-2 right-2 w-3 h-3 rounded-full bg-orange-500 animate-pulse"
      style={{ 
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        boxShadow: '0 0 8px rgba(249, 115, 22, 0.6)'
      }}
      title="Nouvelle réponse"
    />
  );
}

interface SortableTicketCardProps {
  ticket: SupportTicket;
  onSelect: (ticket: SupportTicket) => void;
  shouldBlink: boolean;
  onMarkAsViewed: (ticketId: string) => void;
}

function SortableTicketCard({ ticket, onSelect, shouldBlink, onMarkAsViewed }: SortableTicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: ticket.id,
    data: { type: 'ticket', ticket, status: ticket.status }
  });

  // Track if we're dragging to distinguish click from drag
  const [wasDragging, setWasDragging] = useState(false);

  // Priority-based highlighting (replacing SLA)
  const isUrgent = ticket.priority === 'urgent' || ticket.priority === 'bloquant';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Track drag state changes
  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    }
  }, [isDragging]);

  // Handle click only if we weren't dragging
  const handleClick = () => {
    if (!wasDragging) {
      // Marquer comme vu avant d'ouvrir
      onMarkAsViewed(ticket.id);
      onSelect(ticket);
    }
    setWasDragging(false);
  };

  // Classes conditionnelles basées sur la priorité (plus de SLA)
  const cardClasses = `relative rounded-xl p-4 mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] ${
    isUrgent 
      ? 'bg-red-50 border-2 border-red-400 ring-1 ring-red-300' 
      : 'bg-white border-2 border-border'
  }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      className={cardClasses}
    >
      {/* Pastille clignotante si nouvelle réponse */}
      {shouldBlink && <BlinkingIndicator />}
      
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-sm">#{ticket.id.slice(0, 8)}</span>
        </div>
        {/* Badge de priorité */}
        <TicketPriorityBadge priority={ticket.priority} size="sm" />
      </div>
      {ticket.subject && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{ticket.subject}</p>
      )}
      <div className="text-xs text-muted-foreground mb-2">
        {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {ticket.assigned_to && (
          <Badge variant="outline" className="text-xs">
            Assigné
          </Badge>
        )}
        {ticket.support_level && ticket.support_level > 1 && (
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
            N{ticket.support_level}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <MessageSquare className="w-3 h-3" />
        <span>Ticket</span>
      </div>
    </div>
  );
}

interface ExtendedKanbanViewProps extends KanbanViewProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function KanbanView({ tickets, onSelectTicket, onTicketsUpdate, isCollapsed = false, onToggleCollapse }: ExtendedKanbanViewProps) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>(tickets);
  
  // État de collapse par colonne
  const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>({});

  // Hook pour le statut clignotant et marquer comme vu
  const blinkStatus = useSupportTicketsBlinkStatus(tickets);
  const { mutate: markAsViewed } = useMarkSupportTicketAsViewed();

  const handleMarkAsViewed = (ticketId: string) => {
    markAsViewed(ticketId);
  };

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

  const toggleColumn = (columnId: string) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [columnId]: !prev[columnId]
    }));
  };

  // Mapper les anciens statuts 'waiting' vers 'waiting_user' pour compatibilité
  const normalizeStatus = (status: string) => {
    if (status === 'waiting') return TICKET_STATUSES.WAITING_USER;
    return status;
  };

  const getTicketsByStatus = (status: string) => {
    return localTickets.filter(ticket => normalizeStatus(ticket.status) === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const ticket = localTickets.find(t => t.id === active.id);
    setActiveTicket(ticket || null);
  };

  // P2 FIX: Définition des transitions autorisées (business logic)
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    [TICKET_STATUSES.NEW]: [TICKET_STATUSES.IN_PROGRESS, TICKET_STATUSES.WAITING_USER],
    [TICKET_STATUSES.IN_PROGRESS]: [TICKET_STATUSES.WAITING_USER, TICKET_STATUSES.RESOLVED, TICKET_STATUSES.CLOSED],
    [TICKET_STATUSES.WAITING_USER]: [TICKET_STATUSES.IN_PROGRESS, TICKET_STATUSES.RESOLVED, TICKET_STATUSES.CLOSED],
    [TICKET_STATUSES.RESOLVED]: [TICKET_STATUSES.IN_PROGRESS, TICKET_STATUSES.CLOSED], // Réouverture possible
    [TICKET_STATUSES.CLOSED]: [], // Pas de transition depuis Fermé
  };

  const isTransitionAllowed = (from: string, to: string): boolean => {
    const allowed = ALLOWED_TRANSITIONS[from] || [];
    return allowed.includes(to);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    
    // Déterminer le statut de la colonne de destination
    let newStatus: string | undefined;

    const overType = over.data?.current?.type as string | undefined;
    if (overType === 'column') {
      newStatus = over.data?.current?.status as string;
    } else if (overType === 'ticket') {
      newStatus = over.data?.current?.status as string;
    }

    if (!newStatus) return;

    const ticket = localTickets.find(t => t.id === ticketId);
    const currentStatus = ticket ? normalizeStatus(ticket.status) : null;

    if (ticket && currentStatus !== newStatus) {
      // P2 FIX: Vérifier si la transition est autorisée
      if (!isTransitionAllowed(currentStatus!, newStatus)) {
        toast({
          title: 'Transition non autorisée',
          description: `Impossible de passer de "${TICKET_STATUS_LABELS[currentStatus!] || currentStatus}" à "${TICKET_STATUS_LABELS[newStatus] || newStatus}"`,
          variant: 'destructive',
        });
        return;
      }

      // Mise à jour optimiste de l'UI
      const isResolved = newStatus === TICKET_STATUSES.RESOLVED || newStatus === TICKET_STATUSES.CLOSED;
      const updatedTicket = {
        ...ticket,
        status: newStatus,
        resolved_at: isResolved ? new Date().toISOString() : null
      };
      
      setLocalTickets(prev =>
        prev.map(t => t.id === ticketId ? updatedTicket : t)
      );

      // Mettre à jour le statut dans la base de données
      const updateData: any = { status: newStatus };
      
      // Gérer le champ resolved_at selon le nouveau statut
      if (isResolved) {
        updateData.resolved_at = new Date().toISOString();
      } else {
        updateData.resolved_at = null;
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        logError('SUPPORT_KANBAN', 'Erreur mise à jour statut', { error, ticketId, newStatus });
        // Rollback optimiste en cas d'erreur
        setLocalTickets(prev =>
          prev.map(t => t.id === ticketId ? ticket : t)
        );
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut du ticket',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Statut mis à jour',
          description: `Ticket passé en "${TICKET_STATUS_LABELS[newStatus] || newStatus}"`,
        });
        onTicketsUpdate();
      }
    }
  };

  // Mode replié : afficher uniquement les compteurs
  if (isCollapsed) {
    return (
      <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-lg w-16">
        <button 
          onClick={onToggleCollapse}
          className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Déplier le Kanban"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        {columns.map((column) => {
          const count = getTicketsByStatus(column.status).length;
          return (
            <div 
              key={column.id}
              className={`p-2 rounded text-center text-xs font-medium ${column.color}`}
              title={column.title}
            >
              {count}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative">
        {onToggleCollapse && (
          <button 
            onClick={onToggleCollapse}
            className="absolute -left-3 top-2 z-10 p-1 bg-background border rounded-full shadow hover:bg-muted transition-colors"
            title="Replier le Kanban"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex gap-4 h-[calc(100vh-240px)] overflow-x-auto">
          {columns.map((column) => {
            const columnTickets = getTicketsByStatus(column.status);
            const isColumnCollapsed = collapsedColumns[column.id];
            
            return (
              <DroppableColumn key={column.id} id={column.status}>
                <Card className={`flex flex-col ${column.color} border-2 h-full transition-all duration-200 ${
                  isColumnCollapsed ? 'w-[60px] min-w-[60px]' : 'w-[200px] min-w-[200px]'
                }`}>
                  <CardHeader className="pb-2 px-2">
                    {isColumnCollapsed ? (
                      <button
                        onClick={() => toggleColumn(column.id)}
                        className="flex flex-col items-center gap-2 w-full hover:opacity-70 transition-opacity py-2"
                        title={`Déplier ${column.title}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="secondary" className="text-xs">
                          {columnTickets.length}
                        </Badge>
                        <span 
                          className="text-xs font-medium text-center"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                          {column.title}
                        </span>
                      </button>
                    ) : (
                      <CardTitle className="flex items-center justify-between text-sm">
                        <span className="truncate">{column.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {columnTickets.length}
                          </Badge>
                          <button
                            onClick={() => toggleColumn(column.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title={`Replier ${column.title}`}
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                        </div>
                      </CardTitle>
                    )}
                  </CardHeader>
                  {!isColumnCollapsed && (
                    <CardContent className="flex-1 overflow-auto px-3 pb-3">
                      <SortableContext
                        id={column.status}
                        items={columnTickets.map(t => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 min-h-[100px]">
                          {columnTickets.map((ticket) => (
                            <SortableTicketCard
                              key={ticket.id}
                              ticket={ticket}
                              onSelect={onSelectTicket}
                              shouldBlink={blinkStatus[ticket.id] || false}
                              onMarkAsViewed={handleMarkAsViewed}
                            />
                          ))}
                          {columnTickets.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-xs">
                              Aucun ticket
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </CardContent>
                  )}
                </Card>
              </DroppableColumn>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="bg-white border-2 border-primary rounded-xl p-4 shadow-2xl opacity-90">
            <div className="font-semibold text-foreground">#{activeTicket.id.slice(0, 8)}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(activeTicket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
