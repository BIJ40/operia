import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plus, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoginDialog } from '@/components/LoginDialog';
import { Header } from '@/components/Header';
import { arrayMove } from '@dnd-kit/sortable';
import { DragEndEvent } from '@dnd-kit/core';
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

import { HomeCard, ColorPreset } from '@/components/landing/types';
import { UnauthenticatedGrid } from '@/components/landing/UnauthenticatedGrid';
import { AuthenticatedGrid } from '@/components/landing/AuthenticatedGrid';

const supabaseAny = supabase as any;

export default function Landing() {
  const { isAdmin, isAuthenticated } = useAuth();
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
  const [loginOpen, setLoginOpen] = useState(false);

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
        description: "Impossible d'ajouter la section",
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
            <UnauthenticatedGrid 
              homeCards={homeCards} 
              onLoginClick={() => setLoginOpen(true)} 
            />
          </div>
        </div>
      ) : (
        <>
          <Header />
          <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
            <div className="container max-w-6xl mx-auto px-4 py-12">
              <AuthenticatedGrid
                homeCards={homeCards}
                isEditMode={isEditMode}
                isAdmin={isAdmin}
                editingId={editingId}
                editTitle={editTitle}
                editDescription={editDescription}
                editLink={editLink}
                editIcon={editIcon}
                editColor={editColor}
                onEditTitleChange={setEditTitle}
                onEditDescriptionChange={setEditDescription}
                onEditLinkChange={setEditLink}
                onEditIconChange={setEditIcon}
                onEditColorChange={setEditColor}
                onSave={handleSave}
                onCancel={handleCancel}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDragEnd={handleDragEnd}
              />

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
