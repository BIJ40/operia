import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Star, ExternalLink } from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';

interface Favorite {
  id: string;
  block_title: string;
  block_slug: string;
  category_slug: string;
  scope: string;
}

interface FavoritesWidgetProps {
  size?: 'small' | 'medium' | 'large';
  isConfigMode?: boolean;
  onRemove?: () => void;
}

export function FavoritesWidget({ size = 'medium', isConfigMode, onRemove }: FavoritesWidgetProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setFavorites(data);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScopeUrl = (fav: Favorite) => {
    if (fav.scope === 'apporteur') {
      return `/apporteurs/category/${fav.category_slug}`;
    } else if (fav.scope === 'helpconfort') {
      return `/helpconfort/category/${fav.category_slug}`;
    }
    return `/apogee/category/${fav.category_slug}`;
  };

  return (
    <DashboardWidget
      title="Mes favoris"
      description="Accès rapide à vos sections préférées"
      size={size}
      isConfigMode={isConfigMode}
      onRemove={onRemove}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Star className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Aucun favori pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {favorites.map((fav) => (
            <Link
              key={fav.id}
              to={getScopeUrl(fav)}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium">{fav.block_title}</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </DashboardWidget>
  );
}
