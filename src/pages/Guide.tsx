import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { loadAppData } from '@/lib/db';
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
                { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
                { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
                { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
                { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
                { value: 'pink', color: 'bg-pink-50 border-2 border-pink-200', label: 'Rose' },
              ].map(({ value, color, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onEditColorChange(value as ColorPreset)}
                  className={`${color} px-3 py-2 rounded text-sm ${
                    editColor === value ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={onSave} size="sm" className="flex-1">
              Enregistrer
            </Button>
            <Button onClick={onCancel} variant="outline" size="sm" className="flex-1">
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isEditMode && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(category.id)}
              >
                <Icons.Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(category.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <Link to={`/category/${category.slug}`} className="block">
            <div className="flex items-center gap-3 mb-3">
              <Icon className="w-10 h-10" />
              <h3 className="text-xl font-semibold">{category.title}</h3>
            </div>
          </Link>
        </>
      )}
    </div>
  );
};

export default function Guide() {
  const { guideSlug } = useParams<{ guideSlug: string }>();
  const { blocks, isEditMode, toggleEditMode, addBlock, updateBlock, deleteBlock, reorderBlocks } = useEditor();
  const { isAdmin } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [appData, setAppData] = useState<any>(null);
  
  // Récupérer le guide actuel
  const currentGuide = blocks.find(b => b.type === 'guide' && b.slug === guideSlug);
  
  const categories = blocks
    .filter(b => b.type === 'category' && b.guideId === currentGuide?.id)
    .sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadAppData().then(data => {
      if (data) {
        setAppData(data);
      }
    });
  }, [blocks]);

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const getColorClass = (color?: ColorPreset) => {
    const colorMap: Record<ColorPreset, string> = {
      red: 'bg-red-50 border-red-200',
      blanc: 'bg-white border-gray-200',
      white: 'bg-white border-gray-200',
      gray: 'bg-gray-50 border-gray-200',
      green: 'bg-green-50 border-green-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      blue: 'bg-blue-50 border-blue-200',
      purple: 'bg-purple-50 border-purple-200',
      pink: 'bg-pink-50 border-pink-200',
      orange: 'bg-orange-50 border-orange-200',
      cyan: 'bg-cyan-50 border-cyan-200',
      indigo: 'bg-indigo-50 border-indigo-200',
      teal: 'bg-teal-50 border-teal-200',
      rose: 'bg-rose-50 border-rose-200',
    };
    return colorMap[color || 'white'];
  };

  const handleAddCategory = () => {
    if (!currentGuide) return;
    
    const newCategoryId = addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      icon: 'Folder',
      colorPreset: 'blue',
      slug: `category-${Date.now()}`,
      guideId: currentGuide.id,
      attachments: []
    });
    setEditingId(newCategoryId);
    setEditTitle('Nouvelle catégorie');
    setEditIcon('Folder');
    setEditColor('blue');
  };

  const handleEdit = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      setEditColor(category.colorPreset);
    }
  };

  const handleSave = () => {
    if (editingId && editTitle.trim()) {
      const slug = editTitle.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      updateBlock(editingId, {
        title: editTitle,
        icon: editIcon,
        colorPreset: editColor,
        slug: slug
      });
      setEditingId(null);
    }
  };

  const handleCancel = () => {
    const category = categories.find(c => c.id === editingId);
    if (category && !category.title) {
      deleteBlock(editingId!);
    }
    setEditingId(null);
  };

  const handleDeleteConfirm = (id: string) => {
    setCategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (categoryToDelete) {
      const sectionsToDelete = blocks.filter(b => b.type === 'section' && b.parentId === categoryToDelete);
      sectionsToDelete.forEach(section => deleteBlock(section.id));
      deleteBlock(categoryToDelete);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex(c => c.id === active.id);
      const newIndex = categories.findIndex(c => c.id === over.id);
      
      const newOrder = arrayMove(categories, oldIndex, newIndex);
      reorderBlocks(newOrder);
    }
  };

  const filteredCategories = categories.filter(category => {
    if (!searchQuery) return true;
    
    const matchesCategory = category.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    const categorySections = blocks.filter(b => 
      b.type === 'section' && 
      b.parentId === category.id
    );
    
    const matchesSection = categorySections.some(section =>
      section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return matchesCategory || matchesSection;
  });

  if (!currentGuide) {
    return (
      <div className="container max-w-4xl mx-auto p-8">
        <p>Guide non trouvé</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{currentGuide.title}</h1>
            <p className="text-muted-foreground">{currentGuide.content}</p>
          </div>
          {isAdmin && (
            <Button
              onClick={toggleEditMode}
              variant={isEditMode ? "default" : "outline"}
            >
              {isEditMode ? 'Terminer' : 'Mode édition'}
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Rechercher dans ce guide..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isEditMode && (
        <Button
          onClick={handleAddCategory}
          className="w-full mb-6"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une catégorie
        </Button>
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
          <div className="grid gap-4">
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
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={handleEdit}
                onDelete={handleDeleteConfirm}
                getColorClass={getColorClass}
                IconComponent={IconComponent}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {appData && (
        <div className="mt-12 pt-6 border-t text-center text-sm text-muted-foreground">
          <p>Dernière mise à jour : {format(new Date(appData.lastModified), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette catégorie et toutes ses sections ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
