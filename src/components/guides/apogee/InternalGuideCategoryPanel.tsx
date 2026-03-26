/**
 * InternalGuideCategoryPanel - Contenu d'une catégorie (dans un onglet) pour le Guide interne
 * Version Warm Pastel avec accordéons stylisés + mode édition pour admins
 */

import { useMemo, useState, useCallback, ReactNode } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditor } from '@/contexts/EditorContext';
import { useInternalGuideTabs } from './InternalGuideTabsContext';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsDownUp, 
  ChevronsUpDown,
  Lightbulb,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Pencil,
  GripVertical
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Block, ColorPreset, TipsType } from '@/types/block';
import { createSanitizedHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';
import { SectionEditForm } from '@/components/SectionEditForm';
import { TipsEditForm } from '@/components/TipsEditForm';
import { useToast } from '@/hooks/use-toast';

// Couleurs Warm Pastel pour les TIPS
const TIPS_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  danger: { bg: 'bg-red-50/80 dark:bg-red-950/30', border: 'border-l-red-400', icon: 'text-red-500' },
  warning: { bg: 'bg-warm-orange/10', border: 'border-l-warm-orange', icon: 'text-warm-orange' },
  success: { bg: 'bg-warm-green/10', border: 'border-l-warm-green', icon: 'text-warm-green' },
  information: { bg: 'bg-warm-blue/10', border: 'border-l-warm-blue', icon: 'text-warm-blue' },
};

// Sortable wrapper for drag-and-drop
function SortableSectionWrapper({ id, children }: { id: string; children: (props: { dragAttributes: Record<string, any>; dragListeners: Record<string, any> | undefined }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragAttributes: attributes, dragListeners: listeners })}
    </div>
  );
}

interface InternalGuideCategoryPanelProps {
  slug: string;
}

