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

// Composant pour les catégories triables - défini en dehors pour éviter les recréations
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
                { value: 'gray', color: 'bg-gray-50 border-2 border-gray-200', label: 'Gris' },
                { value: 'green', color: 'bg-green-50 border-2 border-green-200', label: 'Vert' },
                { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
                { value: 'blue', color: 'bg-blue-50 border-2 border-blue-200', label: 'Bleu' },
                { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                { value: 'pink', color: 'bg-pink-50 border-2 border-pink-200', label: 'Rose' },
                { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
                { value: 'cyan', color: 'bg-cyan-50 border-2 border-cyan-200', label: 'Cyan' },
                { value: 'indigo', color: 'bg-indigo-50 border-2 border-indigo-200', label: 'Indigo' },
                { value: 'teal', color: 'bg-teal-50 border-2 border-teal-200', label: 'Sarcelle' },
                { value: 'rose', color: 'bg-rose-50 border-2 border-rose-200', label: 'Rose foncé' },
              ].map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => onEditColorChange(colorOption.value as ColorPreset)}
                  className={`w-8 h-8 rounded-full ${colorOption.color} transition-all hover:scale-110 ${
                    editColor === colorOption.value 
                      ? 'ring-4 ring-primary ring-offset-2' 
                      : ''
                  }`}
                  title={colorOption.label}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} size="sm">Enregistrer</Button>
            <Button onClick={onCancel} variant="outline" size="sm">Annuler</Button>
          </div>
        </div>
      ) : (
        <Link
          to={`/category/${category.slug}`}
          className="flex items-start gap-4 group-hover:scale-[1.02] transition-transform"
        >
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">{category.title}</h3>
            {category.content && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {category.content}
              </p>
            )}
          </div>
        </Link>
      )}
      
      {isEditMode && editingId !== category.id && (
        <div className="absolute top-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(category.id)}
            className="h-8 w-8"
          >
            <Icons.Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(category.id)}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default function GuideApogee() {
  const { blocks, loading, isEditMode, updateBlock, addBlock, deleteBlock } = useEditor();
  const { isAuthenticated } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState<ColorPreset>('white');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [lastModified, setLastModified] = useState<number | null>(null);

  // Charger la date de dernière modification
  useEffect(() => {
    loadAppData().then((data) => {
      if (data?.lastModified) {
        setLastModified(data.lastModified);
      }
    });
  }, [blocks]); // Se met à jour quand les blocks changent

  const categories = blocks
    .filter(b => b.type === 'category' && !b.title.toLowerCase().includes('faq'))
    .sort((a, b) => a.order - b.order);
  
  // Trouver la catégorie FAQ
  const faqCategory = blocks.find(
    b => b.type === 'category' && b.title.toLowerCase().includes('faq')
  );

  // Sensors pour le drag and drop
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

  // Recherche dans les sections et catégories
  const searchResults = searchQuery.trim() ? (() => {
    const searchLower = searchQuery.toLowerCase();
    const results: Array<{ type: 'category' | 'section', block: any, parentCategory?: any }> = [];

    categories.forEach(cat => {
      // Chercher dans la catégorie
      if (cat.title.toLowerCase().includes(searchLower) || 
          cat.content.toLowerCase().includes(searchLower)) {
        results.push({ type: 'category', block: cat });
      }

      // Chercher dans les sections de cette catégorie
      const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
      sections.forEach(section => {
        if (section.title.toLowerCase().includes(searchLower) || 
            section.content.toLowerCase().includes(searchLower)) {
          results.push({ type: 'section', block: section, parentCategory: cat });
        }
      });
    });

    return results;
  })() : [];

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const getColorClass = (color?: ColorPreset) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'red': return 'bg-red-50 border-red-200 hover:bg-red-100';
      case 'blue': return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'purple': return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'pink': return 'bg-pink-50 border-pink-200 hover:bg-pink-100';
      case 'orange': return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'cyan': return 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100';
      case 'indigo': return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
      case 'teal': return 'bg-teal-50 border-teal-200 hover:bg-teal-100';
      case 'rose': return 'bg-rose-50 border-rose-200 hover:bg-rose-100';
      case 'gray': return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
      case 'blanc': return 'bg-card border-border hover:bg-accent';
      case 'white': return 'bg-red-50 border-red-200 hover:bg-red-100'; // White ancien = rouge
      default: return 'bg-red-50 border-red-200 hover:bg-red-100'; // Rouge par défaut
    }
  };

  const handleAddCategory = () => {
    const order = categories.length;
    addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      content: '',
      colorPreset: 'red',
      icon: 'BookOpen',
      slug: `categorie-${Date.now()}`,
      attachments: [],
    });
  };

  const handleDeleteClick = (categoryId: string) => {
    setCategoryToDelete(categoryId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteBlock(categoryToDelete);
      setCategoryToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Ouvrir le chatbot avec la question
      const chatButton = document.querySelector('[data-chatbot-trigger]') as HTMLElement;
      if (chatButton) {
        chatButton.click();
        // Passer la question au chatbot via un événement personnalisé
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('chatbot-question', { detail: searchQuery }));
        }, 100);
      }
    }
  };

  const handleEdit = (id: string) => {
    const cat = categories.find(c => c.id === id);
    if (cat) {
      setEditingId(id);
      setEditTitle(cat.title);
      setEditIcon(cat.icon || 'BookOpen');
      setEditColor(cat.colorPreset || 'red');
    }
  };

  const handleSave = () => {
    if (editingId) {
      updateBlock(editingId, { 
        title: editTitle,
        icon: editIcon,
        colorPreset: editColor 
      });
      setEditingId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);

      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);
      
      // Mettre à jour l'ordre de chaque catégorie
      reorderedCategories.forEach((category, index) => {
        updateBlock(category.id, { order: index });
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 py-8 max-w-7xl mx-auto w-full">
        {/* Lien FAQ */}
        {faqCategory && (
          <div className="mb-6">
            <Link 
              to={`/guide-apogee/category/${faqCategory.slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent border-2 rounded-lg hover:shadow-md transition-all"
            >
              <Icons.HelpCircle className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">FAQ Apogée</span>
            </Link>
          </div>
        )}

      <div className="mb-6 flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher avec Mme MICHU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </form>
        {isEditMode && isAuthenticated && (
          <Button onClick={handleAddCategory}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une catégorie
          </Button>
        )}
      </div>

            {searchQuery.trim() ? (
              // Afficher les résultats de recherche
              <div className="space-y-4">
                {searchResults.map((result, idx) => {
                  const Icon = result.type === 'category' 
                    ? IconComponent(result.block.icon || 'BookOpen')
                    : IconComponent(result.parentCategory?.icon || 'BookOpen');
                  
                  const targetUrl = result.type === 'category'
                    ? `/guide-apogee/category/${result.block.slug}`
                    : `/guide-apogee/category/${result.parentCategory?.slug}#${result.block.id}`;

                  return (
                    <Link 
                      key={`${result.type}-${result.block.id}-${idx}`}
                      to={targetUrl}
                      className="block border-2 rounded-lg p-4 hover:shadow-lg transition-all bg-card border-border hover:bg-accent"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {result.type === 'section' && (
                              <span className="text-xs text-muted-foreground">
                                {result.parentCategory?.title} →
                              </span>
                            )}
                            <h3 className="font-semibold text-lg">{result.block.title}</h3>
                          </div>
                          {result.block.content && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {result.block.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                              {result.block.content.length > 150 && '...'}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {searchResults.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">Aucun résultat trouvé pour "{searchQuery}"</p>
                    <Button onClick={() => setSearchQuery('')} variant="outline">
                      Effacer la recherche
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Afficher les catégories normalement avec drag-and-drop en mode édition
              isEditMode ? (
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
                          onCancel={() => setEditingId(null)}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          getColorClass={getColorClass}
                          IconComponent={IconComponent}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categories.map((category) => {
                    const Icon = IconComponent(category.icon || 'BookOpen');
                    
                  return (
                    <Link
                      key={category.id}
                      to={`/guide-apogee/category/${category.slug}`}
                      className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(category.colorPreset)}`}
                    >
                        <div className="flex items-start gap-4 group-hover:scale-[1.02] transition-transform">
                          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                            {category.content && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {category.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            )}

            {categories.length === 0 && !searchQuery.trim() && (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Aucune catégorie disponible</p>
                {isEditMode && isAuthenticated && (
                  <Button onClick={handleAddCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer la première catégorie
                  </Button>
                )}
              </div>
            )}
       
        {/* Footer avec informations du guide */}
        <div className="mt-16 pt-8 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Guide créé par Jérôme Ducourneau le 22/09/2025
            {lastModified && (
              <> et mis à jour le {format(new Date(lastModified), 'dd/MM/yyyy', { locale: fr })}</>
            )}
          </p>
        </div>
      </div>

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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
