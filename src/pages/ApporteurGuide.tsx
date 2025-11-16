// Page Guide Apporteurs (clone d'ApogeeGuide avec données séparées)
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical, Upload, X, Edit2 } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onShowTitleOnCardChange: (value: boolean) => void;
  onShowTitleInMenuChange: (value: boolean) => void;
  onImageUpload: (file: File) => Promise<void>;
  onImageRemove: () => void;
  uploadingImage: boolean;
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
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
  onShowTitleOnCardChange,
  onShowTitleInMenuChange,
  onImageUpload,
  onImageRemove,
  uploadingImage,
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
      className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(category.colorPreset)}`}
    >
      {isEditMode && !editingId && (
        <div className="absolute top-2 right-2 flex gap-1 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm z-10">
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
            onClick={() => onEdit(category.id)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => onDelete(category.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
          <div className="flex gap-2">
            <div className="flex-1">
              <IconPicker
                value={editIcon.startsWith('http') ? 'BookOpen' : editIcon}
                onChange={onEditIconChange}
              />
            </div>
            <div className="space-y-2">
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageUpload(file);
                  }}
                  disabled={uploadingImage}
                  id="icon-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('icon-upload')?.click()}
                  disabled={uploadingImage}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? 'Upload...' : 'Image perso'}
                </Button>
              </label>
              {editIcon.startsWith('http') && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onImageRemove}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Retirer
                </Button>
              )}
            </div>
          </div>
          {editIcon.startsWith('http') && (
            <div className="p-2 bg-muted rounded-lg">
              <img src={editIcon} alt="Icône perso" className="w-12 h-12 object-contain mx-auto" />
            </div>
          )}
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Affichage du titre</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editShowTitleOnCard}
                    onChange={(e) => onShowTitleOnCardChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Sur la carte</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editShowTitleInMenu}
                    onChange={(e) => onShowTitleInMenuChange(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Dans le menu</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Couleur</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'red', color: 'bg-red-50 border-2 border-red-200', label: 'Rouge' },
                  { value: 'blanc', color: 'bg-white border-2 border-gray-300', label: 'Blanc' },
                  { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
                  { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
                  { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
                  { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                  { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
                ].map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onEditColorChange(c.value as ColorPreset)}
                    className={`w-12 h-12 rounded-md ${c.color} ${editColor === c.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button onClick={onCancel} variant="outline" size="sm">
              Annuler
            </Button>
            <Button onClick={onSave} size="sm">
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        <Link to={`/apporteurs/category/${category.slug}`} className="block">
          <div className="flex flex-col items-center justify-center gap-3">
            {isCustomImage ? (
              <img src={category.icon} alt={category.title} className="w-[120px] h-[120px] object-contain" />
            ) : (
              <Icon className="w-[120px] h-[120px] text-primary" />
            )}
            {category.showTitleOnCard !== false && (
              <h3 className="text-xl font-semibold text-center">{category.title}</h3>
            )}
          </div>
        </Link>
      )}
    </div>
  );
};

export default function ApporteurGuide() {
  const { blocks, isEditMode, addBlock, updateBlock, deleteBlock } = useApporteurEditor();
  const { isAdmin } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editShowTitleInMenu, setEditShowTitleInMenu] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

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
    if (!editingId) return;
    
    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${editingId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('category-icons')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('category-icons')
        .getPublicUrl(filePath);

      setEditIcon(publicUrl);
      toast.success('Image uploadée avec succès');
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageRemove = () => {
    setEditIcon('BookOpen');
    toast.success('Image retirée');
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
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = apporteurCategories.findIndex(c => c.id === active.id);
      const newIndex = apporteurCategories.findIndex(c => c.id === over.id);
      
      const reorderedCategories = arrayMove(apporteurCategories, oldIndex, newIndex);
      
      // Mettre à jour l'ordre de toutes les catégories
      for (let index = 0; index < reorderedCategories.length; index++) {
        const category = reorderedCategories[index];
        await updateBlock(category.id, { order: index });
      }
    }
  };

  const filteredCategories = searchTerm 
    ? apporteurCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : apporteurCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Guide Apporteurs
          </h1>
          <p className="text-lg text-muted-foreground">
            Toutes les informations pour les apporteurs d'affaires
          </p>
        </div>

        <div className="mb-6 flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              placeholder="Rechercher un apporteur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-2"
            />
          </div>
          {isAdmin && isEditMode && (
            <Button
              onClick={handleAddCategory}
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
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
                  onEditTitleChange={setEditTitle}
                  onEditIconChange={setEditIcon}
                  onEditColorChange={setEditColor}
                  onShowTitleOnCardChange={setEditShowTitleOnCard}
                  onShowTitleInMenuChange={setEditShowTitleInMenu}
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  uploadingImage={uploadingImage}
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

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              {searchTerm 
                ? 'Aucune catégorie trouvée pour cette recherche'
                : 'Aucune catégorie disponible'}
            </p>
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
