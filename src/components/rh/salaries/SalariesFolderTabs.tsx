/**
 * SalariesFolderTabs - Onglets folder style pour les salariés
 * Style unifié avec bordures colorées comme dans les autres modules
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, ChevronRight } from 'lucide-react';
import { User } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { RHCollaborator } from '@/types/rh-suivi';
import { useSessionState } from '@/hooks/useSessionState';

// Palette de couleurs warm-pastel
const TAB_ACCENT_COLORS = [
  'hsl(var(--warm-blue))',
  'hsl(var(--warm-purple))',
  'hsl(var(--warm-green))',
  'hsl(var(--warm-orange))',
  'hsl(var(--warm-pink))',
  'hsl(var(--warm-teal))',
];

interface SalariesFolderTabsProps {
  collaborators: RHCollaborator[];
  activeCollaboratorId: string | null; // null = vue d'ensemble
  onSelectCollaborator: (id: string | null) => void;
}

function formatCollaboratorName(c: RHCollaborator): string {
  const firstName = c.first_name || '';
  const lastName = c.last_name || '';
  // Afficher le NOM pour éviter l'ambiguïté (ex: voir "PASQUIER")
  return lastName ? `${lastName} ${firstName}`.trim() : firstName;
}

interface DraggableCollabTabProps {
  collaborator: RHCollaborator;
  isActive: boolean;
  colorIndex: number;
  onClick: () => void;
}

function DraggableCollabTab({ collaborator, isActive, colorIndex, onClick }: DraggableCollabTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collaborator.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const accentColor = TAB_ACCENT_COLORS[colorIndex % TAB_ACCENT_COLORS.length];
  const displayName = formatCollaboratorName(collaborator);

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (colorIndex + 1) * 0.03, duration: 0.15 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5",
          "rounded-t-2xl border-2 border-b-0",
          "font-medium text-sm transition-all duration-200",
          "relative -mb-[2px] z-10",
          "shrink-0",
          "cursor-grab active:cursor-grabbing",
          isDragging && 'opacity-50 shadow-lg scale-105',
          isActive 
            ? "bg-background text-foreground shadow-md" 
            : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        style={{
          ...style,
          borderColor: isActive ? accentColor : undefined,
          boxShadow: isActive ? `0 -2px 8px -2px ${accentColor}40` : undefined,
        }}
      >
        <span 
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md",
            isActive ? "text-white" : "text-muted-foreground"
          )}
          style={{
            backgroundColor: isActive ? accentColor : 'transparent',
          }}
        >
          <User className="w-3 h-3" />
        </span>
        <span className="whitespace-nowrap max-w-[12rem] truncate">{displayName}</span>
      </button>
    </motion.div>
  );
}

export function SalariesFolderTabs({
  collaborators,
  activeCollaboratorId,
  onSelectCollaborator,
}: SalariesFolderTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Ordre des onglets persisté
  const [tabOrder, setTabOrder] = useSessionState<string[]>(
    'salaries_tab_order',
    collaborators.map(c => c.id)
  );
  
  // Détecter si on peut scroller à droite
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const checkScroll = () => {
      const hasMoreContent = container.scrollWidth > container.clientWidth + container.scrollLeft + 10;
      setCanScrollRight(hasMoreContent);
    };
    
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    
    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [collaborators]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const collabIds = collaborators.map(c => c.id);
      const effectiveOrder = tabOrder.filter(id => collabIds.includes(id));
      
      const oldIndex = effectiveOrder.indexOf(active.id as string);
      const newIndex = effectiveOrder.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        setTabOrder(arrayMove(effectiveOrder, oldIndex, newIndex));
      }
    }
  }, [collaborators, tabOrder, setTabOrder]);

  // Trier les collaborateurs selon l'ordre persisté
  const sortedCollaborators = [...collaborators].sort((a, b) => {
    const aIndex = tabOrder.indexOf(a.id);
    const bIndex = tabOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const overviewAccent = 'hsl(var(--warm-teal))';

  return (
    <div className="relative">
      <div 
        ref={containerRef}
        className="flex items-end gap-1 overflow-x-auto scrollbar-hide pb-0"
      >
        {/* Onglet Vue d'ensemble */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.15 }}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <button
          onClick={() => onSelectCollaborator(null)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5",
            "rounded-t-2xl border-2 border-b-0",
            "font-medium text-sm transition-all duration-200",
            "relative -mb-[2px] z-10 cursor-pointer",
            "shrink-0",
            activeCollaboratorId === null 
              ? "bg-background text-foreground shadow-md" 
              : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          style={{
            borderColor: activeCollaboratorId === null ? overviewAccent : undefined,
            boxShadow: activeCollaboratorId === null ? `0 -2px 8px -2px ${overviewAccent}40` : undefined,
          }}
        >
          <span 
            className={cn(
              "flex items-center justify-center w-5 h-5 rounded-md",
              activeCollaboratorId === null ? "text-white" : "text-muted-foreground"
            )}
            style={{
              backgroundColor: activeCollaboratorId === null ? overviewAccent : 'transparent',
            }}
          >
            <Users className="w-3 h-3" />
          </span>
          <span>Tous</span>
        </button>
      </motion.div>

      {/* Séparateur */}
      {collaborators.length > 0 && (
        <div className="h-6 w-px bg-border/50 mx-1 self-center" />
      )}

      {/* Onglets collaborateurs avec drag-and-drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={sortedCollaborators.map(c => c.id)} 
          strategy={horizontalListSortingStrategy}
        >
          {sortedCollaborators.map((collab, index) => (
            <DraggableCollabTab
              key={collab.id}
              collaborator={collab}
              isActive={activeCollaboratorId === collab.id}
              colorIndex={index}
              onClick={() => onSelectCollaborator(collab.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      </div>
      
      {/* Indicateur de scroll à droite */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none flex items-center justify-end pr-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground animate-pulse" />
        </div>
      )}
    </div>
  );
}
