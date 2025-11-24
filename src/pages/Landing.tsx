import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Lock, LogIn } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/LoginDialog';
import { Header } from '@/components/Header';
import helpConfortServicesImg from '@/assets/help-confort-services.png';
import { useEditor } from '@/contexts/EditorContext';
import { useIsBlockLocked } from '@/hooks/use-permissions';

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
      className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
    >
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </div>
          {editingId !== card.id && (
            <div className="absolute top-10 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Button
                onClick={() => onEdit(card.id)}
                size="icon"
                variant="outline"
                className="h-7 w-7"
              >
                <Icons.Edit className="w-3 h-3" />
              </Button>
              <Button
                onClick={() => onDelete(card.id)}
                size="icon"
                variant="destructive"
                className="h-7 w-7"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </>
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
          <Link to={card.link} className="flex items-center gap-2">
          <Icon className="w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
              <p className="text-xs text-muted-foreground truncate">{card.description}</p>
            </div>
          </Link>
        </>
      )}
    </div>
  );
};

export default function Landing() {
  const { isAdmin, isAuthenticated, roleAgence } = useAuth();
  const { toast } = useToast();
  const { blocks } = useEditor();
  const isBlockLocked = useIsBlockLocked();
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
  const [loginOpen, setLoginOpen] = useState(false);

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
    loadCards(); // Toujours charger les cartes, même pour les visiteurs
    
    if (isAuthenticated) {
      setLoginOpen(false);
    }
    
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
  }, [isAuthenticated]);

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
      
      // Recharger les blocks dans le contexte pour mettre à jour la sidebar
      window.location.reload();
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
    <>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      
      {!isAuthenticated ? (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          {/* Header visiteur - uniquement bouton de connexion */}
          <div className="container mx-auto px-4 py-4 flex justify-end">
            <Button
              onClick={() => setLoginOpen(true)}
              variant="ghost"
              className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-border rounded-xl hover:bg-accent hover:border-primary/50 hover:scale-[1.02] transition-all duration-300"
            >
              <LogIn className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">SE CONNECTER</span>
            </Button>
          </div>

          <div className="container max-w-6xl mx-auto px-4 py-8">
            {/* Cartes avec cadenas pour visiteurs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {homeCards.map(card => {
                const Icon = IconComponent(card.icon || 'BookOpen');
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      toast({
                        title: 'Accès restreint',
                        description: 'Veuillez vous connecter pour accéder à cette section',
                        variant: 'destructive',
                      });
                      setLoginOpen(true);
                    }}
                    className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer opacity-60"
                  >
                    {/* Cadenas en overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
                    </div>
                    
                    <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
                      <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Help Confort Services Image */}
            <div className="mt-12 text-center">
              <img 
                src={helpConfortServicesImg} 
                alt="Help Confort Services" 
                className="w-full max-w-3xl mx-auto"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <Header />
          <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
          <div className="container max-w-6xl mx-auto px-4 py-12">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {homeCards.map(card => {
                  const Icon = IconComponent(card.icon || 'BookOpen');
                  
                  // Trouver le block correspondant à la carte pour vérifier l'accès
                  const linkParts = card.link.split('/');
                  const slug = linkParts[linkParts.length - 1];
                  const matchingBlock = blocks.find(b => b.slug === slug && b.type === 'category');
                  const isLocked = matchingBlock ? isBlockLocked(matchingBlock.id, blocks) : false;
                  
                  if (isLocked) {
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          toast({
                            title: 'Accès restreint',
                            description: 'Vous n\'avez pas les permissions pour accéder à cette section',
                            variant: 'destructive',
                          });
                        }}
                        className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2 cursor-pointer opacity-60"
                      >
                        {/* Cadenas en overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
                        </div>
                        
                        <Icon className="w-12 h-12 text-primary flex-shrink-0 opacity-50" />
                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
                          <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <Link
                      key={card.id}
                      to={card.link}
                      className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2"
                    >
                      <Icon className="w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-foreground truncate">{card.title}</h2>
                        <p className="text-xs text-muted-foreground truncate">{card.description}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Help Confort Services Image */}
            <div className="mt-12 text-center">
              <img 
                src={helpConfortServicesImg} 
                alt="Help Confort Services" 
                className="w-full max-w-3xl mx-auto"
              />
            </div>

            {isEditMode && isAdmin && (
              <div className="flex justify-end mt-8">
                <Button onClick={handleAddCard} size="sm" variant="ghost" className="gap-1 text-muted-foreground hover:text-foreground">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
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
        </>
      )}
    </>
  );
}
