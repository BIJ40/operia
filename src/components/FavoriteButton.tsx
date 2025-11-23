import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  blockId: string;
  blockTitle: string;
  blockSlug: string;
  categorySlug: string;
  scope: string;
}

export function FavoriteButton({ blockId, blockTitle, blockSlug, categorySlug, scope }: FavoriteButtonProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      checkFavorite();
    }
  }, [isAuthenticated, user, blockId]);

  const checkFavorite = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('block_id', blockId)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error('Error checking favorite:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Vous devez être connecté pour ajouter des favoris',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (isFavorite) {
        // Retirer des favoris
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('block_id', blockId);

        if (error) throw error;

        setIsFavorite(false);
        toast({
          title: 'Favori supprimé',
          description: 'Cette section a été retirée de vos favoris',
        });
      } else {
        // Ajouter aux favoris
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            block_id: blockId,
            block_title: blockTitle,
            block_slug: blockSlug,
            category_slug: categorySlug,
            scope: scope,
          });

        if (error) throw error;

        setIsFavorite(true);
        toast({
          title: 'Favori ajouté',
          description: 'Cette section a été ajoutée à vos favoris',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le favori',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={toggleFavorite}
      disabled={loading}
      variant="ghost"
      size="icon"
      className={`transition-all duration-200 ${
        isFavorite 
          ? 'text-red-500 hover:text-red-600' 
          : 'text-muted-foreground hover:text-red-500'
      }`}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
    </Button>
  );
}
