/**
 * Vue Kanban des tickets Apogée - Drag and drop avec permissions
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, GripVertical, ChevronLeft, ChevronRight, GitMerge, Maximize2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HeatPriorityBadge } from './HeatPriorityBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCanTransition } from '../hooks/useTicketPermissions';
import { useMyTicketViews } from '../hooks/useTicketViews';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import type { ApogeeTicket, ApogeeTicketStatus, ApogeeModule, ApogeeOwnerSide } from '../types';

const COLLAPSED_COLUMNS_STORAGE_KEY = 'apogee-kanban-collapsed-columns';
const DEFAULT_EXPANDED_COUNT = 3;

interface TicketKanbanProps {
  tickets: ApogeeTicket[];
  statuses: ApogeeTicketStatus[];
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
  onStatusChange: (ticketId: string, newStatus: string) => void;
  onTicketClick: (ticket: ApogeeTicket) => void;
  onMerge?: (ticket: ApogeeTicket) => void;
  columnWidth?: number;
  onColumnWidthChange?: (width: number) => void;
  filterBlinkingOnly?: boolean;
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
  onMerge,
  modules = [],
  ownerSides = [],
  shouldBlink = false,
}: {
  ticket: ApogeeTicket;
  onClick: () => void;
  onMerge?: (ticket: ApogeeTicket) => void;
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
  shouldBlink?: boolean;
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

  // Clignotement rouge pour tickets support urgents non résolus
  const isUrgentSupport = ticket.is_urgent_support === true;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "hover:shadow-md transition-shadow mb-2 border-l-4 group cursor-pointer",
        shouldBlink && "animate-pulse ring-2 ring-green-500 ring-offset-1",
        isUrgentSupport && "animate-pulse ring-2 ring-destructive ring-offset-1 border-l-destructive"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Ticket # + Handle de drag + badges */}
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            data-drag-handle
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-40 hover:opacity-100 transition-opacity touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 flex flex-wrap gap-1 items-center">
            <span className="text-xs font-mono text-muted-foreground font-semibold">
              APO-{String(ticket.ticket_number || 0).padStart(3, '0')}
            </span>
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
            {ticket.created_from === 'support' && (
              <Badge className="bg-purple-100 text-purple-700 text-xs border border-purple-200">
                📩 Support
              </Badge>
            )}
            {ticket.created_from === 'email' && (
              <Badge className="bg-teal-100 text-teal-700 text-xs border border-teal-200">
                📧 Email
              </Badge>
            )}
            {isUrgentSupport && (
              <Badge variant="destructive" className="text-xs gap-1">
                🔥 Urgent
              </Badge>
            )}
          </div>
          
          {/* Actions au survol */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Bouton déployer - popover élargi */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded hover:bg-blue-100 transition-colors"
                  title="Voir les détails"
                >
                  <Maximize2 className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                </button>
              </PopoverTrigger>
              <PopoverContent 
                side="left" 
                align="start"
                className="w-[400px] max-h-[500px] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  {/* Header avec numéro et badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-bold text-primary">
                      APO-{String(ticket.ticket_number || 0).padStart(3, '0')}
                    </span>
                    <HeatPriorityBadge priority={ticket.heat_priority} size="sm" />
                    {ticket.module && moduleColor && (
                      <Badge style={{ backgroundColor: moduleColor }} className="text-white">
                        {ticket.apogee_modules?.label || ticket.module}
                      </Badge>
                    )}
                    {ticket.owner_side && ownerColor && (
                      <Badge style={{ backgroundColor: ownerColor }} className="text-white">
                        {ownerLabel}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Titre complet */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">Élément concerné</h4>
                    <p className="text-sm font-medium">{ticket.element_concerne}</p>
                  </div>
                  
                  {/* Description complète */}
                  {ticket.description && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Description</h4>
                      <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  )}
                  
                  {/* Tags */}
                  {ticket.impact_tags && ticket.impact_tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {ticket.impact_tags.map(tag => {
                          const tagColor = tag === 'BUG' ? 'bg-red-100 text-red-800' :
                                           tag === 'EVO' ? 'bg-blue-100 text-blue-800' :
                                           tag === 'NTH' ? 'bg-gray-100 text-gray-800' :
                                           'bg-purple-100 text-purple-800';
                          return (
                            <Badge key={tag} variant="secondary" className={tagColor}>
                              {tag}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Estimation */}
                  {(ticket.h_min || ticket.h_max) && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Estimation</h4>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {ticket.h_min || '?'} - {ticket.h_max || '?'} heures
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Notes internes */}
                  {ticket.notes_internes && (
                    <div>
                      <h4 className="font-semibold text-sm text-muted-foreground mb-1">Notes internes</h4>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">
                        {ticket.notes_internes}
                      </p>
                    </div>
                  )}
                  
                  {/* Commentaires */}
                  {ticket._count?.comments !== undefined && ticket._count.comments > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                      <MessageSquare className="h-4 w-4" />
                      <span>{ticket._count.comments} commentaire{ticket._count.comments > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  {/* Bouton pour ouvrir le drawer complet */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClick();
                    }}
                  >
                    Ouvrir le détail complet
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Bouton fusion - violet HelpConfort */}
            {onMerge && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMerge(ticket);
                }}
                className="p-1.5 rounded hover:bg-purple-100 transition-colors"
                title="Fusionner avec un autre ticket"
              >
                <GitMerge className="w-4 h-4 text-purple-500 hover:text-purple-700" />
              </button>
            )}
          </div>
        </div>

        {/* Titre */}
        <p className="text-sm font-medium line-clamp-2 cursor-pointer hover:text-primary">
          {ticket.element_concerne}
        </p>

        {/* Tags */}
        {ticket.impact_tags && ticket.impact_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ticket.impact_tags.map(tag => {
              const tagColor = tag === 'BUG' ? 'bg-red-100 text-red-800' :
                               tag === 'EVO' ? 'bg-blue-100 text-blue-800' :
                               tag === 'NTH' ? 'bg-gray-100 text-gray-800' :
                               'bg-purple-100 text-purple-800';
              return (
                <Badge key={tag} variant="secondary" className={`${tagColor} text-xs`}>
                  {tag}
                </Badge>
              );
            })}
          </div>
        )}

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

// Helper pour calculer le multiplicateur PEC
function getPECMultiplier(ownerSideId: string | null): number {
  if (!ownerSideId) return 0;
  const id = ownerSideId.toUpperCase();
  if (id === 'APOGEE' || id === 'APOGÉE') return 0;
  if (id === '75_25' || id === '75/25') return 0.25;
  if (id === '50_50' || id === '50/50') return 0.50;
  if (id === '25_75' || id === '25/75') return 0.75;
  if (id === 'HC' || id === 'HELPCONFORT') return 1;
  return 0;
}

// Helper pour calculer le temps total pondéré par PEC pour une liste de tickets
function calculatePECWeightedTime(tickets: ApogeeTicket[]): { totalHours: number; pecHours: number } {
  let totalHours = 0;
  let pecHours = 0;
  
  for (const ticket of tickets) {
    // Utiliser h_max si disponible, sinon h_min, sinon 0
    const hours = ticket.h_max || ticket.h_min || 0;
    totalHours += hours;
    
    const multiplier = getPECMultiplier(ticket.owner_side);
    pecHours += hours * multiplier;
  }
  
  return { totalHours, pecHours };
}

// Composant colonne droppable
function DroppableColumn({
  status,
  tickets,
  onTicketClick,
  onMerge,
  modules,
  ownerSides,
  columnWidth = 288,
  isCollapsed,
  onToggleCollapse,
  getTicketShouldBlink,
  showPECSummary = false,
}: {
  status: ApogeeTicketStatus;
  tickets: ApogeeTicket[];
  onTicketClick: (ticket: ApogeeTicket) => void;
  onMerge?: (ticket: ApogeeTicket) => void;
  modules?: ApogeeModule[];
  ownerSides?: ApogeeOwnerSide[];
  columnWidth?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  getTicketShouldBlink: (ticket: ApogeeTicket) => boolean;
  showPECSummary?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  // Calcul PEC pour la colonne
  const pecStats = useMemo(() => {
    if (!showPECSummary) return null;
    return calculatePECWeightedTime(tickets);
  }, [tickets, showPECSummary]);

  // Colonne repliée
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        style={{ ...getColumnStyle(status.color) }}
        className={`flex flex-col rounded-lg border-2 w-12 min-w-12 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''} transition-all`}
      >
        <div className="p-2 border-b flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onToggleCollapse}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="text-xs">
            {tickets.length}
          </Badge>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span 
            className="text-xs font-semibold whitespace-nowrap origin-center"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {status.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...getColumnStyle(status.color), width: columnWidth, minWidth: columnWidth }}
      className={`flex flex-col rounded-lg border-2 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''} transition-all`}
    >
      {/* PEC Summary - affiché au-dessus de l'en-tête si activé */}
      {showPECSummary && pecStats && (
        <div className="px-3 pt-2 pb-1 border-b bg-amber-50 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-3 w-3 text-amber-600" />
            <span className="text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{pecStats.totalHours.toFixed(1)}h</span>
            </span>
            <span className="text-muted-foreground">
              × PEC: <span className="font-bold text-amber-600">{pecStats.pecHours.toFixed(1)}h</span>
            </span>
          </div>
        </div>
      )}
      
      <div className="p-3 border-b">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onToggleCollapse}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-sm flex-1 truncate">{status.label}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">
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
            onMerge={onMerge}
            modules={modules}
            ownerSides={ownerSides}
            shouldBlink={getTicketShouldBlink(ticket)}
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

export function TicketKanban({ tickets, statuses, modules, ownerSides, onStatusChange, onTicketClick, onMerge, columnWidth = 288, onColumnWidthChange, filterBlinkingOnly = false }: TicketKanbanProps) {
  const { user } = useAuth();
  const [activeTicket, setActiveTicket] = useState<ApogeeTicket | null>(null);
  const canTransition = useCanTransition();
  const { data: myViews = [] } = useMyTicketViews();

  // Fonction pour déterminer si un ticket doit clignoter
  const getTicketShouldBlink = useCallback((ticket: ApogeeTicket): boolean => {
    if (!user?.id || !ticket.last_modified_by_user_id || !ticket.last_modified_at) {
      return false;
    }
    // Ne clignote pas si c'est l'utilisateur courant qui a modifié
    if (ticket.last_modified_by_user_id === user.id) {
      return false;
    }
    // Chercher la dernière vue
    const myView = myViews.find(v => v.ticket_id === ticket.id);
    if (!myView) {
      return true; // Jamais vu, et modifié par quelqu'un d'autre
    }
    // Comparer les dates
    return new Date(ticket.last_modified_at).getTime() > new Date(myView.viewed_at).getTime();
  }, [user?.id, myViews]);

  // Initialize collapsed columns from localStorage or default (first 3 expanded)
  const [collapsedColumns, setCollapsedColumns] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_COLUMNS_STORAGE_KEY);
      if (saved) {
        return new Set(JSON.parse(saved));
      }
    } catch (e) {
      // Ignore parse errors
    }
    // Default: collapse all except first 3
    return new Set();
  });

  // Apply default collapse on first render when statuses are loaded
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (statuses.length > 0 && !hasInitialized) {
      const saved = localStorage.getItem(COLLAPSED_COLUMNS_STORAGE_KEY);
      if (!saved) {
        // No saved preference - apply default: collapse all except first 3
        const defaultCollapsed = new Set(
          statuses.slice(DEFAULT_EXPANDED_COUNT).map(s => s.id)
        );
        setCollapsedColumns(defaultCollapsed);
        localStorage.setItem(COLLAPSED_COLUMNS_STORAGE_KEY, JSON.stringify([...defaultCollapsed]));
      }
      setHasInitialized(true);
    }
  }, [statuses, hasInitialized]);

  // Persist collapsed columns to localStorage
  const toggleColumnCollapse = useCallback((statusId: string) => {
    setCollapsedColumns(prev => {
      const next = new Set(prev);
      if (next.has(statusId)) {
        next.delete(statusId);
      } else {
        next.add(statusId);
      }
      // Save to localStorage
      localStorage.setItem(COLLAPSED_COLUMNS_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Grouper les tickets par statut (avec filtre optionnel "blinking only")
  const ticketsByStatus = useMemo(() => {
    const grouped: Record<string, ApogeeTicket[]> = {};
    statuses.forEach((status) => {
      let statusTickets = tickets.filter((t) => t.kanban_status === status.id);
      if (filterBlinkingOnly) {
        statusTickets = statusTickets.filter(getTicketShouldBlink);
      }
      grouped[status.id] = statusTickets;
    });
    return grouped;
  }, [tickets, statuses, filterBlinkingOnly, getTicketShouldBlink]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  // ============================================
  // COLONNES PROTÉGÉES - Drop manuel interdit
  // ============================================
  const PROTECTED_DROP_TARGETS = ['USER', 'SUPPORT_RESOLU'];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as string;

    // Vérifier que c'est un statut valide
    if (!statuses.find((s) => s.id === newStatus)) return;

    // ============================================
    // RÈGLE: Interdire le drop dans USER et SUPPORT_RESOLU
    // Ces colonnes sont réservées au système
    // ============================================
    if (PROTECTED_DROP_TARGETS.includes(newStatus)) {
      toast.error('Cette colonne est réservée au système. Déplacement manuel interdit.');
      return;
    }

    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket && ticket.kanban_status !== newStatus) {
      // Vérifier si l'utilisateur peut faire cette transition
      const canMove = canTransition(ticket.kanban_status, newStatus);
      
      if (!canMove) {
        toast.error('Vous n\'êtes pas autorisé à effectuer ce déplacement');
        return;
      }
      
      // Le logging est géré par la mutation centrale appelée par onStatusChange
      // (évite les doublons dans l'historique)
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
            onMerge={onMerge}
            modules={modules}
            ownerSides={ownerSides}
            columnWidth={columnWidth}
            isCollapsed={collapsedColumns.has(status.id)}
            onToggleCollapse={() => toggleColumnCollapse(status.id)}
            getTicketShouldBlink={getTicketShouldBlink}
            showPECSummary={status.id === 'DEVIS' || status.id === 'a_chiffrer'}
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
