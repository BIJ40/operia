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
import { MesIndicateursCard } from '@/components/landing/MesIndicateursCard';
import { ActionsAMenerCard } from '@/components/landing/ActionsAMenerCard';
import { AgencyProvider } from '@/apogee-connect/contexts/AgencyContext';
import { ApiToggleProvider } from '@/apogee-connect/contexts/ApiToggleContext';

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
  is_logo?: boolean;
  size?: 'normal' | 'large';
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
  const isLarge = card.size === 'large';
  const isLogo = card.is_logo || false;

  // Si c'est un logo, afficher l'image avec taille fixe
  if (isLogo) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative w-full max-w-sm mx-auto"
      >
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 cursor-grab active:cursor-grabbing z-10 bg-background/80 rounded p-1"
          >
            <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
          </div>
        )}
        <img 
          src={helpConfortServicesImg} 
          alt={card.title} 
          className="w-full h-auto pointer-events-auto select-none transition-all duration-500 hover:scale-105 hover:brightness-110 cursor-pointer"
          draggable="false"
        />
      </div>
    );
  }

  // Style de base en fonction de la taille avec dimensions fixes pour éviter les changements pendant le drag
  const baseClassName = isLarge
    ? "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-6 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 min-h-[240px] h-[240px] flex flex-col"
    : "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 h-[72px] flex items-center gap-2";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={baseClassName}
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
          {card.link && card.link !== '#' ? (
            <Link to={card.link} className={isLarge ? "flex-1" : "flex items-center gap-2 flex-1"}>
              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300"} />
              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{card.title}</h2>
                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{card.description}</p>
              </div>
            </Link>
          ) : (
            <div className={isLarge ? "flex-1" : "flex items-center gap-2 flex-1"}>
              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0"} />
              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{card.title}</h2>
                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{card.description}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default function Landing() {
  const { isAdmin, isAuthenticated, roleAgence, hasAccessToScope, agence } = useAuth();
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
    loadCards();
    
    if (isAuthenticated) {
      setLoginOpen(false);
    }
    
    const storedEditMode = localStorage.getItem('editMode') === 'true';
    setIsEditMode(storedEditMode);
    
    const handleStorageChange = () => {
      const newEditMode = localStorage.getItem('editMode') === 'true';
      setIsEditMode(newEditMode);
    };
    
    window.addEventListener('storage', handleStorageChange);
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

    const timestamp = Date.now();
    const slug = `categorie-${timestamp}`;
    const categoryId = `block-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

    try {
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

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-start-1 lg:col-start-2">
                <img 
                  src={helpConfortServicesImg} 
                  alt="Help Confort Services" 
                  className="w-full pointer-events-auto select-none transition-all duration-500 hover:scale-105 hover:brightness-110 cursor-pointer"
                  draggable="false"
                />
              </div>
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
                  {(() => {
                    const logoCard = homeCards.find(c => c.is_logo);
                    const actionsCard = homeCards.find(c => 
                      c.link?.includes('/actions-a-mener') || 
                      (c.title?.toLowerCase().includes('actions') && c.title?.toLowerCase().includes('mener'))
                    );
                    const cardsWithoutLogoAndActions = homeCards.filter(c => 
                      !c.is_logo && c.id !== actionsCard?.id
                    );
                    
                    // Trouver l'index de "Mes demandes de support"
                    const supportCardIndex = cardsWithoutLogoAndActions.findIndex(c => 
                      c.title?.toLowerCase().includes('support') || 
                      c.title?.toLowerCase().includes('demande') ||
                      c.link?.includes('/mes-demandes') ||
                      c.link?.includes('/support')
                    );

                    // Insérer "Actions à mener" après "Mes demandes de support"
                    const reorderedCards = [...cardsWithoutLogoAndActions];
                    if (actionsCard && supportCardIndex !== -1) {
                      reorderedCards.splice(supportCardIndex + 1, 0, actionsCard);
                    } else if (actionsCard) {
                      reorderedCards.push(actionsCard);
                    }

                    return (
                      <>
                        <SortableContext
                          items={reorderedCards.map(c => c.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                            {reorderedCards.map((card) => (
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
                        
                        {/* Logo FIXE en dessous de toute la grille - centré */}
                        {logoCard && (
                          <div className="flex justify-center mt-6">
                            <div className="w-full max-w-md">
                              <div className="relative">
                                <div className="absolute top-2 left-2 bg-yellow-100 dark:bg-yellow-900 rounded px-2 py-1 z-10 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                                  🔒 FIXÉ
                                </div>
                                <img
                                  src={helpConfortServicesImg}
                                  alt={logoCard.title}
                                  className="w-full h-auto pointer-events-none select-none opacity-90"
                                  draggable="false"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </DndContext>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
                  {(() => {
                    const logoCard = homeCards.find(c => c.is_logo);
                    const actionsCard = homeCards.find(c => 
                      c.link?.includes('/actions-a-mener') || 
                      (c.title?.toLowerCase().includes('actions') && c.title?.toLowerCase().includes('mener'))
                    );
                    const regularCards = homeCards.filter(c => !c.is_logo && c.id !== actionsCard?.id);
                    const supportCardIndex = regularCards.findIndex(c => 
                      c.title?.toLowerCase().includes('support') || 
                      c.title?.toLowerCase().includes('demande') ||
                      c.link?.includes('/mes-demandes') ||
                      c.link?.includes('/support')
                    );
                    // Ne pas insérer actionsCard dans le tableau, on va le gérer manuellement
                    const allElements: JSX.Element[] = [];
                    let actionsRendered = false;
                    let logoRendered = false;
                    
                    regularCards.forEach((currentCard, index) => {
                      const Icon = IconComponent(currentCard.icon || 'BookOpen');
                      const isLarge = (currentCard.size === 'large');

                      // Gérer spécialement "Mes indicateurs"
                      if (currentCard.link?.includes('/mes-indicateurs')) {
                        const scope = 'mes_indicateurs';
                        const isLocked = !hasAccessToScope(scope) || !agence;
                        
                        if (!isLocked && agence) {
                          allElements.push(
                            <div key={currentCard.id} className={isLarge ? "min-h-[240px]" : ""}>
                                  <ApiToggleProvider>
                                    <AgencyProvider>
                                      <MesIndicateursCard />
                                    </AgencyProvider>
                                  </ApiToggleProvider>
                            </div>
                          );
                        } else {
                          allElements.push(
                            <div
                              key={currentCard.id}
                                  onClick={() => {
                                    toast({
                                      title: 'Accès restreint',
                                      description: 'Vous n\'avez pas les permissions pour accéder à cette section',
                                      variant: 'destructive',
                                    });
                                  }}
                                  className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer opacity-60 min-h-[240px] flex items-center justify-center"
                                >
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
                                  </div>
                            </div>
                          );
                        }
                      }

                      // Vérifier les permissions pour les autres cartes
                      else {
                        let scope: 'apogee' | 'apporteurs' | 'helpconfort' | 'mes_indicateurs' | null = null;
                        if (currentCard.link?.includes('/apogee')) scope = 'apogee';
                        else if (currentCard.link?.includes('/apporteur')) scope = 'apporteurs';
                        else if (currentCard.link?.includes('/helpconfort')) scope = 'helpconfort';
                        
                        const isLocked = scope ? !hasAccessToScope(scope) : false;

                        const baseClassName = isLarge
                          ? "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-2xl p-6 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 min-h-[240px] flex flex-col"
                          : "group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-helpconfort-blue-light/10 to-helpconfort-blue-dark/10 rounded-full px-4 py-2 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 flex items-center gap-2";
                        
                        if (isLocked) {
                          allElements.push(
                            <div
                              key={currentCard.id}
                              onClick={() => {
                                toast({
                                  title: 'Accès restreint',
                                  description: 'Vous n\'avez pas les permissions pour accéder à cette section',
                                  variant: 'destructive',
                                });
                              }}
                              className={`${baseClassName} cursor-pointer opacity-60`}
                            >
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
                              </div>
                              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4 opacity-50" : "w-12 h-12 text-primary flex-shrink-0 opacity-50"} />
                              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
                                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
                              </div>
                            </div>
                          );
                        } else if (currentCard.link && currentCard.link !== '#') {
                          allElements.push(
                            <Link
                              key={currentCard.id}
                              to={currentCard.link}
                              className={baseClassName}
                            >
                              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0 group-hover:scale-110 transition-transform duration-300"} />
                              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
                                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
                              </div>
                            </Link>
                          );
                        } else {
                          allElements.push(
                            <div key={currentCard.id} className={baseClassName}>
                              <Icon className={isLarge ? "w-12 h-12 text-primary mb-4" : "w-12 h-12 text-primary flex-shrink-0"} />
                              <div className={isLarge ? "" : "flex-1 min-w-0"}>
                                <h2 className={isLarge ? "text-xl font-bold text-foreground mb-2" : "text-lg font-bold text-foreground truncate"}>{currentCard.title}</h2>
                                <p className={isLarge ? "text-sm text-muted-foreground" : "text-xs text-muted-foreground truncate"}>{currentCard.description}</p>
                              </div>
                            </div>
                          );
                        }
                      }
                      
                      // Après le support card, insérer Actions puis Logo
                      if (index === supportCardIndex && !actionsRendered) {
                        // Insérer Actions à mener
                        if (actionsCard) {
                          const Icon = IconComponent(actionsCard.icon || 'BookOpen');
                          const isLarge = true;
                          const isLocked = !agence;
                          
                          if (!isLocked && agence) {
                            allElements.push(
                              <div key={actionsCard.id} className="min-h-[240px]">
                                <ApiToggleProvider>
                                  <AgencyProvider>
                                    <ActionsAMenerCard />
                                  </AgencyProvider>
                                </ApiToggleProvider>
                              </div>
                            );
                          } else {
                            allElements.push(
                              <div
                                key={actionsCard.id}
                                onClick={() => {
                                  toast({
                                    title: 'Accès restreint',
                                    description: 'Vous devez être rattaché à une agence',
                                    variant: 'destructive',
                                  });
                                }}
                                className="group relative border-2 border-primary/20 border-l-4 border-l-accent bg-gradient-to-r from-orange-50/50 to-red-50/50 dark:from-orange-950/20 dark:to-red-950/20 rounded-2xl p-4 hover:shadow-lg hover:border-primary/40 hover:scale-[1.02] transition-all duration-300 cursor-pointer opacity-60 min-h-[240px] flex items-center justify-center"
                              >
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <Lock className="w-12 h-12 text-destructive drop-shadow-lg" />
                                </div>
                              </div>
                            );
                          }
                          actionsRendered = true;
                        }
                        
                        // Insérer le logo
                        if (logoCard && !logoRendered) {
                          allElements.push(
                            <div key="logo-fixed" className="flex items-center justify-center p-4">
                              <img 
                                src={helpConfortServicesImg} 
                                alt={logoCard.title} 
                                className="w-full max-w-[180px] h-auto pointer-events-auto select-none transition-all duration-500 hover:scale-105 hover:brightness-110 cursor-pointer"
                                draggable="false"
                              />
                            </div>
                          );
                          logoRendered = true;
                        }
                      }
                    });
                    
                    return allElements;
                  })()}
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
