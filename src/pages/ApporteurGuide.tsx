// Page Guide Apporteurs (clone d'ApogeeGuide avec données séparées)
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical, Edit2, Lock, Library } from 'lucide-react';
import { useIsBlockLocked } from '@/hooks/use-permissions';
import { toast } from 'sonner';
import { IconPicker } from '@/components/IconPicker';
import { ColorPicker } from '@/components/ColorPicker';
import { ImageUploader } from '@/components/ImageUploader';
import { supabase } from '@/integrations/supabase/client';
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
  category: any;
  editingId: string | null;
  editTitle: string;
  editIcon: string;
  editColor: ColorPreset;
  editShowTitleOnCard: boolean;
  editShowTitleInMenu: boolean;
  isEditMode: boolean;
  isBlockLocked: (blockId: string, blocks: any[]) => boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onShowTitleOnCardChange: (value: boolean) => void;
  onShowTitleInMenuChange: (value: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getColorClass: (color?: ColorPreset) => string;
  IconComponent: (iconName: string) => any;
}

const SortableCategory = ({
  category,
  editingId,
  editTitle,
  editIcon,
  editColor,
  editShowTitleOnCard,
  editShowTitleInMenu,
  isEditMode,
  isBlockLocked,
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
  onShowTitleOnCardChange,
  onShowTitleInMenuChange,
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
  const isCustomImage = category.icon?.startsWith('http');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 ${getColorClass(category.colorPreset)}`}
    >
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
                <Edit2 className="w-3 h-3" />
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
            currentImage={editIcon.startsWith('http') ? editIcon : undefined}
            onImageChange={(url) => onEditIconChange(url || 'BookOpen')}
            bucketName="category-images"
          />
          
          <IconPicker
            value={editIcon.startsWith('http') ? 'BookOpen' : editIcon}
            onChange={onEditIconChange}
          />
          
          <ColorPicker
            value={editColor}
            onChange={onEditColorChange}
          />
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-title-on-card"
              checked={editShowTitleOnCard}
              onChange={(e) => onShowTitleOnCardChange(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="show-title-on-card" className="text-sm font-medium cursor-pointer">
              Afficher le titre sur la carte
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-title-in-menu"
              checked={editShowTitleInMenu}
              onChange={(e) => onShowTitleInMenuChange(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="show-title-in-menu" className="text-sm font-medium cursor-pointer">
              Afficher le titre dans le menu
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
      ) : isBlockLocked(category.id, [category]) ? (
        <div 
          onClick={() => {
            toast.error("Accès restreint - Vous n'avez pas les permissions pour accéder à cette section");
          }}
          className="flex items-center gap-3 flex-1 min-w-0 opacity-60 cursor-pointer relative"
        >
          {isCustomImage ? (
            <img 
              src={category.icon} 
              alt={category.title} 
              className="w-6 h-6 object-contain flex-shrink-0 opacity-50" 
            />
          ) : (
            <Icon className="w-6 h-6 text-primary flex-shrink-0 opacity-50" />
          )}
          {(category.showTitleOnCard !== false && category.showTitleInMenu !== false) && (
            <span className="text-base font-medium text-foreground truncate">
              {category.title}
            </span>
          )}
          <Lock className="w-4 h-4 text-destructive drop-shadow-lg ml-auto" />
        </div>
      ) : (
        <Link to={`/apporteurs/category/${category.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
          {isCustomImage ? (
            <img 
              src={category.icon} 
              alt={category.title} 
              className="w-6 h-6 object-contain flex-shrink-0" 
            />
          ) : (
            <Icon className="w-6 h-6 text-primary flex-shrink-0" />
          )}
          {(category.showTitleOnCard !== false && category.showTitleInMenu !== false) && (
            <span className="text-base font-medium text-foreground truncate">
              {category.title}
            </span>
          )}
        </Link>
      )}
    </div>
  );
};

