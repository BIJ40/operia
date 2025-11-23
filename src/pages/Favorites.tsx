import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Favorite {
  id: string;
  block_id: string;
  block_title: string;
  block_slug: string;
  category_slug: string;
  scope: string;
  created_at: string;
}

interface FavoriteWithContent extends Favorite {
  content: string;
  color_preset: string;
}

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteWithContent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
    
    loadFavorites();
  }, [isAuthenticated, user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      // Charger les favoris
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favoritesError) throw favoritesError;

      if (!favoritesData || favoritesData.length === 0) {
        setFavorites([]);
        setLoading(false);
        return;
      }

      // Récupérer le contenu des blocks
      const blockIds = favoritesData.map(f => f.block_id);
      const { data: blocksData, error: blocksError } = await supabase
        .from('blocks')
        .select('id, content, color_preset')
        .in('id', blockIds);

      if (blocksError) throw blocksError;

      // Créer une map des blocks pour un accès rapide
      const blocksMap = new Map(
        blocksData?.map(block => [block.id, block]) || []
      );

      // Combiner les données
      const favoritesWithContent = favoritesData.map(favorite => {
        const block = blocksMap.get(favorite.block_id);
        return {
          ...favorite,
          content: block?.content || '<p>Contenu non disponible</p>',
          color_preset: block?.color_preset || 'white',
        };
      });

      setFavorites(favoritesWithContent);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les favoris',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast({
        title: 'Favori supprimé',
        description: 'La section a été retirée de vos favoris',
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le favori',
        variant: 'destructive',
      });
    }
  };

  const handleNavigateToSection = (favorite: Favorite) => {
    const basePath = favorite.scope === 'apporteurs-nationaux' ? '/apporteurs' : '/apogee';
    navigate(`${basePath}/category/${favorite.category_slug}#${favorite.block_id}`);
  };

  if (!isAuthenticated) {
    return null;
  }

  const getColorClasses = (colorPreset: string) => {
    const colorMap: Record<string, string> = {
      white: 'bg-white',
      blue: 'bg-helpconfort-blue-light',
      orange: 'bg-helpconfort-orange',
      green: 'bg-helpconfort-green',
      yellow: 'bg-helpconfort-yellow',
      red: 'bg-helpconfort-red',
    };
    return colorMap[colorPreset] || 'bg-white';
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          Mes Favoris
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border-2 p-8">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground mb-2">
            Vous n'avez pas encore de favoris
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Ajoutez des sections en favoris pour les retrouver facilement ici
          </p>
          <Button onClick={() => navigate('/apogee')} variant="outline">
            Parcourir le guide
          </Button>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {favorites.map((favorite) => {
            const colorClasses = getColorClasses(favorite.color_preset);
            const borderColorMap: Record<string, string> = {
              white: 'border-gray-200',
              blue: 'border-helpconfort-blue-main',
              orange: 'border-helpconfort-orange',
              green: 'border-helpconfort-green',
              yellow: 'border-helpconfort-yellow',
              red: 'border-helpconfort-red',
            };
            const borderColor = borderColorMap[favorite.color_preset] || 'border-gray-200';

            return (
              <AccordionItem 
                key={favorite.id} 
                value={favorite.id}
                className="border-0"
              >
                <div className={`rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border-2 ${borderColor}`}>
                  <AccordionTrigger className={`${colorClasses} px-6 hover:no-underline [&[data-state=open]>div>svg]:rotate-180`}>
                    <div className="flex items-center justify-between w-full gap-4 pr-4">
                      <h3 className="text-lg font-semibold text-white flex-1 text-left">
                        {favorite.block_title}
                      </h3>
                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToSection(favorite);
                          }}
                          variant="ghost"
                          size="icon"
                          title="Voir dans la catégorie"
                          className="text-white hover:bg-white/20 h-8 w-8"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(favorite.id);
                          }}
                          variant="ghost"
                          size="icon"
                          title="Retirer des favoris"
                          className="text-white hover:bg-red-500/80 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-card border-t-2 ${borderColor}">
                    <div className="p-6">
                      <div
                        className="prose prose-sm max-w-none break-words overflow-visible"
                        dangerouslySetInnerHTML={{ __html: favorite.content }}
                      />
                    </div>
                  </AccordionContent>
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
