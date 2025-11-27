// Page dédiée au Guide Apogée (anciennement Home)
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Lock, Clock, Sparkles, RefreshCw, Ban } from 'lucide-react';
import { useIsBlockLocked } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Search, GripVertical } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { ImageUploader } from '@/components/ImageUploader';
import { Block } from '@/types/block';
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
  editImageUrl: string | null;
  editShowTitleOnCard: boolean;
  isEditMode: boolean;
  hasInProgress: boolean;
  hasNew: boolean;
  isEmpty: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditImageUrlChange: (value: string | null) => void;
  onEditShowTitleOnCardChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  IconComponent: (iconName: string) => any;
}

const SortableCategory = ({
  category,
  editingId,
  editTitle,
  editIcon,
  editImageUrl,
  editShowTitleOnCard,
  isEditMode,
  hasInProgress,
  hasNew,
  isEmpty,
  onEditTitleChange,
  onEditIconChange,
  onEditImageUrlChange,
  onEditShowTitleOnCardChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
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

  // Style unifié aux couleurs du site - grisé si vide
  const tileClass = isEmpty 
    ? "bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60"
    : "bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 border-helpconfort-orange/40 border-l-primary hover:border-helpconfort-orange/60 hover:border-l-accent hover:shadow-xl";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 overflow-visible ${tileClass}`}
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
      {/* Badge En cours - arrondi accentué orange */}
      {hasInProgress && !isEmpty && !isEditMode && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
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
        <Link to={`/apogee/category/${category.slug}${isEditMode ? '?edit=true' : ''}`} className="flex items-center gap-3 flex-1 min-w-0">
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

export default function ApogeeGuide() {
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, loading } = useEditor();
  const { isAdmin, isAuthenticated, hasAccessToScope } = useAuth();
  const isBlockLocked = useIsBlockLocked();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Vérifier les permissions pour accéder à cette page
  if (!hasAccessToScope('apogee')) {
    return <Navigate to="/" replace />;
  }

  // Filtrer uniquement les catégories Apogée (exclure FAQ et HelpConfort)
  const apogeeCategories = blocks
    .filter(b => b.type === 'category' && b.slug !== 'faq' && !b.title.toLowerCase().includes('faq') && !b.slug.startsWith('helpconfort-'))
    .sort((a, b) => a.order - b.order);

  // Helper function to calculate category badges based on sections
  const getCategoryBadges = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: Block) => {
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

  // Les dates de création/mise à jour ne sont plus nécessaires pour cette page

  // Style unifié aux couleurs du site
  const tileClass = "bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 border-helpconfort-orange/40 border-l-primary hover:border-helpconfort-orange/60 hover:border-l-accent hover:shadow-xl";

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const handleEdit = (id: string) => {
    const category = apogeeCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      
      // Vérifier si l'icône est une URL d'image
      const isImageUrl = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
      setEditImageUrl(isImageUrl ? category.icon : null);
      
      setEditShowTitleOnCard(category.showTitleOnCard !== false);
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, {
        title: editTitle,
        icon: editImageUrl || editIcon,
        slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        showTitleOnCard: editShowTitleOnCard,
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
      slug: `categorie-${Date.now()}`,
      parentId: null,
      attachments: [],
      order: apogeeCategories.length,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = apogeeCategories.findIndex(c => c.id === active.id);
      const newIndex = apogeeCategories.findIndex(c => c.id === over.id);
      
      const reorderedCategories = arrayMove(apogeeCategories, oldIndex, newIndex);
      
      reorderedCategories.forEach((category, index) => {
        updateBlock(category.id, { order: index });
      });
    }
  };

  const filteredCategories = searchTerm 
    ? apogeeCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : apogeeCategories;

  // Skeleton loader pendant le chargement
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
            {[...Array(12)].map((_, i) => (
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
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
          <Icons.ArrowLeft className="w-4 h-4" />
          <span>Retour accueil</span>
        </Link>
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Guide d'utilisation Apogée
          </h1>
          <p className="text-lg text-muted-foreground">
            Tout ce que vous devez savoir sur l'utilisation d'Apogée
          </p>
        </div>

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

        {isEditMode && isAdmin ? (
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
                      isEditMode={isEditMode}
                      hasInProgress={badges.hasInProgress}
                      hasNew={badges.hasNew}
                      isEmpty={badges.isEmpty}
                      onEditTitleChange={setEditTitle}
                      onEditIconChange={setEditIcon}
                      onEditImageUrlChange={setEditImageUrl}
                      onEditShowTitleOnCardChange={setEditShowTitleOnCard}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      IconComponent={IconComponent}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
              const isLocked = isBlockLocked(category.id, blocks);
              const badges = getCategoryBadges(category.id, category);
              
              // Catégorie vide - non cliquable, grisée
              if (badges.isEmpty) {
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
              
              if (isLocked) {
                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      toast({
                        title: 'Accès restreint',
                        description: 'Vous n\'avez pas les permissions pour accéder à cette section',
                        variant: 'destructive',
                      });
                    }}
                    className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 cursor-pointer opacity-60 overflow-visible ${tileClass}`}
                  >
                    {/* Badge New en écharpe diagonale verte - décalé aux 3/4 */}
                    {badges.hasNew && (
                      <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                        <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
                          NEW
                        </div>
                      </div>
                    )}
                    {/* Badge En cours - arrondi accentué orange */}
                    {badges.hasInProgress && (
                      <div className="absolute -top-2 -right-2 z-20">
                        <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          En cours
                        </div>
                      </div>
                    )}
                    {/* Badge M.A.J - panneau avec pied */}
                    {badges.hasUpdate && !badges.hasInProgress && (
                      <div className="absolute -top-3 -right-1 z-20 flex flex-col items-center">
                        <div className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-md border border-primary-foreground/20">
                          <RefreshCw className="w-2.5 h-2.5" />
                          M.A.J
                        </div>
                        <div className="w-0.5 h-2 bg-primary/80 rounded-b" />
                      </div>
                    )}
                    {/* Cadenas en overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Lock className="w-8 h-8 text-destructive drop-shadow-lg" />
                    </div>
                    
                    {isCustomImage ? (
                      <img 
                        src={category.icon} 
                        alt={category.title} 
                        className="w-6 h-6 object-contain flex-shrink-0 opacity-50" 
                      />
                    ) : (
                      <Icon className="w-6 h-6 text-primary flex-shrink-0 opacity-50" />
                    )}
                    {(category.showTitleOnCard !== false) && (
                      <span className="text-base font-medium text-foreground truncate">
                        {category.title}
                      </span>
                    )}
                  </div>
                );
              }
              
              return (
                <Link
                  key={category.id}
                  to={`/apogee/category/${category.slug}`}
                  className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 overflow-visible ${tileClass}`}
                >
                  {/* Badge New en écharpe diagonale verte - décalé aux 3/4 */}
                  {badges.hasNew && (
                    <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                      <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
                        NEW
                      </div>
                    </div>
                  )}
                  {/* Badge En cours - arrondi accentué orange */}
                  {badges.hasInProgress && (
                    <div className="absolute -top-2 -right-2 z-20">
                      <div className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En cours
                      </div>
                    </div>
                  )}
                  {/* Badge M.A.J - panneau avec pied - positionné à gauche du En cours */}
                  {badges.hasUpdate && !badges.hasInProgress && (
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
        )}

        {isEditMode && isAdmin && (
          <div className="flex justify-center mt-8">
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
