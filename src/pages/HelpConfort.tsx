// Page dédiée à la Base de connaissance HelpConfort
import { useEditor } from '@/contexts/EditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical, Clock, Sparkles, RefreshCw, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { IconPicker } from '@/components/IconPicker';
import { ColorPicker } from '@/components/ColorPicker';
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

// Composant pour les catégories triables
interface SortableCategoryProps {
  category: any;
  editingId: string | null;
  editTitle: string;
  editIcon: string;
  editColor: ColorPreset;
  editImageUrl: string | null;
  editShowTitleOnCard: boolean;
  editIsEmpty: boolean;
  isEditMode: boolean;
  hasInProgress: boolean;
  hasNew: boolean;
  hasUpdate: boolean;
  isEmpty: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onEditImageUrlChange: (value: string | null) => void;
  onEditShowTitleOnCardChange: (value: boolean) => void;
  onEditIsEmptyChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getColorClass: (color?: ColorPreset, isEmpty?: boolean) => string;
  IconComponent: (iconName: string) => any;
}

const SortableCategory = ({
  category,
  editingId,
  editTitle,
  editIcon,
  editColor,
  editImageUrl,
  editShowTitleOnCard,
  editIsEmpty,
  isEditMode,
  hasInProgress,
  hasNew,
  hasUpdate,
  isEmpty,
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
  onEditImageUrlChange,
  onEditShowTitleOnCardChange,
  onEditIsEmptyChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  getColorClass,
  IconComponent,
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

  const Icon = IconComponent(category.icon || 'BookOpen');
  const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 overflow-visible ${getColorClass(category.colorPreset, isEmpty)}`}
    >
      {/* Badge Vide */}
      {isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
            <Ban className="w-3 h-3" />
            Vide
          </div>
        </div>
      )}
      {/* Badge New en écharpe diagonale verte - décalé aux 3/4 */}
      {hasNew && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
          <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
            NEW
          </div>
        </div>
      )}
      {/* Badge En cours - arrondi accentué bleu */}
      {hasInProgress && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-helpconfort-blue text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
            <Clock className="w-3 h-3" />
            En cours
          </div>
        </div>
      )}
      {/* Badge M.A.J - panneau avec pied */}
      {hasUpdate && !hasInProgress && !hasNew && !isEmpty && !isEditMode && (
        <div className="absolute -top-3 -right-1 z-20 flex flex-col items-center">
          <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md border border-primary-foreground/20">
            <RefreshCw className="w-2.5 h-2.5" />
            M.A.J
          </div>
          <div className="w-0.5 h-2 bg-primary/80 rounded-b" />
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
              >
                <Icons.Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onDelete(category.id)}
                size="icon"
                variant="destructive"
                className="h-7 w-7 shadow-md"
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
          
          <ColorPicker
            value={editColor}
            onChange={onEditColorChange}
          />
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-title-on-card"
              checked={editShowTitleOnCard}
              onCheckedChange={onEditShowTitleOnCardChange}
            />
            <label htmlFor="show-title-on-card" className="text-sm font-medium cursor-pointer">
              Afficher le titre sur la carte
            </label>
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="mark-empty-hc"
              checked={editIsEmpty}
              onCheckedChange={onEditIsEmptyChange}
            />
            <label htmlFor="mark-empty-hc" className="text-sm font-medium cursor-pointer text-muted-foreground">
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
        <Link to={`${ROUTES.academy.documentsCategory(category.slug)}${isEditMode ? '?edit=true' : ''}`} className="flex items-center gap-3 flex-1 min-w-0">
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

export default function HelpConfort() {
  const { blocks, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isEditMode } = useEditor();
  const { isAdmin, isAuthenticated, roleAgence, hasAccessToScope } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editIsEmpty, setEditIsEmpty] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  // Vérifier les permissions pour accéder à cette page
  if (!hasAccessToScope('helpconfort')) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const helpconfortCategories = (blocks as any[])
    .filter(b => b.type === 'category' && b.slug.startsWith('helpconfort-') && !b.hideFromSidebar)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getColorClass = (color?: ColorPreset, isEmpty?: boolean) => {
    // Style unifié aux couleurs du site - grisé si vide
    if (isEmpty) {
      return "bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60";
    }
    return "bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border-helpconfort-blue/20 border-l-helpconfort-blue hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg";
  };

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  // Calculate category status (hasInProgress, hasNew, hasUpdate, isEmpty)
  const getCategoryStatus = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: any) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      const hasInProgress = sections.some(s => s.isInProgress);
      const hasNew = sections.some(s => {
        if (!s.completedAt) return false;
        return new Date(s.completedAt) > sevenDaysAgo;
      });
      const hasUpdate = sections.some(s => {
        if (!s.contentUpdatedAt) return false;
        return new Date(s.contentUpdatedAt) > sevenDaysAgo;
      });
      // isEmpty: si la catégorie est marquée vide OU si toutes ses sections sont vides
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { hasInProgress, hasNew, hasUpdate, isEmpty };
    };
  }, [blocks]);

  const handleEdit = (id: string) => {
    const category = helpconfortCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      setEditColor(category.colorPreset || 'blue');
      
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
        colorPreset: editColor,
        slug: `helpconfort-${editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
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
      slug: `helpconfort-categorie-${Date.now()}`,
      parentId: null,
      attachments: [],
      order: helpconfortCategories.length,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = helpconfortCategories.findIndex(c => c.id === active.id);
      const newIndex = helpconfortCategories.findIndex(c => c.id === over.id);
      
      const reorderedCategories = arrayMove(helpconfortCategories, oldIndex, newIndex);
      
      reorderedCategories.forEach((category, index) => {
        updateBlock(category.id, { order: index });
      });
    }
  };

  const filteredCategories = searchTerm 
    ? helpconfortCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : helpconfortCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <PageHeader
          title="Base de connaissance HelpConfort"
          subtitle="Documentation et ressources sur HelpConfort"
        />

        {!isEditMode && helpconfortCategories.length > 0 && (
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

        {helpconfortCategories.length === 0 && !isEditMode ? (
          <div className="text-center py-12">
            <Icons.Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-2">
              La base de connaissance est en cours de création
            </p>
            <p className="text-sm text-muted-foreground">
              Les catégories et contenus seront bientôt disponibles
            </p>
          </div>
        ) : isEditMode && isAdmin ? (
          <>
            {helpconfortCategories.length === 0 && (
              <div className="text-center py-12 mb-8">
                <Icons.Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-2">
                  Aucune catégorie pour le moment
                </p>
                <p className="text-sm text-muted-foreground">
                  Utilisez le bouton ci-dessous pour créer votre première catégorie
                </p>
              </div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredCategories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {filteredCategories.map(category => {
                    const { hasInProgress, hasNew, hasUpdate, isEmpty } = getCategoryStatus(category.id, category);
                    return (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        editingId={editingId}
                        editTitle={editTitle}
                        editIcon={editIcon}
                        editColor={editColor}
                        editImageUrl={editImageUrl}
                        editShowTitleOnCard={editShowTitleOnCard}
                        editIsEmpty={editIsEmpty}
                        isEditMode={isEditMode}
                        hasInProgress={hasInProgress}
                        hasNew={hasNew}
                        hasUpdate={hasUpdate}
                        isEmpty={isEmpty}
                        onEditTitleChange={setEditTitle}
                        onEditIconChange={setEditIcon}
                        onEditColorChange={setEditColor}
                        onEditImageUrlChange={setEditImageUrl}
                        onEditShowTitleOnCardChange={setEditShowTitleOnCard}
                        onEditIsEmptyChange={setEditIsEmpty}
                        onSave={handleSave}
                        onCancel={handleCancel}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        getColorClass={getColorClass}
                        IconComponent={IconComponent}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
              const { hasInProgress, hasNew, hasUpdate, isEmpty } = getCategoryStatus(category.id, category);
              
              // Catégorie vide - non cliquable, grisée
              if (isEmpty) {
                return (
                  <div
                    key={category.id}
                    className="group relative border-2 border-l-4 rounded-full px-4 py-2 transition-all duration-300 flex items-center gap-3 overflow-visible bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60 cursor-default"
                  >
                    {/* Badge Vide */}
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
                        <Ban className="w-3 h-3" />
                        Vide
                      </div>
                    </div>
                    {isCustomImage ? (
                      <img 
                        src={category.icon} 
                        alt={category.title} 
                        className="w-6 h-6 object-contain flex-shrink-0 opacity-50" 
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                    )}
                    {(category.showTitleOnCard !== false) && (
                      <span className="text-base font-medium text-muted-foreground truncate">
                        {category.title}
                      </span>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={category.id}
                  to={ROUTES.academy.documentsCategory(category.slug)}
                  className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 overflow-visible ${getColorClass(category.colorPreset)}`}
                >
                  {/* Badge New en écharpe diagonale verte - décalé aux 3/4 */}
                  {hasNew && (
                    <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                      <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
                        NEW
                      </div>
                    </div>
                  )}
                  {/* Badge En cours - arrondi accentué orange */}
                  {hasInProgress && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En cours
                      </div>
                    </div>
                  )}
                  {/* Badge M.A.J - panneau avec pied */}
                  {hasUpdate && !hasInProgress && !hasNew && (
                    <div className="absolute -top-3 -right-1 z-20 flex flex-col items-center">
                      <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md border border-primary-foreground/20">
                        <RefreshCw className="w-2.5 h-2.5" />
                        M.A.J
                      </div>
                      <div className="w-0.5 h-2 bg-primary/80 rounded-b" />
                    </div>
                  )}
                  {isCustomImage ? (
                    <img 
                      src={category.icon} 
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
              );
            })}
          </div>
        ) : null}

        {isEditMode && isAdmin && (
          <div className="flex flex-col items-center gap-3 mt-8">
            <Button onClick={handleAddCategory} size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              Ajouter une catégorie
            </Button>
          </div>
        )}

      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Toutes les sections associées seront également supprimées.
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
    </div>
  );
}
