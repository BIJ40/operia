// Page dédiée à la Base de connaissance HelpConfort
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical } from 'lucide-react';
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
  isEditMode: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onEditImageUrlChange: (value: string | null) => void;
  onEditShowTitleOnCardChange: (value: boolean) => void;
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
  editImageUrl,
  editShowTitleOnCard,
  isEditMode,
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
  onEditImageUrlChange,
  onEditShowTitleOnCardChange,
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
        <Link to={`/helpconfort/category/${category.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
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
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock } = useEditor();
  const { isAdmin } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer uniquement les catégories HelpConfort (à créer)
  // Pour l'instant vide, les catégories seront créées plus tard
  const helpconfortCategories = blocks
    .filter(b => b.type === 'category' && b.slug.startsWith('helpconfort-'))
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
    const category = helpconfortCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      setEditColor(category.colorPreset || 'blue');
      
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
        colorPreset: editColor,
        slug: `helpconfort-${editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Base de connaissance HelpConfort
          </h1>
          <p className="text-lg text-muted-foreground">
            Documentation et ressources sur HelpConfort
          </p>
        </div>

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
                    editImageUrl={editImageUrl}
                    editShowTitleOnCard={editShowTitleOnCard}
                    isEditMode={isEditMode}
                    onEditTitleChange={setEditTitle}
                    onEditIconChange={setEditIcon}
                    onEditColorChange={setEditColor}
                    onEditImageUrlChange={setEditImageUrl}
                    onEditShowTitleOnCardChange={setEditShowTitleOnCard}
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
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
              return (
                <Link
                  key={category.id}
                  to={`/helpconfort/category/${category.slug}`}
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
            <Link to="/admin/helpconfort-backup">
              <Button variant="outline" size="lg" className="gap-2">
                <Icons.Database className="w-5 h-5" />
                Sauvegardes HelpConfort
              </Button>
            </Link>
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
