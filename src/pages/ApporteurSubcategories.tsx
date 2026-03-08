// Page affichant les sous-catégories d'une catégorie (apporteur)
import { useParams, Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, GripVertical, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { ColorPicker } from '@/components/ColorPicker';
import { ImageUploader } from '@/components/ImageUploader';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import type { Block, ColorPreset } from '@/types/block';

interface SortableSubcategoryProps {
  subcategory: Block;
  categorySlug: string;
  isEditMode: boolean;
  isEditing: boolean;
  editTitle: string;
  editIcon: string;
  editColorPreset: ColorPreset;
  editImageUrl: string | null;
  editShowTitleOnCard: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  setEditTitle: (val: string) => void;
  setEditIcon: (val: string) => void;
  setEditColorPreset: (val: ColorPreset) => void;
  setEditImageUrl: (val: string | null) => void;
  setEditShowTitleOnCard: (val: boolean) => void;
}

function SortableSubcategory({
  subcategory,
  categorySlug,
  isEditMode,
  isEditing,
  editTitle,
  editIcon,
  editColorPreset,
  editImageUrl,
  editShowTitleOnCard,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  setEditTitle,
  setEditIcon,
  setEditColorPreset,
  setEditImageUrl,
  setEditShowTitleOnCard,
}: SortableSubcategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const colorClass = `color-${subcategory.colorPreset}`;
  
  // Récupérer l'icône Lucide
  const LucideIcon = subcategory.icon && !subcategory.icon.startsWith('http') 
    ? (Icons as any)[subcategory.icon] || Icons.BookOpen
    : null;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="p-6 bg-card rounded-lg border-2 border-primary">
        <div className="space-y-4">
          <div>
            <Label>Titre</Label>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Titre de la sous-catégorie"
            />
          </div>

          <div>
            <Label>Image (30x30px recommandé)</Label>
            <ImageUploader
              bucketName="category-images"
              onImageChange={(url) => {
                setEditImageUrl(url);
                setEditIcon('');
              }}
              currentImage={editImageUrl || undefined}
              maxSize={1}
            />
          </div>

          <div>
            <Label>Couleur de fond</Label>
            <ColorPicker
              value={editColorPreset}
              onChange={setEditColorPreset}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`show-title-${subcategory.id}`}
              checked={editShowTitleOnCard}
              onCheckedChange={(checked) => setEditShowTitleOnCard(checked === true)}
            />
            <Label htmlFor={`show-title-${subcategory.id}`}>
              Afficher le titre sur la carte
            </Label>
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave}>Enregistrer</Button>
            <Button variant="outline" onClick={onCancel}>Annuler</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <Link 
        to={ROUTES.academy.apporteursSubCategory(categorySlug, subcategory.slug)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-sm hover:shadow-md transition-all border ${colorClass}`}
      >
        {subcategory.icon?.startsWith('http') ? (
          <img 
            src={subcategory.icon} 
            alt="" 
            className="w-8 h-8 object-contain flex-shrink-0"
          />
        ) : LucideIcon ? (
          <LucideIcon className="w-8 h-8 text-primary flex-shrink-0" />
        ) : null}
        {subcategory.showTitleOnCard !== false && (
          <h3 className="text-sm font-semibold">{subcategory.title}</h3>
        )}
      </Link>

      {isEditMode && (
        <div className="absolute top-2 right-2 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ApporteurSubcategories() {
  const { slug } = useParams<{ slug: string }>();
  const { blocks, isEditMode, updateBlock, deleteBlock, addBlock, reorderBlocks } = useApporteurEditor();
  const { isAdmin } = useAuth();

  const category = useMemo(
    () => blocks.find(b => b.type === 'category' && b.slug === slug),
    [blocks, slug]
  );

  const subcategories = useMemo(
    () => blocks
      .filter(b => b.type === 'subcategory' && b.parentId === category?.id)
      .sort((a, b) => a.order - b.order),
    [blocks, category?.id]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColorPreset, setEditColorPreset] = useState<ColorPreset>('white');
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!category) {
    return (
      <div className="container max-w-6xl mx-auto p-8">
        <p className="text-muted-foreground">Catégorie non trouvée</p>
      </div>
    );
  }

  const handleEdit = (subcategory: Block) => {
    setEditingId(subcategory.id);
    setEditTitle(subcategory.title);
    setEditIcon(subcategory.icon || '');
    setEditColorPreset(subcategory.colorPreset);
    setEditImageUrl(subcategory.icon?.startsWith('http') ? subcategory.icon : null);
    setEditShowTitleOnCard(subcategory.showTitleOnCard !== false);
  };

  const handleSave = async () => {
    if (!editingId) return;

    await updateBlock(editingId, {
      title: editTitle,
      icon: editImageUrl || editIcon,
      colorPreset: editColorPreset,
      showTitleOnCard: editShowTitleOnCard,
      slug: editTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });

    setEditingId(null);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setSubcategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (subcategoryToDelete) {
      await deleteBlock(subcategoryToDelete);
      setSubcategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddSubcategory = async () => {
    if (!category) return;

    const newSlug = `nouvelle-sous-categorie-${Date.now()}`;
    await addBlock({
      type: 'subcategory',
      title: 'Nouvelle sous-catégorie',
      content: '',
      colorPreset: 'white',
      slug: newSlug,
      parentId: category.id,
      attachments: [],
      hideFromSidebar: false,
      showTitleOnCard: true,
      showTitleInMenu: true,
      order: subcategories.length,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = subcategories.findIndex((s) => s.id === active.id);
    const newIndex = subcategories.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedSubcategories = arrayMove(subcategories, oldIndex, newIndex);
    
    // Calculer les nouveaux ordres en préservant l'ordre minimum
    const minOrder = Math.min(...subcategories.map(s => s.order));
    const subcategoriesWithNewOrder = reorderedSubcategories.map((subcategory, index) => ({
      ...subcategory,
      order: minOrder + index
    }));

    await reorderBlocks(subcategoriesWithNewOrder);
  };

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{category.title}</h1>
        <p className="text-muted-foreground">Sélectionnez une sous-catégorie</p>
      </div>

      {isEditMode && isAdmin && (
        <div className="mb-6 flex justify-end">
          <Button onClick={handleAddSubcategory} size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={subcategories.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subcategories.map((subcategory) => (
              <SortableSubcategory
                key={subcategory.id}
                subcategory={subcategory}
                categorySlug={slug || ''}
                isEditMode={isEditMode && isAdmin}
                isEditing={editingId === subcategory.id}
                editTitle={editTitle}
                editIcon={editIcon}
                editColorPreset={editColorPreset}
                editImageUrl={editImageUrl}
                editShowTitleOnCard={editShowTitleOnCard}
                onEdit={() => handleEdit(subcategory)}
                onSave={handleSave}
                onCancel={handleCancel}
                onDelete={() => handleDelete(subcategory.id)}
                setEditTitle={setEditTitle}
                setEditIcon={setEditIcon}
                setEditColorPreset={setEditColorPreset}
                setEditImageUrl={setEditImageUrl}
                setEditShowTitleOnCard={setEditShowTitleOnCard}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette sous-catégorie ? Cette action est irréversible.
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
