import { useParams, useLocation, Link, Navigate } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsDownUp, ChevronsUpDown, Lightbulb } from 'lucide-react';
import { DocumentsList } from '@/components/DocumentsList';
import { SectionEditForm } from '@/components/SectionEditForm';
import { TipsEditForm } from '@/components/TipsEditForm';
import { ColorPreset, TipsType } from '@/types/block';
import { Accordion } from '@/components/ui/accordion';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CategorySortableItem, Section, CategoryBlock } from '@/components/category';

export default function CategoryHelpConfort() {
  const { slug } = useParams();
  const location = useLocation();

  const { blocks, updateBlock, deleteBlock, addBlock, reorderBlocks, isEditMode } = useEditor();
  const { isAuthenticated, isAdmin, hasAccessToScope } = useAuth();
  const { toast } = useToast();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!hasAccessToScope('helpconfort')) {
    return <Navigate to="/" replace />;
  }
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug) as CategoryBlock | undefined;
  
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => b.type === 'category' && b.slug.startsWith('helpconfort-'))
      .sort((a, b) => a.order - b.order),
    [blocks]
  );
  
  const sections = useMemo(() => 
    blocks
      .filter(b => b.type === 'section' && b.parentId === category?.id)
      .sort((a, b) => a.order - b.order) as Section[],
    [blocks, category?.id]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const savedScrollPositionRef = useRef<number>(0);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);

  useEffect(() => {
    const tipsIds = sections
      .filter(s => s.contentType === 'tips' && !s.isSingleSection && !s.hideTitle)
      .map(s => s.id);
    
    setOpenAccordions(prev => {
      const newIds = tipsIds.filter(id => !prev.includes(id));
      return [...prev, ...newIds];
    });
  }, [sections]);

  useEffect(() => {
    setShowTips(true);
    setShowSections(true);
  }, [slug]);

  useEffect(() => {
    if (!category) return;
    
    const hash = location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash)) {
      setOpenAccordions(prev => prev.includes(hash) ? prev : [...prev, hash]);
      
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          const headerOffset = 140;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 400);
    }
  }, [location.hash, sections, category]);

  useEffect(() => {
    setOpenAccordions([]);
  }, [isEditMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        savedScrollPositionRef.current = window.scrollY;
      } else {
        setTimeout(() => {
          if (savedScrollPositionRef.current > 0) {
            window.scrollTo({ top: savedScrollPositionRef.current, behavior: 'instant' });
          }
        }, 50);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const saveScrollPosition = () => {
      if (editingId) {
        savedScrollPositionRef.current = window.scrollY;
      }
    };

    const intervalId = setInterval(saveScrollPosition, 1000);
    return () => clearInterval(intervalId);
  }, [editingId]);

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleEdit = (sectionId: string) => {
    setEditingId(sectionId);
    setOpenAccordions(prev => prev.includes(sectionId) ? prev : [...prev, sectionId]);
    setEditDialogOpen(true);
  };

  const restoreScrollPosition = (scrollPos: number) => {
    const currentHash = window.location.hash;
    if (currentHash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    
    setEditDialogOpen(false);
    setEditingId(null);
    
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPos);
      setTimeout(() => {
        window.scrollTo(0, scrollPos);
        if (currentHash) {
          history.replaceState(null, '', window.location.pathname + window.location.search + currentHash);
        }
      }, 0);
      setTimeout(() => window.scrollTo(0, scrollPos), 50);
      setTimeout(() => window.scrollTo(0, scrollPos), 100);
    });
  };

  const handleSave = async (data: {
    title: string;
    content: string;
    colorPreset: ColorPreset;
    hideFromSidebar?: boolean;
  }) => {
    if (editingId) {
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      updateBlock(editingId, data);
      restoreScrollPosition(scrollPos);
    }
  };

  const handleSaveTips = async (
    title: string,
    content: string,
    tipsType: TipsType,
    hideFromSidebar: boolean
  ) => {
    if (editingId) {
      const scrollPos = window.pageYOffset;
      savedScrollPositionRef.current = scrollPos;
      
      const colorMap: Record<TipsType, ColorPreset> = {
        danger: 'red',
        warning: 'orange',
        success: 'green',
        information: 'blue',
      };

      updateBlock(editingId, {
        title,
        content,
        colorPreset: colorMap[tipsType],
        hideFromSidebar,
        hideTitle: true,
        tipsType,
        contentType: 'tips',
      });

      restoreScrollPosition(scrollPos);
    }
  };

  const handleMoveToCategory = (sectionId: string, newCategoryId: string) => {
    const newCategorySections = blocks
      .filter(b => b.type === 'section' && b.parentId === newCategoryId)
      .sort((a, b) => a.order - b.order);
    
    const newOrder = newCategorySections.length > 0 
      ? newCategorySections[0].order - 1 
      : 0;
    
    updateBlock(sectionId, { parentId: newCategoryId, order: newOrder });
  };

  const calculateNewOrder = (afterSectionId?: string): number => {
    if (afterSectionId) {
      const afterSection = sections.find(s => s.id === afterSectionId);
      const afterIndex = sections.findIndex(s => s.id === afterSectionId);
      
      if (afterIndex === sections.length - 1) {
        return afterSection!.order + 1;
      } else {
        const nextSection = sections[afterIndex + 1];
        return Math.floor((afterSection!.order + nextSection.order) / 2);
      }
    }
    return sections.length > 0 ? sections[0].order - 1 : 0;
  };

  const handleAddSection = async (afterSectionId?: string) => {
    if (!category) return;
    
    const newOrder = calculateNewOrder(afterSectionId);
    
    const newBlockId = await addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '<p>Contenu de la section...</p>',
      colorPreset: 'purple',
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: [],
      contentType: 'section',
      order: newOrder,
    });
    
    if (newBlockId) {
      setTimeout(() => {
        setEditingId(newBlockId);
        setEditDialogOpen(true);
      }, 100);
    }
  };

  const handleAddTips = async (afterSectionId?: string) => {
    if (!category) return;
    
    const newOrder = calculateNewOrder(afterSectionId);
    
    const newBlockId = await addBlock({
      type: 'section',
      title: 'ℹ️ Information',
      content: '<p>Contenu du TIPS...</p>',
      colorPreset: 'blue',
      parentId: category.id,
      slug: `${category.slug}-tips-${Date.now()}`,
      attachments: [],
      contentType: 'tips',
      tipsType: 'information',
      hideFromSidebar: true,
      hideTitle: true,
      order: newOrder,
    });
    
    if (newBlockId) {
      setTimeout(() => {
        setEditingId(newBlockId);
        setEditDialogOpen(true);
      }, 100);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      const minOrder = Math.min(...sections.map(s => s.order));
      const sectionsWithNewOrder = reorderedSections.map((section, index) => ({
        ...section,
        order: minOrder + index
      }));
      
      await reorderBlocks(sectionsWithNewOrder);
    }
  };

  const handleDeleteClick = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteBlock(sectionToDelete);
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicate = async (sectionId: string) => {
    const sectionToDuplicate = sections.find(s => s.id === sectionId);
    if (!sectionToDuplicate) return;

    const currentIndex = sections.findIndex(s => s.id === sectionId);
    const nextSection = sections[currentIndex + 1];
    const newOrder = nextSection 
      ? (sectionToDuplicate.order + nextSection.order) / 2
      : sectionToDuplicate.order + 1;

    const newBlockId = await addBlock({
      type: 'section',
      title: `${sectionToDuplicate.title} (copie)`,
      content: sectionToDuplicate.content,
      colorPreset: sectionToDuplicate.colorPreset,
      parentId: category.id,
      slug: `${category.slug}-section-${Date.now()}`,
      attachments: sectionToDuplicate.attachments || [],
      hideFromSidebar: sectionToDuplicate.hideFromSidebar,
      order: newOrder,
    });

    if (newBlockId) {
      setTimeout(async () => {
        await updateBlock(newBlockId, { order: newOrder });
        toast({ 
          title: 'Section dupliquée', 
          description: 'La section a été dupliquée avec succès' 
        });
      }, 50);
    }
  };

  const editingSection = sections.find(s => s.id === editingId);
  const filteredSections = sections.filter(section => {
    if (section.contentType === 'tips' && !showTips) return false;
    if (section.contentType !== 'tips' && !showSections) return false;
    return true;
  });

  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">{category.title}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {hasTips && (
              <Button
                variant={showTips ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTips(!showTips)}
                className="gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                TIPS
              </Button>
            )}
            {hasSections && (
              <Button
                variant={showSections ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSections(!showSections)}
                className="gap-2"
              >
                Sections
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.id))}
              className="gap-2"
            >
              {openAccordions.length > 0 ? (
                <><ChevronsDownUp className="h-4 w-4" /> Tout fermer</>
              ) : (
                <><ChevronsUpDown className="h-4 w-4" /> Tout ouvrir</>
              )}
            </Button>
            {isEditMode && isAdmin && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleAddSection()} className="gap-2">
                  <Plus className="h-4 w-4" /> Section
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleAddTips()} className="gap-2">
                  <Lightbulb className="h-4 w-4" /> TIPS
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <Accordion
            type="multiple"
            value={openAccordions}
            onValueChange={setOpenAccordions}
            className="space-y-4"
          >
            {filteredSections.map((section) => (
              <CategorySortableItem
                key={section.id}
                section={section}
                category={category}
                isEditMode={isEditMode}
                isAdmin={isAdmin}
                availableCategories={availableCategories}
                editingId={editingId}
                scope="helpconfort"
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDuplicate={handleDuplicate}
                onMoveToCategory={handleMoveToCategory}
                onAddSection={handleAddSection}
                onAddTips={handleAddTips}
              />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Documents */}
      <DocumentsList blockId={category.id} scope="helpconfort" />

      {/* Delete Dialog */}
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditDialogOpen(false);
          setEditingId(null);
        }
      }}>
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
                initialTipsType={editingSection.tipsType || 'information'}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                onSave={handleSaveTips}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditingId(null);
                }}
              />
            ) : (
              <SectionEditForm
                sectionId={editingSection.id}
                initialTitle={editingSection.title}
                initialContent={editingSection.content}
                initialColor={editingSection.colorPreset}
                initialHideFromSidebar={editingSection.hideFromSidebar || false}
                initialSummary={editingSection.summary || ''}
                initialShowSummary={editingSection.showSummary || false}
                initialHideTitle={editingSection.hideTitle || false}
                onSave={handleSave}
                onCancel={() => {
                  setEditDialogOpen(false);
                  setEditingId(null);
                }}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
