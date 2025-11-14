import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
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

interface Category {
  id: string;
  title: string;
  icon: string;
  color_preset: string;
  scope: string;
  display_order: number;
}

const SCOPE = 'informations-utiles';

export default function HelpConfort() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const supabaseAny = supabase as any;
    const { data } = await supabaseAny
      .from('categories')
      .select('*')
      .eq('scope', SCOPE)
      .order('display_order');
    
    if (data) setCategories(data);
  };

  const handleAddCategory = async () => {
    const maxOrder = categories.length > 0 
      ? Math.max(...categories.map(c => c.display_order)) + 1 
      : 0;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('categories')
      .insert({
        title: 'Nouvelle catégorie',
        icon: 'BookOpen',
        color_preset: 'blue',
        scope: SCOPE,
        display_order: maxOrder,
      });

    if (!error) loadCategories();
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditTitle(category.title);
    setEditIcon(category.icon);
    setEditColor(category.color_preset as ColorPreset);
  };

  const handleSave = async () => {
    if (!editingId) return;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('categories')
      .update({
        title: editTitle,
        icon: editIcon,
        color_preset: editColor,
      })
      .eq('id', editingId);

    if (!error) {
      setEditingId(null);
      loadCategories();
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDeleteClick = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    const supabaseAny = supabase as any;
    const { error } = await supabaseAny
      .from('categories')
      .delete()
      .eq('id', categoryToDelete);

    if (!error) {
      setCategoryToDelete(null);
      setDeleteDialogOpen(false);
      loadCategories();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);
      
      // Update display_order in database
      const supabaseAny = supabase as any;
      for (let i = 0; i < reordered.length; i++) {
        await supabaseAny
          .from('categories')
          .update({ display_order: i })
          .eq('id', reordered[i].id);
      }
    }
  };

  const getColorClass = (color?: ColorPreset) => {
    const colorMap = {
      red: 'bg-red-50 border-red-200 hover:border-red-300',
      blanc: 'bg-white border-gray-300 hover:border-gray-400',
      blue: 'bg-blue-50 border-blue-200 hover:border-blue-300',
      green: 'bg-green-50 border-green-200 hover:border-green-300',
      yellow: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
      purple: 'bg-purple-50 border-purple-200 hover:border-purple-300',
      orange: 'bg-orange-50 border-orange-200 hover:border-orange-300',
    };
    return colorMap[color || 'blue'];
  };

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Help Confort
          </h1>
          <p className="text-lg text-muted-foreground">
            Centre d'aide et ressources Help Confort Services
          </p>
        </div>
        {isAuthenticated && (
          <Button onClick={() => setIsEditMode(!isEditMode)} variant={isEditMode ? 'default' : 'outline'}>
            {isEditMode ? 'Terminer' : 'Modifier'}
          </Button>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                editingId={editingId}
                editTitle={editTitle}
                editIcon={editIcon}
                editColor={editColor}
                isEditMode={isEditMode}
                onEditTitleChange={setEditTitle}
                onEditIconChange={setEditIcon}
                onEditColorChange={setEditColor}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                getColorClass={getColorClass}
                IconComponent={IconComponent}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isEditMode && isAuthenticated && (
        <div className="mt-8">
          <Button onClick={handleAddCategory} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface SortableCategoryProps {
  category: Category;
  editingId: string | null;
  editTitle: string;
  editIcon: string;
  editColor: ColorPreset;
  isEditMode: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (category: Category) => void;
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
  isEditMode,
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
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

  const Icon = IconComponent(category.icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(category.color_preset as ColorPreset)}`}
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
            placeholder="Titre"
            autoFocus
          />
          <IconPicker value={editIcon} onChange={onEditIconChange} />
          <div className="flex gap-2 mt-4">
            <Button onClick={onSave} size="sm" className="flex-1">Sauvegarder</Button>
            <Button onClick={onCancel} size="sm" variant="outline" className="flex-1">Annuler</Button>
          </div>
        </div>
      ) : (
        <>
          <Link to={`/help-confort/category/${category.id}`} className="block">
            <div className="flex items-center gap-3 mb-3">
              <Icon className="w-8 h-8 text-primary" />
              <h3 className="text-xl font-semibold">{category.title}</h3>
            </div>
          </Link>
          {isEditMode && (
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => onEdit(category)}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                Éditer
              </Button>
              <Button
                onClick={() => onDelete(category.id)}
                size="sm"
                variant="destructive"
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
