import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SupportTicket } from '@/hooks/use-admin-support';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquare, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

const columns: KanbanColumn[] = [
  { id: 'waiting', title: 'En attente', status: 'waiting', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'in_progress', title: 'En cours', status: 'in_progress', color: 'bg-blue-100 border-blue-300' },
  { id: 'resolved', title: 'Résolus', status: 'resolved', color: 'bg-green-100 border-green-300' },
];

function SortableTicketCard({ ticket, onSelect }: { ticket: SupportTicket; onSelect: (ticket: SupportTicket) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: ticket.id,
    data: { ticket }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'normal':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
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
        <span className="font-semibold text-foreground">{ticket.user_pseudo}</span>
        {getPriorityIcon(ticket.priority)}
      </div>
      <div className="text-sm text-muted-foreground mb-2">
        {format(new Date(ticket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
      </div>
      {ticket.assigned_to && (
        <Badge variant="outline" className="text-xs">
          Assigné
        </Badge>
      )}
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <MessageSquare className="w-3 h-3" />
        <span>Ticket #{ticket.id.slice(0, 8)}</span>
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

  const getTicketsByStatus = (status: string) => {
    return localTickets.filter(ticket => ticket.status === status);
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
    let newStatus: string;
    const isColumn = columns.some(col => col.status === over.id);
    if (isColumn) {
      newStatus = over.id as string;
    } else {
      const targetTicket = localTickets.find(t => t.id === over.id);
      if (!targetTicket) return;
      newStatus = targetTicket.status;
    }

    const ticket = localTickets.find(t => t.id === ticketId);
    if (ticket && ticket.status !== newStatus) {
      // Mise à jour optimiste de l'UI
      setLocalTickets(prev =>
        prev.map(t =>
          t.id === ticketId ? { ...t, status: newStatus } : t
        )
      );
      // Mettre à jour le statut dans la base de données
      const updateData: any = { status: newStatus };
      
      // Si on déplace vers "resolved", ajouter resolved_at
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        console.error('Erreur mise à jour statut:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le statut du ticket',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Statut mis à jour',
          description: `Ticket déplacé vers "${columns.find(c => c.status === newStatus)?.title}"`,
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
      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-240px)]">
        {columns.map((column) => {
          const columnTickets = getTicketsByStatus(column.status);
          
          return (
            <Card key={column.id} className={`flex flex-col ${column.color} border-2`}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <span>{column.title}</span>
                  <Badge variant="secondary" className="ml-2">
                    {columnTickets.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <SortableContext
                  id={column.status}
                  items={columnTickets.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div 
                    className="space-y-3 min-h-[100px]"
                    data-column-status={column.status}
                  >
                    {columnTickets.map((ticket) => (
                      <SortableTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onSelect={onSelectTicket}
                      />
                    ))}
                    {columnTickets.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        Aucun ticket
                      </div>
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DragOverlay>
        {activeTicket && (
          <div className="bg-white border-2 border-primary rounded-xl p-4 shadow-2xl opacity-90">
            <div className="font-semibold text-foreground">{activeTicket.user_pseudo}</div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(activeTicket.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
