import { useParams, Navigate, Link } from 'react-router-dom';
import { useOperiaEditor, OperiaBlock } from '@/contexts/HcServicesEditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissionsBridge } from '@/hooks/usePermissionsBridge';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsDownUp, ChevronsUpDown, Lightbulb, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Accordion } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { HcServicesSection } from '@/components/hc-services-guide/HcServicesSection';
import { HcServicesEditDialog } from '@/components/hc-services-guide/HcServicesEditDialog';
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

export default function CategoryOperia() {
  const { slug } = useParams();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reloadBlocks, loading } = useOperiaEditor();
  const { isAuthenticated } = useAuthCore();
  const { hasGlobalRole, hasModuleOption } = usePermissionsBridge();
  
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('support.guides', 'edition');
  const getEditUrl = (url: string) => isEditMode ? `${url}?edit=true` : url;

  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const category = blocks.find(b => b.type === 'category' && b.slug === slug);
  
  const availableCategories = useMemo(() =>
    blocks.filter(b => b.type === 'category').sort((a, b) => a.order - b.order),
    [blocks]
  );

  const currentCategoryIndex = useMemo(() => 
    availableCategories.findIndex(c => c.slug === slug),
    [availableCategories, slug]
  );
  
  const prevCategory = currentCategoryIndex > 0 ? availableCategories[currentCategoryIndex - 1] : null;
  const nextCategory = currentCategoryIndex < availableCategories.length - 1 ? availableCategories[currentCategoryIndex + 1] : null;

  if (!category) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Catégorie introuvable</p>
      </div>
    );
  }

  const sections = blocks
    .filter(b => b.type === 'section' && b.parentId === category.id)
    .sort((a, b) => a.order - b.order);

  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  const filteredSections = sections.filter(s => {
    if (s.contentType === 'tips') return showTips;
    return showSections;
  });

  const editingSection = editingId ? sections.find(s => s.id === editingId) : null;

  const handleEdit = (id: string) => {
    setEditingId(id);
  };

  const handleSave = (updates: Partial<OperiaBlock>) => {
    if (editingId) {
      updateBlock(editingId, updates);
      setEditingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setSectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (sectionToDelete) {
      deleteBlock(sectionToDelete);
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const calculateNewOrder = (afterSectionId?: string) => {
    if (!afterSectionId) {
      return sections.length > 0 ? Math.max(...sections.map(s => s.order)) + 1 : 0;
    }
    const afterSection = sections.find(s => s.id === afterSectionId);
    if (!afterSection) return sections.length;
    return afterSection.order + 0.5;
  };

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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      
      const newSections = [...sections];
      const [removed] = newSections.splice(oldIndex, 1);
      newSections.splice(newIndex, 0, removed);
      
      newSections.forEach((section, index) => {
        updateBlock(section.id, { order: index });
      });
    }
  };

  return (
    <div className="space-y-6 pb-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <Link to={getEditUrl(ROUTES.academy.hcServices)}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={prevCategory ? getEditUrl(ROUTES.academy.hcServicesCategory(prevCategory.slug)) : '#'}>
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
          </div>
          
          <h1 className="text-2xl font-bold text-foreground truncate flex-1 min-w-0">{category.title}</h1>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                key={currentCategoryIndex}
                className="h-full bg-primary transition-all duration-300 origin-left"
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
                    <Link to={nextCategory ? getEditUrl(ROUTES.academy.hcServicesCategory(nextCategory.slug)) : '#'}>
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
        
        <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reloadBlocks()}
            disabled={loading}
            className="gap-1 sm:gap-2"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Rafraîchir</span>
          </Button>
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
            onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.id))}
            className="gap-1 sm:gap-2"
          >
            {openAccordions.length > 0 ? (
              <><ChevronsDownUp className="h-4 w-4" /><span className="hidden sm:inline">Tout fermer</span></>
            ) : (
              <><ChevronsUpDown className="h-4 w-4" /><span className="hidden sm:inline">Tout ouvrir</span></>
            )}
          </Button>
          {isEditMode && canEdit && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleAddSection()} className="gap-1 sm:gap-2">
                <Plus className="h-4 w-4" /><span className="hidden sm:inline">Section</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddTips()} className="gap-1 sm:gap-2">
                <Lightbulb className="h-4 w-4" /><span className="hidden sm:inline">TIPS</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">
            {sections.length === 0 
              ? "Aucune section dans cette catégorie" 
              : "Utilisez les boutons TIPS / Sections pour afficher le contenu"}
          </p>
          {isEditMode && canEdit && sections.length === 0 && (
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => handleAddSection()} className="gap-2">
                <Plus className="h-4 w-4" />Ajouter une section
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddTips()} className="gap-2">
                <Lightbulb className="h-4 w-4" />Ajouter un TIPS
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
              className="space-y-4"
            >
              {filteredSections.map((section) => (
                <HcServicesSection
                  key={section.id}
                  section={section}
                  isEditMode={isEditMode}
                  canEdit={canEdit}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onAddSection={handleAddSection}
                  onAddTips={handleAddTips}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit Dialog */}
      <HcServicesEditDialog
        open={!!editingId}
        onOpenChange={(open) => !open && setEditingId(null)}
        section={editingSection}
        onSave={handleSave}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
