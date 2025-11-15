// Page dédiée au Guide Apogée (anciennement Home)
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(category.colorPreset)}`}
    >
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
        </div>
      )}
      
      {editingId === category.id ? (
        <div className="space-y-3">
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
        <>
          <Link to={`/apogee/category/${category.slug}`} className="block">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-background/50 rounded-lg flex items-center justify-center">
                {editImageUrl || (isCustomImage && category.icon) ? (
                  <img 
                    src={editImageUrl || category.icon} 
                    alt={category.title} 
                    className="w-[30px] h-[30px] object-contain" 
                  />
                ) : (
                  <Icon className="w-[30px] h-[30px] text-primary" />
                )}
              </div>
              {(category.showTitleOnCard !== false) && (
                <h3 className="text-xl font-semibold text-foreground flex-1">
                  {category.title}
                </h3>
              )}
            </div>
          </Link>

          {isEditMode && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => onEdit(category.id)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Modifier
              </Button>
              <Button
                onClick={() => onDelete(category.id)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function ApogeeGuide() {
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

  // Filtrer uniquement les catégories Apogée (exclure FAQ)
  const apogeeCategories = blocks
    .filter(b => b.type === 'category' && b.slug !== 'faq' && !b.title.toLowerCase().includes('faq'))
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

  // Les dates de création/mise à jour ne sont plus nécessaires pour cette page

  const getColorClass = (color?: ColorPreset) => {
    const colors = {
      red: 'bg-red-50 border-red-200 hover:border-red-300',
      blanc: 'bg-white border-gray-300 hover:border-gray-400',
      blue: 'bg-blue-50 border-blue-200 hover:border-blue-300',
      green: 'bg-green-50 border-green-200 hover:border-green-300',
      yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
      purple: 'bg-purple-50 border-purple-200 hover:border-purple-300',
      orange: 'bg-orange-50 border-orange-200 hover:border-orange-300',
    };
    return colors[color || 'blue'] || colors.blue;
  };

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
      setEditColor(category.colorPreset || 'blue');
      
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
        colorPreset: editColor,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map(category => {
              const Icon = IconComponent(category.icon || 'BookOpen');
              return (
                <Link
                  key={category.id}
                  to={`/apogee/category/${category.slug}`}
                  className={`group relative border-2 rounded-lg p-6 hover:shadow-xl transition-all ${getColorClass(category.colorPreset)}`}
                >
                  <Icon className="w-12 h-12 mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-xl font-bold text-foreground">{category.title}</h2>
                </Link>
              );
            })}
          </div>
        )}

        {isEditMode && isAdmin && (
          <div className="flex justify-end mt-8">
            <Button onClick={handleAddCategory} size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
              <Plus className="w-4 h-4" />
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
