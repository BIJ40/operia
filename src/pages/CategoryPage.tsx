import { useParams, Navigate, Link } from 'react-router-dom';
import { useEditor } from '@/contexts/EditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { ROUTES } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { Plus, ChevronsDownUp, ChevronsUpDown, Lightbulb, ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DocumentsList } from '@/components/DocumentsList';
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
import { CategorySortableItem, CategoryBlock, CategoryDialogs } from '@/components/category';
import { useCategoryLogic } from '@/hooks/use-category-logic';

type CategoryScope = 'apogee' | 'helpconfort';

interface CategoryConfig {
  scope: CategoryScope;
  slugPrefix: string;
  scopeCheck: string;
  backRoute: string;
  categoryRoute: (slug: string) => string;
  excludeFaq?: boolean;
  showRefresh?: boolean;
}

const CATEGORY_CONFIGS: Record<CategoryScope, CategoryConfig> = {
  apogee: {
    scope: 'apogee',
    slugPrefix: '',
    scopeCheck: 'apogee',
    backRoute: ROUTES.academy.apogee,
    categoryRoute: ROUTES.academy.apogeeCategory,
    excludeFaq: true,
    showRefresh: false,
  },
  helpconfort: {
    scope: 'helpconfort',
    slugPrefix: 'helpconfort-',
    scopeCheck: 'helpconfort',
    backRoute: ROUTES.academy.documents,
    categoryRoute: ROUTES.academy.documentsCategory,
    excludeFaq: false,
    showRefresh: false,
  },
};

interface CategoryPageProps {
  scope: CategoryScope;
}

export default function CategoryPage({ scope }: CategoryPageProps) {
  const { slug } = useParams();
  const config = CATEGORY_CONFIGS[scope];

  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks, reloadBlocks, loading } = useEditor();
  const { isAuthenticated, hasGlobalRole, hasModuleOption, hasAccessToScope } = useAuth();
  
  // V2: Vérification par rôle global + option module
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('guides', 'edition');
  
  const getEditUrl = (url: string) => isEditMode ? `${url}?edit=true` : url;
  
  // Redirect for FAQ (apogee only)
  if (scope === 'apogee' && slug === 'faq-globale') {
    return <Navigate to={ROUTES.academy.apogee} replace />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }
  
  if (!hasAccessToScope(config.scopeCheck)) {
    return <Navigate to={ROUTES.home} replace />;
  }
  
  const category = blocks.find(b => b.type === 'category' && b.slug === slug) as CategoryBlock | undefined;
  
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => {
        if (b.type !== 'category') return false;
        if (scope === 'apogee') {
          return !b.title.toLowerCase().includes('faq') && !b.slug.startsWith('helpconfort-');
        }
        return b.slug.startsWith(config.slugPrefix);
      })
      .sort((a, b) => a.order - b.order),
    [blocks, scope, config.slugPrefix]
  );

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
    <div className="space-y-6 pb-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left zone */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to={getEditUrl(config.backRoute)}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={prevCategory ? getEditUrl(config.categoryRoute(prevCategory.slug)) : '#'}>
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
          
          {/* Center zone */}
          <h1 className="text-2xl font-bold text-foreground truncate flex-1 min-w-0">{category.title}</h1>
          
          {/* Right zone */}
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
                    <Link to={nextCategory ? getEditUrl(config.categoryRoute(nextCategory.slug)) : '#'}>
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
          {config.showRefresh && (
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
          )}
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
                <CategorySortableItem
                  key={section.id}
                  section={section}
                  category={category}
                  isEditMode={isEditMode}
                  canEdit={canEdit}
                  availableCategories={availableCategories}
                  editingId={editingId}
                  scope={scope}
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
      )}

      {/* Documents */}
      <DocumentsList blockId={category.id} scope={scope} />

      <CategoryDialogs
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        confirmDelete={confirmDelete}
        editDialogOpen={editDialogOpen}
        closeEditDialog={closeEditDialog}
        editingSection={editingSection}
        handleSave={handleSave}
        handleSaveTips={handleSaveTips}
      />
    </div>
  );
}
