/**
 * Vue Kanban des tickets Apogée - Drag and drop avec permissions
 */

import { useState, useMemo, useCallback } from 'react';
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
import { useDraggable } from '@dnd-kit/core';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock, GripVertical, Lock } from 'lucide-react';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import { toast } from 'sonner';
import { useCanTransition, useLogTicketAction } from '../hooks/useTicketPermissions';
import type { ApogeeTicket, ApogeeTicketStatus, ApogeeModule, ApogeeOwnerSide } from '../types';

interface TicketKanbanProps {
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (ticket: ApogeeTicket) => void;
  columnWidth?: number;
  onColumnWidthChange?: (width: number) => void;
}

// Palette de couleurs Tailwind
const TAILWIND_COLORS: Record<string, string> = {
  gray: '#6b7280',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};

// Helper pour générer un fond léger à partir d'un nom de couleur Tailwind
function getColumnStyle(colorName: string | null): React.CSSProperties {
  if (!colorName) return { backgroundColor: '#f3f4f6', borderColor: '#d1d5db' };
  const hex = TAILWIND_COLORS[colorName] || '#6b7280';
  return {
    backgroundColor: `${hex}20`,  // 20 = ~12% opacité
    borderColor: `${hex}60`,      // 60 = ~38% opacité
  };
}

// Composant carte de ticket draggable - utilise useDraggable au lieu de useSortable
function DraggableTicketCard({
  ticket,
  onClick,
  modules = [],
  ownerSides = [],
}: {
  ticket: ApogeeTicket;
  onClick: () => void;
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: ticket.id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  } : undefined;

  // Gérer le clic sans interférer avec le drag
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Ne pas déclencher onClick si on clique sur le handle de drag
    if ((e.target as HTMLElement).closest('[data-drag-handle]')) {
      return;
    }
    onClick();
  }, [onClick]);

  // Get module color from database
  const moduleColor = useMemo(() => {
    if (!ticket.module) return null;
    const mod = modules.find(m => m.id === ticket.module);
    return mod?.color ? TAILWIND_COLORS[mod.color] || TAILWIND_COLORS.gray : TAILWIND_COLORS.gray;
  }, [ticket.module, modules]);

  // Get owner side color from database
  const ownerColor = useMemo(() => {
    if (!ticket.owner_side) return null;
    const owner = ownerSides.find(o => o.id === ticket.owner_side);
    return owner?.color ? TAILWIND_COLORS[owner.color] || TAILWIND_COLORS.gray : TAILWIND_COLORS.gray;
  }, [ticket.owner_side, ownerSides]);

  // Get owner side label from database
  const ownerLabel = useMemo(() => {
    if (!ticket.owner_side) return null;
    const owner = ownerSides.find(o => o.id === ticket.owner_side);
    return owner?.label || ticket.owner_side;
  }, [ticket.owner_side, ownerSides]);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="hover:shadow-md transition-shadow mb-2 border-l-4 group"
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Handle de drag + badges */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            data-drag-handle
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 flex flex-wrap gap-1">
            {ticket.module && moduleColor && (
              <Badge style={{ backgroundColor: moduleColor }} className="text-white text-xs">
                {ticket.apogee_modules?.label || ticket.module}
              </Badge>
            )}
            <HeatPriorityBadge priority={ticket.heat_priority} size="sm" showLabel={false} />
            {ticket.owner_side && ownerColor && (
              <Badge style={{ backgroundColor: ownerColor }} className="text-white text-xs">
                {ownerLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* Titre */}
        <p className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-primary">
          {ticket.element_concerne}
        </p>

        {/* Description courte */}
        {ticket.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {ticket.description}
          </p>
        )}

        {/* Indicateurs en bas */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
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
          {/* Badges barrés pour champs manquants */}
          {!ticket.module && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 line-through">
              Module
            </Badge>
          )}
          {(!ticket.h_min && !ticket.h_max) && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 line-through">
              Temps
            </Badge>
          )}
          {!ticket.owner_side && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 line-through">
              PEC
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
  modules,
  ownerSides,
  columnWidth = 288,
}: {
  status: ApogeeTicketStatus;
  tickets: ApogeeTicket[];
  onTicketClick: (ticket: ApogeeTicket) => void;
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
  columnWidth?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div
      ref={setNodeRef}
      style={{ ...getColumnStyle(status.color), width: columnWidth, minWidth: columnWidth }}
      className={`flex flex-col rounded-lg border-2 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''} transition-all`}
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
        {tickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.id}
            ticket={ticket}
            onClick={() => onTicketClick(ticket)}
            modules={modules}
            ownerSides={ownerSides}
          />
        ))}
        {tickets.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun ticket
          </p>
        )}
      </ScrollArea>
    </div>
  );
}

export function TicketKanban({ tickets, statuses, modules, ownerSides, onStatusChange, onTicketClick, columnWidth = 288, onColumnWidthChange }: TicketKanbanProps) {
  const [activeTicket, setActiveTicket] = useState<ApogeeTicket | null>(null);
  const canTransition = useCanTransition();
  const logAction = useLogTicketAction();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      // Vérifier si l'utilisateur peut faire cette transition
      const canMove = canTransition(ticket.kanban_status, newStatus);
      
      if (!canMove) {
        toast.error('Vous n\'êtes pas autorisé à effectuer ce déplacement');
        return;
      }
      
      // Logger l'action avant le changement
      logAction.mutate({
        ticketId,
        actionType: 'status_change',
        oldValue: ticket.kanban_status,
        newValue: newStatus,
      });
      
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
            modules={modules}
            ownerSides={ownerSides}
            columnWidth={columnWidth}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket && (
          <Card className="w-72 shadow-xl border-2 border-primary rotate-3">
            <CardContent className="p-3">
              <p className="text-sm font-medium">{activeTicket.element_concerne}</p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
