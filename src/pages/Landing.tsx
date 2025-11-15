import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabaseAny = supabase as any;
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

type ColorPreset = 'red' | 'blanc' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

interface HomeCard {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: string;
  color_preset: ColorPreset;
  display_order: number;
}

interface SortableCardProps {
  card: HomeCard;
  editingId: string | null;
  editTitle: string;
  editDescription: string;
  editLink: string;
  editIcon: string;
  editColor: ColorPreset;
  isEditMode: boolean;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onEditLinkChange: (value: string) => void;
  onEditIconChange: (value: string) => void;
  onEditColorChange: (value: ColorPreset) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getColorClass: (color?: ColorPreset) => string;
  IconComponent: (iconName: string) => any;
}

const SortableCard = ({
  card,
  editingId,
  editTitle,
  editDescription,
  editLink,
  editIcon,
  editColor,
  isEditMode,
  onEditTitleChange,
  onEditDescriptionChange,
  onEditLinkChange,
  onEditIconChange,
  onEditColorChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  getColorClass,
  IconComponent,
}: SortableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = IconComponent(card.icon || 'BookOpen');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative border-2 rounded-lg p-6 hover:shadow-lg transition-all ${getColorClass(card.color_preset)}`}
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
      
      {editingId === card.id ? (
        <div className="space-y-3">
          <Input
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            placeholder="Titre de la carte"
            autoFocus
          />
          <Input
            value={editDescription}
            onChange={(e) => onEditDescriptionChange(e.target.value)}
            placeholder="Description"
          />
          <Input
            value={editLink}
            onChange={(e) => onEditLinkChange(e.target.value)}
            placeholder="Lien (ex: /apogee)"
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
                { value: 'yellow', color: 'bg-yellow-50 border-2 border-yellow-200', label: 'Jaune' },
                { value: 'purple', color: 'bg-purple-50 border-2 border-purple-200', label: 'Violet' },
                { value: 'orange', color: 'bg-orange-50 border-2 border-orange-200', label: 'Orange' },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onEditColorChange(preset.value as ColorPreset)}
                  className={`${preset.color} px-3 py-1.5 rounded text-xs font-medium ${
                    editColor === preset.value ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
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
          <Link to={card.link} className="block">
            <Icon className="w-12 h-12 mb-4 text-primary" />
            <h2 className="text-xl font-bold mb-2">{card.title}</h2>
            <p className="text-sm text-muted-foreground">{card.description}</p>
          </Link>
          {isEditMode && (
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={() => onEdit(card.id)}
                size="sm"
                variant="outline"
              >
                Modifier
              </Button>
              <Button
                onClick={() => onDelete(card.id)}
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

export default function Landing() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [homeCards, setHomeCards] = useState<HomeCard[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editIcon, setEditIcon] = useState('BookOpen');
  const [editColor, setEditColor] = useState<ColorPreset>('blue');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

  useEffect(() => {
    loadCards();
    
    // Synchroniser isEditMode avec localStorage
    const storedEditMode = localStorage.getItem('editMode') === 'true';
    setIsEditMode(storedEditMode);
    
    // Écouter les changements de localStorage
    const handleStorageChange = () => {
      const newEditMode = localStorage.getItem('editMode') === 'true';
      setIsEditMode(newEditMode);
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Custom event pour les changements dans le même onglet
    window.addEventListener('editModeChange', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('editModeChange', handleStorageChange);
    };
  }, []);

  const loadCards = async () => {
    try {
      const { data, error } = await supabaseAny
        .from('home_cards')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error loading cards:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les cartes',
          variant: 'destructive',
        });
      } else {
        setHomeCards(data || []);
      }
    } catch (e) {
      console.error('Exception loading cards:', e);
    }
  };

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
    const card = homeCards.find(c => c.id === id);
    if (card) {
      setEditingId(id);
      setEditTitle(card.title);
      setEditDescription(card.description);
      setEditLink(card.link);
      setEditIcon(card.icon || 'BookOpen');
      setEditColor(card.color_preset || 'blue');
    }
  };

  const handleSave = async () => {
    if (editingId) {
      const { error } = await supabaseAny
        .from('home_cards')
        .update({
          title: editTitle,
          description: editDescription,
          link: editLink,
          icon: editIcon,
          color_preset: editColor,
        })
        .eq('id', editingId);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de sauvegarder',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Succès',
          description: 'Carte mise à jour',
        });
        loadCards();
        setEditingId(null);
      }
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setCardToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (cardToDelete) {
      const { error } = await supabaseAny
        .from('home_cards')
        .delete()
        .eq('id', cardToDelete);

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de supprimer',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Succès',
          description: 'Carte supprimée',
        });
        loadCards();
      }
      setCardToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleAddCard = async () => {
    const maxOrder = homeCards.length > 0 
      ? Math.max(...homeCards.map(c => c.display_order))
      : -1;

    // Générer un slug unique pour la nouvelle catégorie
    const timestamp = Date.now();
    const slug = `categorie-${timestamp}`;
    const categoryId = `block-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Créer la catégorie dans blocks
      const { error: blockError } = await supabaseAny
        .from('blocks')
        .insert({
          id: categoryId,
          title: 'Nouvelle section',
          slug: slug,
          type: 'category',
          content: '',
          parent_id: null,
          order: maxOrder + 1,
          color_preset: 'blue',
          icon: 'BookOpen',
          hide_from_sidebar: false,
          attachments: [],
        });

      if (blockError) {
        throw blockError;
      }

      // 2. Créer la carte d'accueil avec le lien vers la catégorie
      const { error: cardError } = await supabaseAny
        .from('home_cards')
        .insert({
          title: 'Nouvelle section',
          description: 'Description',
          link: `/apogee/category/${slug}`,
          icon: 'BookOpen',
          color_preset: 'blue',
          display_order: maxOrder + 1,
        });

      if (cardError) {
        throw cardError;
      }

      toast({
        title: 'Succès',
        description: 'Section créée avec succès',
      });
      loadCards();
    } catch (error) {
      console.error('Error adding card:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la section',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = homeCards.findIndex(c => c.id === active.id);
      const newIndex = homeCards.findIndex(c => c.id === over.id);
      
      const reorderedCards = arrayMove(homeCards, oldIndex, newIndex);
      setHomeCards(reorderedCards);
      
      for (let i = 0; i < reorderedCards.length; i++) {
        await supabaseAny
          .from('home_cards')
          .update({ display_order: i })
          .eq('id', reorderedCards[i].id);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Bienvenue sur Help Confort Services
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Accédez à tous nos guides et ressources
          </p>
        </div>

        {isEditMode && isAdmin ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={homeCards.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {homeCards.map(card => (
                  <SortableCard
                    key={card.id}
                    card={card}
                    editingId={editingId}
                    editTitle={editTitle}
                    editDescription={editDescription}
                    editLink={editLink}
                    editIcon={editIcon}
                    editColor={editColor}
                    isEditMode={isEditMode}
                    onEditTitleChange={setEditTitle}
                    onEditDescriptionChange={setEditDescription}
                    onEditLinkChange={setEditLink}
                    onEditIconChange={setEditIcon}
                    onEditColorChange={setEditColor}
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
            {homeCards.map(card => {
              const Icon = IconComponent(card.icon || 'BookOpen');
              return (
                <Link
                  key={card.id}
                  to={card.link}
                  className={`group relative border-2 rounded-lg p-8 hover:shadow-xl transition-all ${getColorClass(card.color_preset)}`}
                >
                  <Icon className="w-16 h-16 mb-4 text-primary group-hover:scale-110 transition-transform" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">{card.title}</h2>
                  <p className="text-muted-foreground">{card.description}</p>
                </Link>
              );
            })}
          </div>
        )}

        {isEditMode && isAdmin && (
          <div className="flex justify-end mt-8">
            <Button onClick={handleAddCard} size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
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
              Êtes-vous sûr de vouloir supprimer cette carte ?
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