export default function ApporteurGuide() {
  const { blocks, isEditMode, addBlock, updateBlock, deleteBlock, reorderBlocks } = useApporteurEditor();
  const { isAdmin, isAuthenticated } = useAuth();
  const isBlockLocked = useIsBlockLocked();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editShowTitleInMenu, setEditShowTitleInMenu] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const apporteurCategories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
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

  const getColorClass = (color?: ColorPreset) => {
    const colors = {
      red: 'bg-red-50 border-l-red-500 hover:border-l-red-600',
      blanc: 'bg-white border-l-gray-400 hover:border-l-gray-500',
      white: 'bg-white border-l-gray-400 hover:border-l-gray-500',
      blue: 'bg-blue-50 border-l-blue-500 hover:border-l-blue-600',
      green: 'border-l-accent bg-gradient-to-r from-helpconfort-blue-light/20 to-helpconfort-blue-dark/20 hover:shadow-xl hover:border-l-accent/80',
      yellow: 'bg-yellow-50 border-l-yellow-500 hover:border-l-yellow-600',
      purple: 'bg-purple-50 border-l-purple-500 hover:border-l-purple-600',
      orange: 'bg-orange-50 border-l-orange-500 hover:border-l-orange-600',
      pink: 'bg-pink-50 border-l-pink-500 hover:border-l-pink-600',
      cyan: 'bg-cyan-50 border-l-cyan-500 hover:border-l-cyan-600',
      indigo: 'bg-indigo-50 border-l-indigo-500 hover:border-l-indigo-600',
      teal: 'bg-teal-50 border-l-teal-500 hover:border-l-teal-600',
      rose: 'bg-rose-50 border-l-rose-500 hover:border-l-rose-600',
      gray: 'bg-gray-50 border-l-gray-400 hover:border-l-gray-500',
    };
    return colors[color || 'blue'] || colors.blue;
  };

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const handleEdit = (id: string) => {
    const category = apporteurCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      setEditColor(category.colorPreset || 'blue');
      setEditShowTitleOnCard(category.showTitleOnCard !== false);
      setEditShowTitleInMenu(category.showTitleInMenu !== false);
    }
  };

  const handleImageUpload = async (file: File) => {
    // Cette fonction n'est plus utilisée, on utilise ImageUploader
  };

  const handleImageRemove = () => {
    // Cette fonction n'est plus utilisée, on utilise ImageUploader
  };

  const handleSave = async () => {
    if (editingId) {
      await updateBlock(editingId, {
        title: editTitle,
        icon: editIcon,
        colorPreset: editColor,
        showTitleOnCard: editShowTitleOnCard,
        showTitleInMenu: editShowTitleInMenu,
        slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (categoryToDelete) {
      await deleteBlock(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddCategory = async () => {
    await addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      icon: 'BookOpen',
      colorPreset: 'blue',
      slug: `categorie-${Date.now()}`,
      parentId: undefined,
      attachments: [],
      order: apporteurCategories.length,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = apporteurCategories.findIndex(c => c.id === active.id);
      const newIndex = apporteurCategories.findIndex(c => c.id === over.id);
      
      const reorderedCategories = arrayMove(apporteurCategories, oldIndex, newIndex);
      
      // Calculer les nouveaux ordres en préservant l'ordre minimum
      const minOrder = Math.min(...apporteurCategories.map(c => c.order));
      const categoriesWithNewOrder = reorderedCategories.map((category, index) => ({
        ...category,
        order: minOrder + index
      }));
      
      // Utiliser reorderBlocks pour sauvegarder
      await reorderBlocks(categoriesWithNewOrder);
    }
  };

  // Helper pour extraire le texte d'un contenu HTML
  const extractTextFromHtml = (html: string): string => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  const filteredCategories = searchTerm 
    ? apporteurCategories.filter(cat => {
        const searchLower = searchTerm.toLowerCase();
        
        // Recherche dans le titre de la catégorie
        const matchesTitle = cat.title.toLowerCase().includes(searchLower);
        
        // Recherche dans les sections
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => {
          // Recherche dans le titre de la section
          const matchesSectionTitle = s.title.toLowerCase().includes(searchLower);
          
          // Recherche dans le contenu de la section
          const sectionText = extractTextFromHtml(s.content).toLowerCase();
          const matchesSectionContent = sectionText.includes(searchLower);
          
          return matchesSectionTitle || matchesSectionContent;
        });
        
        return matchesTitle || matchesSection;
      })
    : apporteurCategories;


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Guide Apporteurs
            </h1>
            <p className="text-lg text-muted-foreground">
              Toutes les informations pour les apporteurs d'affaires
            </p>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              <Icons.ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          </Link>
        </div>

        {!isEditMode && apporteurCategories.length > 0 && (
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

        {apporteurCategories.length === 0 && !isEditMode ? (
          <div className="text-center py-12">
            <Icons.Library className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-2">
              Le guide apporteurs est en cours de création
            </p>
            <p className="text-sm text-muted-foreground">
              Les catégories et contenus seront bientôt disponibles
            </p>
          </div>
        ) : isEditMode && isAdmin ? (
          <>
            {apporteurCategories.length === 0 && (
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {filteredCategories.map(category => (
                    <SortableCategory
                      key={category.id}
                      category={category}
                      editingId={editingId}
                      editTitle={editTitle}
                      editIcon={editIcon}
                      editColor={editColor}
                      editShowTitleOnCard={editShowTitleOnCard}
                      editShowTitleInMenu={editShowTitleInMenu}
                      isEditMode={isEditMode}
                      isBlockLocked={isBlockLocked}
                      onEditTitleChange={setEditTitle}
                      onEditIconChange={setEditIcon}
                      onEditColorChange={setEditColor}
                      onShowTitleOnCardChange={setEditShowTitleOnCard}
                      onShowTitleInMenuChange={setEditShowTitleInMenu}
                      onSave={handleSave}
                      onCancel={handleCancel}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      getColorClass={getColorClass}
                      IconComponent={IconComponent}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              const isCustomImage = category.icon?.startsWith('http');
              const isLocked = isBlockLocked(category.id, [category]);
              
              if (isLocked) {
                return (
                  <div
                    key={category.id}
                    onClick={() => {
                      toast.error("Accès restreint - Vous n'avez pas les permissions pour accéder à cette section");
                    }}
                    className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 cursor-pointer opacity-60 ${getColorClass(category.colorPreset)}`}
                  >
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
                    {(category.showTitleOnCard !== false && category.showTitleInMenu !== false) && (
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
                  to={`/apporteurs/category/${category.slug}`}
                  className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 ${getColorClass(category.colorPreset)}`}
                >
                  {isCustomImage ? (
                    <img 
                      src={category.icon} 
                      alt={category.title} 
                      className="w-6 h-6 object-contain flex-shrink-0" 
                    />
                  ) : (
                    <Icon className="w-6 h-6 text-primary flex-shrink-0" />
                  )}
                  {(category.showTitleOnCard !== false && category.showTitleInMenu !== false) && (
                    <span className="text-base font-medium text-foreground truncate">
                      {category.title}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm 
                ? 'Aucune catégorie trouvée pour cette recherche'
                : 'Aucune catégorie disponible'}
            </p>
          </div>
        )}

        {isEditMode && isAdmin && (
          <div className="text-center mt-6">
            <Button onClick={handleAddCategory} size="lg" variant="outline" className="gap-2">
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
              Êtes-vous sûr de vouloir supprimer cette catégorie ? Cette action est irréversible et supprimera également toutes les sections associées.
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
