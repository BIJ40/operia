/**
 * DraggableFolderTabs - Système d'onglets folder avec drag-and-drop et bordures colorées
 * Style unifié pour toutes les pages (Outils, Admin, Salariés)
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
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

// Palette de couleurs warm-pastel pour les bordures des onglets
const TAB_ACCENT_COLORS = {
  blue: 'hsl(var(--warm-blue))',
  purple: 'hsl(var(--warm-purple))',
  green: 'hsl(var(--warm-green))',
  orange: 'hsl(var(--warm-orange))',
  pink: 'hsl(var(--warm-pink))',
  teal: 'hsl(var(--warm-teal))',
} as const;

export type FolderTabAccent = keyof typeof TAB_ACCENT_COLORS;

export interface FolderTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  accent?: FolderTabAccent;
}

interface DraggableFolderTabProps {
  tab: FolderTabConfig;
  isActive: boolean;
  isDraggable: boolean;
  onClick: () => void;
  colorIndex: number;
}

function DraggableFolderTab({ 
  tab, 
  isActive, 
  isDraggable,
  onClick,
  colorIndex,
}: DraggableFolderTabProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: tab.id,
    disabled: !isDraggable 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const Icon = tab.icon;
  
  // Déterminer la couleur d'accent
  const accentKeys = Object.keys(TAB_ACCENT_COLORS) as FolderTabAccent[];
  const accentKey = tab.accent || accentKeys[colorIndex % accentKeys.length];
  const accentColor = TAB_ACCENT_COLORS[accentKey];

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: colorIndex * 0.03, duration: 0.15 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        ref={setNodeRef}
        {...(isDraggable ? { ...attributes, ...listeners } : {})}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 px-5 py-3",
          "rounded-t-2xl border-2 border-b-0",
          "font-medium text-sm transition-all duration-200",
          "relative -mb-[2px] z-10",
          isDragging && 'opacity-50 shadow-lg scale-105',
          isDraggable && 'cursor-grab active:cursor-grabbing',
          !isDraggable && 'cursor-pointer',
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
            "flex items-center justify-center w-6 h-6 rounded-lg",
            isActive ? "text-white" : "text-muted-foreground"
          )}
          style={{
            backgroundColor: isActive ? accentColor : 'transparent',
          }}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span>{tab.label}</span>
      </button>
    </motion.div>
  );
}

interface DraggableFolderTabsListProps {
  tabs: FolderTabConfig[];
  tabOrder?: string[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onReorder?: (newOrder: string[]) => void;
  isDraggable?: boolean;
  className?: string;
}

export function DraggableFolderTabsList({ 
  tabs, 
  tabOrder,
  activeTab, 
  onTabChange, 
  onReorder,
  isDraggable = true,
  className,
}: DraggableFolderTabsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Utiliser l'ordre fourni ou l'ordre par défaut, en ajoutant les tabs manquantes
  const allTabIds = tabs.map(t => t.id);
  const baseOrder = tabOrder || allTabIds;
  // Add any new tabs not in saved order, remove any stale ones
  const missingIds = allTabIds.filter(id => !baseOrder.includes(id));
  const validOrder = baseOrder.filter(id => allTabIds.includes(id));
  const effectiveOrder = [...validOrder, ...missingIds];

  // Self-heal: persist the reconciled order if it differs from saved
  React.useEffect(() => {
    if (onReorder && missingIds.length > 0) {
      onReorder(effectiveOrder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingIds.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && onReorder) {
      const oldIndex = effectiveOrder.indexOf(active.id as string);
      const newIndex = effectiveOrder.indexOf(over.id as string);
      onReorder(arrayMove(effectiveOrder, oldIndex, newIndex));
    }
  };

  // Trier les tabs selon l'ordre
  const sortedTabs = [...tabs].sort((a, b) => 
    effectiveOrder.indexOf(a.id) - effectiveOrder.indexOf(b.id)
  );

  const canDrag = isDraggable && !!onReorder;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={effectiveOrder} strategy={horizontalListSortingStrategy}>
        <div className={cn("flex flex-wrap gap-1 bg-transparent h-auto p-0 mb-0", className)}>
          {sortedTabs.map((tab, index) => (
            <DraggableFolderTab
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              isDraggable={canDrag}
              onClick={() => onTabChange(tab.id)}
              colorIndex={index}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface FolderContentContainerProps {
  children: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export function DraggableFolderContentContainer({ 
  children, 
  accentColor,
  className 
}: FolderContentContainerProps) {
  return (
    <div 
      className={cn(
        "rounded-2xl rounded-tl-none border-2 bg-background p-4 sm:p-6 shadow-sm",
        className
      )}
      style={{
        borderColor: accentColor || 'hsl(var(--border))',
      }}
    >
      {children}
    </div>
  );
}

// Version simple sans drag-and-drop mais avec couleurs
interface SimpleFolderTabsListProps {
  tabs: FolderTabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export function SimpleFolderTabsList({ 
  tabs, 
  activeTab, 
  onTabChange,
  className,
}: SimpleFolderTabsListProps) {
  return (
    <div className={cn("flex gap-1 bg-transparent h-auto p-0 mb-0", className)}>
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        // Déterminer la couleur d'accent
        const accentKeys = Object.keys(TAB_ACCENT_COLORS) as FolderTabAccent[];
        const accentKey = tab.accent || accentKeys[index % accentKeys.length];
        const accentColor = TAB_ACCENT_COLORS[accentKey];
        
        return (
          <motion.button
            key={tab.id}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.15 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-3",
              "rounded-t-2xl border-2 border-b-0",
              "font-medium text-sm transition-all duration-200",
              "relative -mb-[2px] z-10 cursor-pointer",
              isActive 
                ? "bg-background text-foreground shadow-md" 
                : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            style={{
              borderColor: isActive ? accentColor : undefined,
              boxShadow: isActive ? `0 -2px 8px -2px ${accentColor}40` : undefined,
            }}
          >
            <span 
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-lg",
                isActive ? "text-white" : "text-muted-foreground"
              )}
              style={{
                backgroundColor: isActive ? accentColor : 'transparent',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </span>
            <span>{tab.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
