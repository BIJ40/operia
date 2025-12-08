/**
 * FavorisWidget - Accès rapide aux favoris de l'utilisateur
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Favorite {
  id: string;
  block_title: string;
  block_slug: string;
  category_slug: string;
  scope: string;
}

export function FavorisWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('favorites')
          .select('id, block_title, block_slug, category_slug, scope')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setFavorites(data || []);
      } catch (error) {
        console.error('Erreur chargement favoris:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  const handleNavigate = (fav: Favorite) => {
    const basePath = fav.scope === 'apporteurs-nationaux' ? '/apporteurs-nationaux' : '/academy';
    navigate(`${basePath}/${fav.category_slug}/${fav.block_slug}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-4">
        <Star className="h-8 w-8 opacity-50" />
        <p className="text-sm text-center">Aucun favori</p>
        <Button
          variant="link"
          size="sm"
          onClick={() => navigate('/academy')}
          className="text-xs"
        >
          Parcourir l'Academy
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-1 p-2">
        {favorites.map((fav) => (
          <button
            key={fav.id}
            onClick={() => handleNavigate(fav)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
          >
            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <span className="text-sm truncate flex-1">{fav.block_title}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