export function InternalGuideCategoryPanel({ slug }: InternalGuideCategoryPanelProps) {
  const { blocks, loading, isEditMode, addBlock, updateBlock, deleteBlock } = useEditor();
  const { openTab } = useInternalGuideTabs();
  const { toast } = useToast();
  
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);
  
  // États pour les dialogues d'édition
  const [editingSection, setEditingSection] = useState<Block | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  // Trouver la catégorie
  const category = useMemo(() => 
    blocks.find(b => b.type === 'category' && b.slug === slug),
    [blocks, slug]
  );

  // Catégories pour navigation précédent/suivant
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => 
        b.type === 'category' && 
        !b.title.toLowerCase().includes('faq') && 
        !b.slug.startsWith('helpconfort-') &&
        !b.title.toLowerCase().includes('support de formation') &&
        !b.title.toLowerCase().includes('recap fiches rapides') &&
        !b.title.toLowerCase().includes('récap fiches rapides')
      )
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  const currentCategoryIndex = useMemo(() => 
    availableCategories.findIndex(c => c.slug === slug),
    [availableCategories, slug]
  );

  const prevCategory = currentCategoryIndex > 0 ? availableCategories[currentCategoryIndex - 1] : null;
  const nextCategory = currentCategoryIndex < availableCategories.length - 1 ? availableCategories[currentCategoryIndex + 1] : null;

  // Sections de cette catégorie
  const sections = useMemo(() => 
    blocks
      .filter(b => b.parentId === category?.id && b.type === 'section')
      .sort((a, b) => a.order - b.order),
    [blocks, category?.id]
  );

  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      if (section.contentType === 'tips') return showTips;
      return showSections;
    });
  }, [sections, showTips, showSections]);

  // DnD sensors & handler
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = filteredSections.findIndex(s => s.id === active.id);
    const newIndex = filteredSections.findIndex(s => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(filteredSections, oldIndex, newIndex);
    
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        await updateBlock(reordered[i].id, { order: i });
      }
    }
    toast({ title: 'Ordre mis à jour' });
  }, [filteredSections, updateBlock, toast]);

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) return BookOpen;
    const IconsRecord = Icons as unknown as Record<string, LucideIcon>;
    const Icon = IconsRecord[iconName];
    return Icon || BookOpen;
  };

  const handleNavigateCategory = (cat: Block) => {
    const Icon = getIcon(cat.icon);
    openTab(cat.slug, cat.title, Icon);
  };

  // Handlers pour l'édition
  const handleEditSection = useCallback((section: Block) => {
    setEditingSection(section);
  }, []);

  const handleDeleteSection = useCallback((sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (sectionToDelete) {
      await deleteBlock(sectionToDelete);
      toast({ title: 'Section supprimée' });
    }
    setDeleteDialogOpen(false);
    setSectionToDelete(null);
  }, [sectionToDelete, deleteBlock, toast]);

  const handleAddSection = useCallback(async (afterSectionId?: string) => {
    if (!category) return;
    
    const afterSection = afterSectionId ? sections.find(s => s.id === afterSectionId) : null;
    const newOrder = afterSection 
      ? afterSection.order + 0.5 
      : (sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0);

    await addBlock({
      type: 'section',
      title: 'Nouvelle section',
      slug: `section-${Date.now()}`,
      content: '<p>Contenu de la section...</p>',
      parentId: category.id,
      order: newOrder,
      colorPreset: 'white',
      contentType: 'section',
      attachments: [],
    });

    toast({ title: 'Section créée' });
  }, [category, sections, addBlock, toast]);

  const handleAddTips = useCallback(async (afterSectionId?: string) => {
    if (!category) return;
    
    const afterSection = afterSectionId ? sections.find(s => s.id === afterSectionId) : null;
    const newOrder = afterSection 
      ? afterSection.order + 0.5 
      : (sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0);

    await addBlock({
      type: 'section',
      title: 'Nouveau TIPS',
      slug: `tips-${Date.now()}`,
      content: '<p>Contenu du tips...</p>',
      parentId: category.id,
      order: newOrder,
      colorPreset: 'white',
      contentType: 'tips',
      tipsType: 'information',
      attachments: [],
    });

    toast({ title: 'TIPS créé' });
  }, [category, sections, addBlock, toast]);

  const handleDuplicate = useCallback(async (section: Block) => {
    if (!category) return;
    
    const newOrder = section.order + 0.5;

    await addBlock({
      ...section,
      title: `${section.title} (copie)`,
      slug: `${section.slug}-copy-${Date.now()}`,
      order: newOrder,
    });

    toast({ title: 'Section dupliquée' });
  }, [category, addBlock, toast]);

  const handleSaveSection = useCallback(async (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    summary?: string;
    showSummary?: boolean;
    hideTitle?: boolean;
    hideFromSidebar?: boolean;
    isInProgress?: boolean;
    completedAt?: string;
    contentUpdatedAt?: string;
    isEmpty?: boolean;
  }) => {
    if (!editingSection) return;
    
    await updateBlock(editingSection.id, {
      title: data.title,
      content: data.content,
      colorPreset: data.colorPreset,
      summary: data.summary,
      showSummary: data.showSummary,
      hideTitle: data.hideTitle,
      hideFromSidebar: data.hideFromSidebar,
      isInProgress: data.isInProgress,
      completedAt: data.completedAt,
      contentUpdatedAt: data.contentUpdatedAt,
      isEmpty: data.isEmpty,
    });

    toast({ title: 'Section modifiée' });
    setEditingSection(null);
  }, [editingSection, updateBlock, toast]);

  const handleSaveTips = useCallback(async (
    title: string, 
    content: string, 
    tipsType: TipsType, 
    hideFromSidebar: boolean
  ) => {
    if (!editingSection) return;
    
    await updateBlock(editingSection.id, {
      title,
      content,
      tipsType,
      hideFromSidebar,
    });

    toast({ title: 'TIPS modifié' });
    setEditingSection(null);
  }, [editingSection, updateBlock, toast]);

  const handleRichContentClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target;
    const targetElement = target instanceof HTMLElement
      ? target
      : target instanceof SVGElement
        ? target as unknown as HTMLElement
        : target instanceof Node
          ? target.parentElement
          : null;

    if (!targetElement) return;

    const imageTrigger = targetElement.closest('[data-image-modal], [data-image-button], [data-src], a[href], img') as HTMLElement | null;
    if (!imageTrigger) return;

    const href = imageTrigger instanceof HTMLAnchorElement ? imageTrigger.getAttribute('href') : null;
    const url = (href && (href.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(href)))
      ? href
      : imageTrigger instanceof HTMLImageElement
        ? imageTrigger.currentSrc || imageTrigger.src
        : imageTrigger.getAttribute('data-image-modal')
          || imageTrigger.getAttribute('data-src')
          || imageTrigger.closest('[data-image-button]')?.getAttribute('data-src')
          || imageTrigger.querySelector('[data-image-modal]')?.getAttribute('data-image-modal');

    if (!url) return;

    event.preventDefault();
    event.stopPropagation();
    window.dispatchEvent(new CustomEvent('open-image-modal', { detail: { url } }));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted/50 animate-pulse rounded-xl mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted/50 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Catégorie non trouvée</p>
      </div>
    );
  }

  const renderSectionContent = (section: Block) => {
    const isTips = section.contentType === 'tips';
    const tipsType = section.tipsType || 'information';
    const colors = TIPS_COLORS[tipsType] || TIPS_COLORS.information;

    if (isTips) {
      return (
        <div className={cn(
          "rounded-xl border-l-4 p-4",
          colors.bg,
          colors.border
        )}>
          <div className="flex items-start gap-3">
            <Lightbulb className={cn("w-5 h-5 mt-0.5 flex-shrink-0", colors.icon)} />
            <div 
              className="prose prose-sm dark:prose-invert max-w-none flex-1"
              onClickCapture={handleRichContentClick}
              dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
            />
          </div>
        </div>
      );
    }

    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        onClickCapture={handleRichContentClick}
        dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
      />
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header avec navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mt-2 pt-2 rounded-2xl">
        <div className="flex items-center justify-between gap-2">
          {/* Zone gauche - Navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-warm-blue/10 hover:text-warm-blue"
                    disabled={!prevCategory}
                    onClick={() => prevCategory && handleNavigateCategory(prevCategory)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                {prevCategory && (
                  <TooltipContent side="bottom" className="rounded-xl">
                    {prevCategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Zone centrale - Titre */}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-xl font-bold text-foreground truncate">
              {category.title}
            </h1>
          </div>
          
          {/* Zone droite - Progress + Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-warm-teal transition-all duration-300 rounded-full"
                style={{ width: `${((currentCategoryIndex + 1) / availableCategories.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap bg-muted/30 px-2 py-1 rounded-lg">
              {currentCategoryIndex + 1}/{availableCategories.length}
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 rounded-xl hover:bg-warm-blue/10 hover:text-warm-blue"
                    disabled={!nextCategory}
                    onClick={() => nextCategory && handleNavigateCategory(nextCategory)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                {nextCategory && (
                  <TooltipContent side="bottom" className="rounded-xl">
                    {nextCategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Boutons de filtrage + mode édition */}
        <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
          {/* Boutons d'ajout pour admins */}
          {isEditMode && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSection()}
                className="gap-1.5 h-8 text-xs rounded-xl border-warm-green/50 text-warm-green hover:bg-warm-green/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Section
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddTips()}
                className="gap-1.5 h-8 text-xs rounded-xl border-warm-orange/50 text-warm-orange hover:bg-warm-orange/10"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                TIPS
              </Button>
            </div>
          )}
          
          {/* Boutons de filtrage à droite */}
          <div className="flex items-center gap-2 ml-auto">
            {hasTips && (
              <Button
                variant={showTips ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTips(!showTips)}
                className={cn(
                  "gap-1.5 h-8 text-xs rounded-xl transition-all",
                  showTips 
                    ? "bg-warm-orange/90 hover:bg-warm-orange text-white border-0" 
                    : "border-warm-orange/30 text-warm-orange hover:bg-warm-orange/10"
                )}
              >
                <Lightbulb className="h-3.5 w-3.5" />
                TIPS
              </Button>
            )}
            {hasSections && (
              <Button
                variant={showSections ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSections(!showSections)}
                className={cn(
                  "gap-1.5 h-8 text-xs rounded-xl transition-all",
                  showSections 
                    ? "bg-warm-blue/90 hover:bg-warm-blue text-white border-0" 
                    : "border-warm-blue/30 text-warm-blue hover:bg-warm-blue/10"
                )}
              >
                Sections
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.id))}
              className="gap-1.5 h-8 text-xs rounded-xl border-border/50 hover:bg-muted/50"
            >
              {openAccordions.length > 0 ? (
                <><ChevronsDownUp className="h-3.5 w-3.5" />Fermer</>
              ) : (
                <><ChevronsUpDown className="h-3.5 w-3.5" />Ouvrir</>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            {sections.length === 0 
              ? "Aucune section dans cette catégorie" 
              : "Utilisez les boutons TIPS / Sections pour afficher le contenu"}
          </p>
          {isEditMode && sections.length === 0 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddSection()}
                className="gap-1.5 rounded-xl"
              >
                <Plus className="h-4 w-4" />
                Ajouter une section
              </Button>
            </div>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <Accordion
              type="multiple"
              value={openAccordions}
              onValueChange={setOpenAccordions}
              className="space-y-3"
            >
              {filteredSections.map((section) => {
                const isTips = section.contentType === 'tips';
                
                // TIPS inline (pas d'accordéon)
                if (isTips && section.hideTitle) {
                  return (
                    <SortableSectionWrapper key={section.id} id={section.id}>
                      {({ dragAttributes, dragListeners }) => (
                        <div className="relative group">
                          {renderSectionContent(section)}
                          {isEditMode && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background cursor-move"
                                {...dragAttributes}
                                {...dragListeners}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-background"
                                onClick={() => handleEditSection(section)}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 bg-background/80 hover:bg-destructive/10 text-destructive"
                                onClick={() => handleDeleteSection(section.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </SortableSectionWrapper>
                  );
                }

                return (
                  <SortableSectionWrapper key={section.id} id={section.id}>
                    {({ dragAttributes, dragListeners }) => (
                      <AccordionItem 
                        value={section.id} 
                        className="border border-border/40 rounded-2xl px-4 bg-card/50 backdrop-blur-sm shadow-sm group"
                      >
                        <AccordionTrigger className="text-left py-4 hover:no-underline">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3">
                              {isTips && (
                                <div className="w-7 h-7 rounded-lg bg-warm-orange/15 flex items-center justify-center">
                                  <Lightbulb className="w-4 h-4 text-warm-orange" />
                                </div>
                              )}
                              <span className="text-sm font-medium">{section.title}</span>
                            </div>
                            
                            {/* Boutons d'édition */}
                            {isEditMode && (
                              <div 
                                className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-muted cursor-move"
                                  {...dragAttributes}
                                  {...dragListeners}
                                  title="Déplacer"
                                >
                                  <GripVertical className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddSection(section.id);
                                  }}
                                  title="Ajouter section après"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-warm-orange/10 text-warm-orange"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddTips(section.id);
                                  }}
                                  title="Ajouter TIPS après"
                                >
                                  <Lightbulb className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSection(section);
                                  }}
                                  title="Modifier"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicate(section);
                                  }}
                                  title="Dupliquer"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-destructive/10 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSection(section.id);
                                  }}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {renderSectionContent(section)}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </SortableSectionWrapper>
                );
              })}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      {/* Dialog d'édition */}
      <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection?.contentType === 'tips' ? 'Modifier le TIPS' : 'Modifier la section'}
            </DialogTitle>
          </DialogHeader>
          {editingSection && (
            editingSection.contentType === 'tips' ? (
              <TipsEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content}
                initialTipsType={(editingSection.tipsType || 'information') as TipsType}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                onSave={handleSaveTips}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <SectionEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content}
                initialColor={editingSection.colorPreset as ColorPreset}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                initialSummary={editingSection.summary || ''}
                initialShowSummary={editingSection.showSummary || false}
                initialHideTitle={editingSection.hideTitle || false}
                initialIsInProgress={editingSection.isInProgress || false}
                initialCompletedAt={editingSection.completedAt}
                initialContentUpdatedAt={editingSection.contentUpdatedAt}
                initialIsEmpty={editingSection.isEmpty || false}
                onSave={handleSaveSection}
                onCancel={() => setEditingSection(null)}
              />
            )
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La section sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
