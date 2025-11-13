// Page identique à GuideApogee.tsx mais avec des catégories vides par défaut
import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  isEditMode: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
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

  const Icon = IconComponent(category.icon || 'BookOpen');

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
          <IconPicker
            value={editIcon}
            onChange={onEditIconChange}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'red', color: 'bg-red-50 border-2 border-red-200', label: 'Rouge' },
                { value: 'blanc', color: 'bg-white border-2 border-gray-300', label: 'Blanc' },
                { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
                { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
                { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
                { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
              ].map((colorOption) => (
                <button
                  key={colorOption.value}
                  onClick={() => onEditColorChange(colorOption.value as ColorPreset)}
                  className={`px-3 py-1.5 rounded text-sm ${colorOption.color} ${
                    editColor === colorOption.value ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {colorOption.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} size="sm">Enregistrer</Button>
            <Button onClick={onCancel} variant="outline" size="sm">Annuler</Button>
          </div>
        </div>
      ) : (
        <Link to={`/apporteurs-nationaux/category/${category.slug}`}>
          <div className="flex items-center space-x-4">
            {isEditMode && (
              <div className="flex gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit(category.id);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Modifier
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(category.id);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="p-3 bg-background rounded-lg">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-foreground">{category.title}</h3>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
};

export default function ApporteursNationaux() {
  const { isEditMode } = useEditor();
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const savedData = localStorage.getItem('apporteursNationauxData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setCategories(data.categories || []);
    } else {
      // Données par défaut pour les apporteurs nationaux (12 apporteurs)
      const defaultCategories = [
        { id: 'ap-1', type: 'category', title: 'VIAREN', icon: 'Building2', colorPreset: 'blue', order: 0, slug: 'viaren' },
        { id: 'ap-2', type: 'category', title: 'PRO MULT TRAVAUX', icon: 'Wrench', colorPreset: 'green', order: 1, slug: 'pro-mult-travaux' },
        { id: 'ap-3', type: 'category', title: 'DOMUS', icon: 'Home', colorPreset: 'orange', order: 2, slug: 'domus' },
        { id: 'ap-4', type: 'category', title: 'DYNAREN', icon: 'Zap', colorPreset: 'purple', order: 3, slug: 'dynaren' },
        { id: 'ap-5', type: 'category', title: 'HOMESERVE', icon: 'Shield', colorPreset: 'blue', order: 4, slug: 'homeserve' },
        { id: 'ap-6', type: 'category', title: 'AXA ASSISTANCE', icon: 'HeartHandshake', colorPreset: 'red', order: 5, slug: 'axa-assistance' },
        { id: 'ap-7', type: 'category', title: 'FMB', icon: 'Building', colorPreset: 'yellow', order: 6, slug: 'fmb' },
        { id: 'ap-8', type: 'category', title: 'IMH', icon: 'Landmark', colorPreset: 'green', order: 7, slug: 'imh' },
        { id: 'ap-9', type: 'category', title: 'AFEDIM', icon: 'Users', colorPreset: 'orange', order: 8, slug: 'afedim' },
        { id: 'ap-10', type: 'category', title: 'CREA MAINTENANCE', icon: 'Settings', colorPreset: 'purple', order: 9, slug: 'crea-maintenance' },
        { id: 'ap-11', type: 'category', title: 'FACILIANCE', icon: 'Star', colorPreset: 'blue', order: 10, slug: 'faciliance' },
        { id: 'ap-12', type: 'category', title: 'AUTRES', icon: 'MoreHorizontal', colorPreset: 'blanc', order: 11, slug: 'autres' },
      ];
      setCategories(defaultCategories);
      localStorage.setItem('apporteursNationauxData', JSON.stringify({ categories: defaultCategories }));
    }
  }, []);

  useEffect(() => {
    if (categories.length >= 0) {
      localStorage.setItem('apporteursNationauxData', JSON.stringify({ categories }));
    }
  }, [categories]);

  const handleAddCategory = () => {
    const newCategory = {
      id: `cat-${Date.now()}`,
      type: 'category',
      title: 'Nouvelle catégorie',
      icon: 'Folder',
      colorPreset: 'blue' as ColorPreset,
      order: categories.length,
      slug: `category-${Date.now()}`,
    };
    setCategories([...categories, newCategory]);
  };

  const handleEditCategory = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon);
      setEditColor(category.colorPreset);
    }
  };

  const handleSaveCategory = () => {
    if (editingId) {
      setCategories(categories.map(cat =>
        cat.id === editingId
          ? {
              ...cat,
              title: editTitle,
              icon: editIcon,
              colorPreset: editColor,
              slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            }
          : cat
      ));
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteCategory = (id: string) => {
    setDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setCategories(categories.filter(c => c.id !== deleteConfirm));
      setDeleteConfirm(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getColorClass = (color?: ColorPreset) => {
    switch (color) {
      case 'red': return 'border-red-200 bg-red-50';
      case 'blanc': return 'border-gray-300 bg-white';
      case 'blue': return 'border-blue-200 bg-blue-50';
      case 'green': return 'border-green-200 bg-green-50';
      case 'orange': return 'border-orange-200 bg-orange-50';
      case 'purple': return 'border-purple-200 bg-purple-50';
      case 'yellow': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-border bg-card';
    }
  };

  const IconComponent = (iconName: string) => {
    return (Icons as any)[iconName] || Icons.BookOpen;
  };

  const filteredCategories = categories.filter(cat =>
    cat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Guide des apporteurs nationaux
            </h1>
            <p className="text-muted-foreground">
              Retrouvez toutes les informations sur les apporteurs nationaux
            </p>
          </div>
        </div>

        {isEditMode && (
          <div className="mb-6 flex gap-3">
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Rechercher une catégorie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredCategories.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => (
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
                onSave={handleSaveCategory}
                onCancel={handleCancelEdit}
                onEdit={handleEditCategory}
                onDelete={handleDeleteCategory}
                getColorClass={getColorClass}
                IconComponent={IconComponent}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cette catégorie et toutes ses sections seront supprimées.
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
