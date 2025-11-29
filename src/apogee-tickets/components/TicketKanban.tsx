/**
 * Vue Kanban des tickets Apogée
 */

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, User } from 'lucide-react';
import type { ApogeeTicket, ApogeeTicketStatus } from '../types';

interface TicketKanbanProps {
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (ticket: ApogeeTicket) => void;
}

// Couleurs des badges
const MODULE_COLORS: Record<string, string> = {
  RDV: 'bg-blue-500',
  DEVIS: 'bg-green-500',
  FACTURES: 'bg-purple-500',
  PLANNING: 'bg-orange-500',
  DOSSIERS: 'bg-cyan-500',
  CLIENTS: 'bg-pink-500',
  APPORTEURS: 'bg-yellow-500',
  STATS: 'bg-red-500',
  AUTRE: 'bg-gray-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  A: 'bg-red-600',
  B: 'bg-orange-500',
  V1: 'bg-blue-500',
  PLUS_TARD: 'bg-gray-400',
};

const OWNER_COLORS: Record<string, string> = {
  HC: 'bg-helpconfort-blue',
  APOGEE: 'bg-purple-600',
  PARTAGE: 'bg-amber-500',
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-gray-100 border-gray-300',
  SPEC_A_FAIRE: 'bg-blue-50 border-blue-300',
  EN_DEV_APOGEE: 'bg-purple-50 border-purple-300',
  EN_TEST_HC: 'bg-orange-50 border-orange-300',
  EN_PROD: 'bg-green-50 border-green-300',
  CLOTURE: 'bg-gray-50 border-gray-200',
};

// Composant carte de ticket draggable
function DraggableTicketCard({
  ticket,
  onClick,
}: {
  ticket: ApogeeTicket;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow mb-2 border-l-4"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Badges en haut */}
        <div className="flex flex-wrap gap-1">
          {ticket.module && (
            <Badge className={`${MODULE_COLORS[ticket.module] || 'bg-gray-500'} text-white text-xs`}>
              {ticket.apogee_modules?.label || ticket.module}
            </Badge>
          )}
          {ticket.priority && (
            <Badge className={`${PRIORITY_COLORS[ticket.priority] || 'bg-gray-400'} text-white text-xs`}>
              {ticket.priority}
            </Badge>
          )}
          {ticket.owner_side && (
            <Badge className={`${OWNER_COLORS[ticket.owner_side]} text-white text-xs`}>
              {ticket.owner_side}
            </Badge>
          )}
        </div>

        {/* Titre */}
        <p className="text-sm font-medium line-clamp-2">{ticket.element_concerne}</p>

        {/* Description courte */}
        {ticket.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
        )}

        {/* Indicateurs en bas */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(ticket.h_min || ticket.h_max) && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {ticket.h_min || '?'} - {ticket.h_max || '?'}h
            </span>
          )}
          {ticket._count?.comments !== undefined && ticket._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {ticket._count.comments}
            </span>
          )}
          {ticket.needs_completion && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              Incomplet
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant colonne droppable
function DroppableColumn({
  status,
  tickets,
  onTicketClick,
}: {
  status: ApogeeTicketStatus;
  tickets: ApogeeTicket[];
  onTicketClick: (ticket: ApogeeTicket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 rounded-lg border-2 ${STATUS_COLORS[status.id] || 'bg-gray-50 border-gray-200'} ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{status.label}</h3>
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <SortableContext items={tickets.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tickets.map((ticket) => (
            <DraggableTicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))}
        </SortableContext>
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun ticket
          </p>
        )}
      </ScrollArea>
    </div>
  );
}

export function TicketKanban({ tickets, statuses, onStatusChange, onTicketClick }: TicketKanbanProps) {
  const [activeTicket, setActiveTicket] = useState<ApogeeTicket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Grouper les tickets par statut
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, ApogeeTicket[]> = {};
    statuses.forEach((status) => {
      grouped[status.id] = tickets.filter((t) => t.kanban_status === status.id);
    });
    return grouped;
  }, [tickets, statuses]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    // Vérifier que c'est un statut valide
    if (!statuses.find((s) => s.id === newStatus)) return;

    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.kanban_status !== newStatus) {
      onStatusChange(ticketId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <DroppableColumn
            key={status.id}
            status={status}
            tickets={ticketsByStatus[status.id] || []}
            onTicketClick={onTicketClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <Card className="w-72 shadow-lg border-2 border-primary">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeTicket.element_concerne}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
