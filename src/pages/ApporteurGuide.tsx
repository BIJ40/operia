// Page Guide Apporteurs (clone d'ApogeeGuide avec données séparées)
import { useApporteurEditor } from '@/contexts/ApporteurEditorContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useState, useMemo } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { ColorPreset } from '@/types/block';
import { Plus, Trash2, Search, GripVertical, Upload, X, Edit2, Ban, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { IconPicker } from '@/components/IconPicker';
import { supabase } from '@/integrations/supabase/client';
import { logError } from '@/lib/logger';
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
  editIsEmpty: boolean;
  isEditMode: boolean;
  isEmpty: boolean;
  onEditTitleChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onShowTitleOnCardChange: (value: boolean) => void;
  onShowTitleInMenuChange: (value: boolean) => void;
  onEditIsEmptyChange: (value: boolean) => void;
  onImageUpload: (file: File) => Promise<void>;
  onImageRemove: () => void;
  uploadingImage: boolean;
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
  editShowTitleOnCard,
  editShowTitleInMenu,
  editIsEmpty,
  isEditMode,
  isEmpty,
  onEditTitleChange,
  onEditIconChange,
  onEditColorChange,
  onShowTitleOnCardChange,
  onShowTitleInMenuChange,
  onEditIsEmptyChange,
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
      className="group relative"
    >
      {editingId === category.id ? (
        <div className="border-2 border-primary rounded-lg p-4 bg-card space-y-3">
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
            
            <div className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                id="mark-empty-ap"
                checked={editIsEmpty}
                onChange={(e) => onEditIsEmptyChange(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="mark-empty-ap" className="text-sm text-muted-foreground cursor-pointer">
                Marquer comme vide (grise la catégorie)
              </label>
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
        <Link
          to={`${ROUTES.academy.apporteursCategory(category.slug)}${isEditMode ? '?edit=true' : ''}`}
          className={`flex flex-col items-center justify-center rounded-xl p-3 transition-all duration-200 hover:scale-105 hover:shadow-md ${isEmpty ? 'opacity-40 grayscale' : ''}`}
          title={category.title}
        >
          {isCustomImage ? (
            <img
              src={category.icon}
              alt={category.title}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
          )}
          {category.showTitleOnCard !== false && (
            <span className="mt-1.5 text-xs font-medium text-muted-foreground text-center truncate max-w-full">
              {category.title}
            </span>
          )}
        </Link>
      )}

      {/* Edit mode controls */}
      {isEditMode && !editingId && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            {...attributes}
            {...listeners}
            size="icon"
            variant="outline"
            className="h-6 w-6 bg-background shadow-sm cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onEdit(category.id)}
            size="icon"
            variant="outline"
            className="h-6 w-6 bg-background shadow-sm"
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onDelete(category.id)}
            size="icon"
            variant="destructive"
            className="h-6 w-6 shadow-sm"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Badge Vide */}
      {isEmpty && !isEditMode && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className="bg-muted text-muted-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 border border-muted-foreground/30">
            <Ban className="w-2.5 h-2.5" />
            Vide
          </div>
        </div>
      )}
    </div>
  );
};

export default function ApporteurGuide() {
  const { blocks, isEditMode, addBlock, updateBlock, deleteBlock, reorderBlocks } = useApporteurEditor();
  const { isAuthenticated } = useAuthCore();
  const { hasAccessToScope, hasGlobalRole, hasModuleOption } = usePermissions();
  
  // P0: Utiliser V2 - hasModuleOption au lieu de isAdmin
  const canEdit = hasGlobalRole('platform_admin') || hasModuleOption('support.guides', 'edition');
  const canDelete = hasGlobalRole('platform_admin');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [editShowTitleOnCard, setEditShowTitleOnCard] = useState(true);
  const [editShowTitleInMenu, setEditShowTitleInMenu] = useState(true);
  const [editIsEmpty, setEditIsEmpty] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Vérifier les permissions pour accéder à cette page
  if (!hasAccessToScope('apporteurs')) {
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

  // Calculate category isEmpty status
  const getCategoryStatus = useMemo(() => {
    return (categoryId: string, category: any) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      // isEmpty: si la catégorie est marquée vide OU si toutes ses sections sont vides
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { isEmpty };
    };
  }, [blocks]);

  const handleEdit = (id: string) => {
    const category = apporteurCategories.find(c => c.id === id);
    if (category) {
      setEditingId(id);
      setEditTitle(category.title);
      setEditIcon(category.icon || 'BookOpen');
      setEditColor(category.colorPreset || 'blue');
      setEditShowTitleOnCard(category.showTitleOnCard !== false);
      setEditShowTitleInMenu(category.showTitleInMenu !== false);
      setEditIsEmpty(category.isEmpty || false);
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
      logError('APPORTEUR_GUIDE', 'Erreur upload image', { error });
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
        isEmpty: editIsEmpty,
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
        <PageHeader
          title="Guide Apporteurs"
          subtitle="Toutes les informations pour les apporteurs d'affaires"
        />

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
          {canEdit && isEditMode && (
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
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {filteredCategories.map(category => {
                const { isEmpty } = getCategoryStatus(category.id, category);
                return (
                  <SortableCategory
                    key={category.id}
                    category={category}
                    editingId={editingId}
                    editTitle={editTitle}
                    editIcon={editIcon}
                    editColor={editColor}
                    editShowTitleOnCard={editShowTitleOnCard}
                    editShowTitleInMenu={editShowTitleInMenu}
                    editIsEmpty={editIsEmpty}
                    isEditMode={isEditMode}
                    isEmpty={isEmpty}
                    onEditTitleChange={setEditTitle}
                    onEditIconChange={setEditIcon}
                    onEditColorChange={setEditColor}
                    onShowTitleOnCardChange={setEditShowTitleOnCard}
                    onShowTitleInMenuChange={setEditShowTitleInMenu}
                    onEditIsEmptyChange={setEditIsEmpty}
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
                );
              })}
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
