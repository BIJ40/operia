import { useOperiaEditor, OperiaBlock } from '@/contexts/HcServicesEditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import * as Icons from 'lucide-react';
import { Clock, Ban, Search, GripVertical, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPicker } from '@/components/IconPicker';
import { ImageUploader } from '@/components/ImageUploader';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

interface SortableCategoryProps {
  category: OperiaBlock;
  editingId: string | null;
  editTitle: string;
  editIcon: string;
  editImageUrl: string | null;
  editShowTitleOnCard: boolean;
  editIsEmpty: boolean;
  isEditMode: boolean;
  hasInProgress: boolean;
  hasNew: boolean;
  isEmpty: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditImageUrlChange: (value: string | null) => void;
  onEditShowTitleOnCardChange: (value: boolean) => void;
  onEditIsEmptyChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const SortableCategory = ({
  category,
  editingId,
  editTitle,
  editIcon,
  editImageUrl,
  editShowTitleOnCard,
  editIsEmpty,
  isEditMode,
  hasInProgress,
  hasNew,
  isEmpty,
  onEditTitleChange,
  onEditIconChange,
  onEditImageUrlChange,
  onEditShowTitleOnCardChange,
  onEditIsEmptyChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
}: SortableCategoryProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const iconName = category.icon || 'BookOpen';
  const Icon = (Icons as any)[iconName] || Icons.BookOpen;
  const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');

  const tileClass = isEmpty 
    ? "bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60"
    : "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 border-l-primary hover:from-primary/15 hover:via-primary/8 hover:border-primary/30 hover:shadow-lg";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 overflow-visible ${tileClass}`}
    >
      {isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
            <Ban className="w-3 h-3" />
            Vide
          </div>
        </div>
      )}
      {hasNew && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
          <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
            NEW
          </div>
        </div>
      )}
      {hasInProgress && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </div>
        </div>
      )}
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute -top-2 -left-2 cursor-grab active:cursor-grabbing z-10 bg-background rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary" />
          </div>
          {editingId !== category.id && (
            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                onClick={() => onEdit(category.id)}
                size="icon"
                variant="outline"
                className="h-7 w-7 bg-background shadow-md"
                aria-label="Modifier"
              >
                <Icons.Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onDelete(category.id)}
                size="icon"
                variant="destructive"
                className="h-7 w-7 shadow-md"
                aria-label="Supprimer"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
      )}
      
      {editingId === category.id ? (
        <div className="space-y-3 w-full">
          <Input
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            placeholder="Titre de la catégorie"
            autoFocus
          />
          
          <ImageUploader
            currentImage={editImageUrl || undefined}
            onImageChange={onEditImageUrlChange}
            bucketName="category-images"
          />
          
          <IconPicker
            value={editIcon}
            onChange={onEditIconChange}
          />
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-title-on-card"
              checked={editShowTitleOnCard}
              onCheckedChange={(checked) => onEditShowTitleOnCardChange(checked as boolean)}
            />
            <label htmlFor="show-title-on-card" className="text-sm font-medium cursor-pointer">
              Afficher le titre sur la carte
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="mark-empty"
              checked={editIsEmpty}
              onCheckedChange={(checked) => onEditIsEmptyChange(checked as boolean)}
            />
            <label htmlFor="mark-empty" className="text-sm font-medium cursor-pointer text-muted-foreground">
              Marquer comme vide (grise la catégorie)
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={onSave} size="sm">
              Enregistrer
            </Button>
            <Button onClick={onCancel} size="sm" variant="outline">
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Link to={`${ROUTES.academy.hcServicesCategory(category.slug)}${isEditMode ? '?edit=true' : ''}`} className="flex items-center gap-3 flex-1 min-w-0">
          {(isCustomImage && category.icon) || editImageUrl ? (
            <img 
              src={editImageUrl || category.icon} 
              alt={category.title} 
              className="w-6 h-6 object-contain flex-shrink-0" 
            />
          ) : (
            <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          )}
          {(category.showTitleOnCard !== false) && (
            <span className="text-base font-medium text-foreground truncate">
              {category.title}
            </span>
          )}
        </Link>
      )}
    </div>
  );
};

export default function OperiaGuide() {
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, loading } = useOperiaEditor();
  const { hasGlobalRole, isAuthenticated, hasModuleOption } = useAuth();
  
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('guides', 'edition');
  const canDelete = hasGlobalRole('platform_admin');
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editIsEmpty, setEditIsEmpty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const categories = blocks
    .filter(b => b.type === 'category')
    .sort((a, b) => a.order - b.order);

  const getCategoryBadges = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: OperiaBlock) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      const hasInProgress = sections.some(s => s.isInProgress);
      const hasNew = sections.some(s => {
        if (!s.completedAt) return false;
        return new Date(s.completedAt) > sevenDaysAgo;
      });
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { hasInProgress, hasNew, isEmpty };
    };
  }, [blocks]);

  const handleEdit = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      const isImageUrl = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
      setEditImageUrl(isImageUrl ? category.icon : null);
      setEditShowTitleOnCard(category.showTitleOnCard !== false);
      setEditIsEmpty(category.isEmpty || false);
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, {
        title: editTitle,
        icon: editImageUrl || editIcon,
        slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        showTitleOnCard: editShowTitleOnCard,
        isEmpty: editIsEmpty,
      });
      setEditingId(null);
      setEditImageUrl(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteBlock(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddCategory = () => {
    addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      icon: 'BookOpen',
      colorPreset: 'blue',
      slug: `operia-categorie-${Date.now()}`,
      parentId: null,
      attachments: [],
      order: categories.length,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
      
      reorderedCategories.forEach((category, index) => {
        updateBlock(category.id, { order: index });
      });
    }
  };

  const filteredCategories = searchTerm 
    ? categories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : categories;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="text-center mb-8">
            <div className="h-10 w-96 bg-muted animate-pulse rounded mx-auto mb-3" />
            <div className="h-6 w-64 bg-muted animate-pulse rounded mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Guide HC Services"
          subtitle="Apprenez à utiliser toutes les fonctionnalités de HC Services"
          backTo={ROUTES.academy.index}
          backLabel="Help! Academy"
        />
        
        {!isEditMode && (
          <div className="mb-6 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {isEditMode && canEdit ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredCategories.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {filteredCategories.map(category => {
                  const badges = getCategoryBadges(category.id, category);
                  return (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      editingId={editingId}
                      editTitle={editTitle}
                      editIcon={editIcon}
                      editImageUrl={editImageUrl}
                      editShowTitleOnCard={editShowTitleOnCard}
                      editIsEmpty={editIsEmpty}
                      isEditMode={isEditMode}
                      hasInProgress={badges.hasInProgress}
                      hasNew={badges.hasNew}
                      isEmpty={badges.isEmpty}
                      onEditTitleChange={setEditTitle}
                      onEditIconChange={setEditIcon}
                      onEditImageUrlChange={setEditImageUrl}
                      onEditShowTitleOnCardChange={setEditShowTitleOnCard}
                      onEditIsEmptyChange={setEditIsEmpty}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map(category => {
              const badges = getCategoryBadges(category.id, category);
              return (
                <SortableCategory
                  key={category.id}
                  category={category}
                  editingId={editingId}
                  editTitle={editTitle}
                  editIcon={editIcon}
                  editImageUrl={editImageUrl}
                  editShowTitleOnCard={editShowTitleOnCard}
                  editIsEmpty={editIsEmpty}
                  isEditMode={false}
                  hasInProgress={badges.hasInProgress}
                  hasNew={badges.hasNew}
                  isEmpty={badges.isEmpty}
                  onEditTitleChange={setEditTitle}
                  onEditIconChange={setEditIcon}
                  onEditImageUrlChange={setEditImageUrl}
                  onEditShowTitleOnCardChange={setEditShowTitleOnCard}
                  onEditIsEmptyChange={setEditIsEmpty}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}

        {isEditMode && canEdit && (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleAddCategory} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter une catégorie
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les sections de cette catégorie seront également supprimées.
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
