/**
 * Vue Kanban des tickets support
 * Mise à jour Phase 3 : utilise les nouveaux statuts (new, in_progress, waiting_user, resolved, closed)
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
import { MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TicketPriorityBadge } from './TicketPriorityBadge';
import { logError } from '@/lib/logger';
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_COLORS,
} from '@/services/supportService';

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

function SortableTicketCard({ ticket, onSelect }: { ticket: SupportTicket; onSelect: (ticket: SupportTicket) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: ticket.id,
    data: { type: 'ticket', ticket, status: ticket.status }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(ticket)}
      className="bg-white border-2 border-border rounded-xl p-4 mb-3 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="font-semibold text-foreground text-sm">#{ticket.id.slice(0, 8)}</span>
        {/* Utiliser le badge de priorité centralisé */}
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

export function KanbanView({ tickets, onSelectTicket, onTicketsUpdate }: KanbanViewProps) {
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [localTickets, setLocalTickets] = useState<SupportTicket[]>(tickets);

  useEffect(() => {
    setLocalTickets(tickets);
  }, [tickets]);

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

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-240px)] overflow-x-auto">
        {columns.map((column) => {
          const columnTickets = getTicketsByStatus(column.status);
          
          return (
            <DroppableColumn key={column.id} id={column.status}>
              <Card className={`flex flex-col ${column.color} border-2 h-full min-w-[200px]`}>
                <CardHeader className="pb-2 px-3">
                  <CardTitle className="flex items-center justify-between text-sm">
                    <span>{column.title}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {columnTickets.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
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
              </Card>
            </DroppableColumn>
          );
        })}
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
