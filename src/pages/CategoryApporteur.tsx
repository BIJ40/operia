import { useParams, Navigate, Link } from 'react-router-dom';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsDownUp, ChevronsUpDown, Lightbulb, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { DocumentsList } from '@/components/DocumentsList';
import { Accordion } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMemo } from 'react';
import { SectionEditForm } from '@/components/SectionEditForm';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCategoryLogic } from '@/hooks/use-category-logic';
import { ApporteurSortableItem } from '@/components/category/ApporteurSortableItem';
import { CategoryBlock } from '@/components/category/types';

export default function CategoryApporteur() {
  const { slug, subslug } = useParams<{ slug: string; subslug: string }>();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useApporteurEditor();
  const { isAuthenticated } = useAuthCore();
  const { hasAccessToScope } = usePermissions();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!hasAccessToScope('apporteurs')) {
    return <Navigate to="/" replace />;
  }
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  const subcategory = blocks.find(b => b.type === 'subcategory' && b.slug === subslug) as CategoryBlock | undefined;
  
  if (!category || !subcategory) {
    return <div className="container max-w-4xl mx-auto p-8">Page non trouvée</div>;
  }
  
  const availableSubcategories = useMemo(() =>
    blocks
      .filter(b => b.type === 'subcategory' && b.parentId === category.id)
      .sort((a, b) => a.order - b.order),
    [blocks, category.id]
  );

  // Navigation between subcategories
  const currentSubcategoryIndex = useMemo(() => 
    availableSubcategories.findIndex(c => c.slug === subslug),
    [availableSubcategories, subslug]
  );
  
  const prevSubcategory = currentSubcategoryIndex > 0 ? availableSubcategories[currentSubcategoryIndex - 1] : null;
  const nextSubcategory = currentSubcategoryIndex < availableSubcategories.length - 1 ? availableSubcategories[currentSubcategoryIndex + 1] : null;

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
    handleMoveToCategory,
    handleDragEnd,
    handleDeleteClick,
    confirmDelete,
    closeEditDialog,
  } = useCategoryLogic({
    blocks,
    categoryId: subcategory?.id,
    isEditMode,
    updateBlock,
    deleteBlock,
    addBlock,
    reorderBlocks,
    slugDependency: `${slug}-${subslug}`,
  });

  const handleAddSection = async () => {
    await addBlock({
      type: 'section',
      title: 'Nouvelle section',
      content: '',
      colorPreset: subcategory.colorPreset || 'blue',
      slug: `section-${Date.now()}`,
      parentId: subcategory.id,
      attachments: [],
      isSingleSection: false,
      order: sections.length,
    });
  };

  const handleMoveToSubcategory = async (sectionId: string, newSubcategoryId: string) => {
    handleMoveToCategory(sectionId, newSubcategoryId);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left zone: Retour + left arrow */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/apporteurs/${slug}`}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={prevSubcategory ? `/apporteurs/${slug}/${prevSubcategory.slug}` : '#'}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={!prevSubcategory}
                        aria-label="Section précédente"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </Link>
                  </span>
                </TooltipTrigger>
                {prevSubcategory && (
                  <TooltipContent side="bottom">
                    {prevSubcategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Center zone: Title (truncates if too long) */}
          <h1 className="text-2xl font-bold text-foreground truncate flex-1 min-w-0">{subcategory.title}</h1>
          
          {/* Right zone: Progress bar + indicator + right arrow (FIXED to right) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                key={currentSubcategoryIndex}
                className="h-full bg-primary transition-all duration-300 origin-left animate-pulse-progress"
                style={{ width: `${((currentSubcategoryIndex + 1) / availableSubcategories.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {currentSubcategoryIndex + 1}/{availableSubcategories.length}
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={nextSubcategory ? `/apporteurs/${slug}/${nextSubcategory.slug}` : '#'}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={!nextSubcategory}
                        aria-label="Section suivante"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </span>
                </TooltipTrigger>
                {nextSubcategory && (
                  <TooltipContent side="bottom">
                    {nextSubcategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 flex-wrap">
            {hasTips && (
              <Button
                variant={showTips ? "default" : "outline"}
                size="sm"
                onClick={() => setShowTips(!showTips)}
                className="gap-1 sm:gap-2"
              >
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">TIPS</span>
              </Button>
            )}
            {hasSections && (
              <Button
                variant={showSections ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSections(!showSections)}
                className="gap-1 sm:gap-2"
              >
                <span className="hidden sm:inline">Sections</span>
                <span className="sm:hidden">Sec.</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.slug))}
              className="gap-1 sm:gap-2"
            >
              {openAccordions.length > 0 ? (
                <><ChevronsDownUp className="h-4 w-4" /><span className="hidden sm:inline">Tout fermer</span></>
              ) : (
                <><ChevronsUpDown className="h-4 w-4" /><span className="hidden sm:inline">Tout ouvrir</span></>
              )}
            </Button>
            {isEditMode && (
              <Button variant="outline" size="sm" onClick={handleAddSection} className="gap-1 sm:gap-2">
                <Plus className="h-4 w-4" /><span className="hidden sm:inline">Section</span>
              </Button>
            )}
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
              <ApporteurSortableItem
                key={section.id}
                section={section}
                subcategory={subcategory}
                availableSubcategories={availableSubcategories}
                isEditMode={isEditMode}
                editingId={editingId}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onMoveToSubcategory={handleMoveToSubcategory}
              />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {/* Documents */}
      <DocumentsList blockId={subcategory.id} scope="apporteur" />

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
            <DialogTitle>Modifier la section</DialogTitle>
          </DialogHeader>
          {editingSection && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
