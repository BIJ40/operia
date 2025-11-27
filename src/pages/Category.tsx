import { useParams, Navigate, Link } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsDownUp, ChevronsUpDown, Lightbulb, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DocumentsList } from '@/components/DocumentsList';
import { SectionEditForm } from '@/components/SectionEditForm';
import { TipsEditForm } from '@/components/TipsEditForm';
import { Accordion } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMemo } from 'react';
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
import { CategorySortableItem, CategoryBlock } from '@/components/category';
import { useCategoryLogic } from '@/hooks/use-category-logic';

export default function Category() {
  const { slug } = useParams();

  if (slug === 'faq-globale') {
    return <Navigate to="/apogee" replace />;
  }

  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useEditor();
  const { isAuthenticated, isAdmin, hasAccessToScope } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!hasAccessToScope('apogee')) {
    return <Navigate to="/" replace />;
  }
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug) as CategoryBlock | undefined;
  
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  // Navigation between categories
  const currentCategoryIndex = useMemo(() => 
    availableCategories.findIndex(c => c.slug === slug),
    [availableCategories, slug]
  );
  
  const prevCategory = currentCategoryIndex > 0 ? availableCategories[currentCategoryIndex - 1] : null;
  const nextCategory = currentCategoryIndex < availableCategories.length - 1 ? availableCategories[currentCategoryIndex + 1] : null;

  const {
    sections,
    editingId,
    editDialogOpen,
    deleteDialogOpen,
    openAccordions,
    showTips,
    showSections,
    editingSection,
    filteredSections,
    hasTips,
    hasSections,
    sensors,
    setOpenAccordions,
    setShowTips,
    setShowSections,
    setDeleteDialogOpen,
    handleEdit,
    handleSave,
    handleSaveTips,
    handleMoveToCategory,
    calculateNewOrder,
    handleDragEnd,
    handleDeleteClick,
    confirmDelete,
    handleDuplicate,
    closeEditDialog,
  } = useCategoryLogic({
    blocks,
    categoryId: category?.id,
    isEditMode,
    updateBlock,
    deleteBlock,
    addBlock,
    reorderBlocks,
    slugDependency: slug,
  });

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const handleAddSection = async (afterSectionId?: string) => {
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
      setTimeout(() => handleEdit(newBlockId), 100);
    }
  };

  const handleAddTips = async (afterSectionId?: string) => {
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
      setTimeout(() => handleEdit(newBlockId), 100);
    }
  };

  const onDuplicate = (sectionId: string) => {
    handleDuplicate(sectionId, category.id, category.slug);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/apogee">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            
            {/* Category navigation with arrows */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0">
                      <Link to={prevCategory ? `/apogee/category/${prevCategory.slug}` : '#'}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          disabled={!prevCategory}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </Button>
                      </Link>
                    </span>
                  </TooltipTrigger>
                  {prevCategory && (
                    <TooltipContent side="bottom">
                      {prevCategory.title}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              
              <h1 className="text-2xl font-bold text-foreground truncate min-w-0">{category.title}</h1>
              
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    key={currentCategoryIndex}
                    className="h-full bg-primary transition-all duration-300 origin-left animate-pulse-progress"
                    style={{ width: `${((currentCategoryIndex + 1) / availableCategories.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
                  {currentCategoryIndex + 1}/{availableCategories.length}
                </span>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Link to={nextCategory ? `/apogee/category/${nextCategory.slug}` : '#'}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            disabled={!nextCategory}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </Link>
                      </span>
                    </TooltipTrigger>
                    {nextCategory && (
                      <TooltipContent side="bottom">
                        {nextCategory.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
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
                scope="apogee"
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDuplicate={onDuplicate}
                onMoveToCategory={handleMoveToCategory}
                onAddSection={handleAddSection}
                onAddTips={handleAddTips}
              />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Documents */}
      <DocumentsList blockId={category.id} scope="apogee" />

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
      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
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
                onCancel={closeEditDialog}
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
                onCancel={closeEditDialog}
              />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
