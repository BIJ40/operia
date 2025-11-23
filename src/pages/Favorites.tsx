import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  block_id: string;
  block_title: string;
  block_slug: string;
  category_slug: string;
  scope: string;
  created_at: string;
}

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
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
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFavorites(data || []);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Card className="border-2 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Heart className="w-6 h-6 fill-white" />
              Mes Favoris
            </CardTitle>
            <CardDescription className="text-white/90">
              Retrouvez rapidement vos sections préférées
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : favorites.length === 0 ? (
              <div className="text-center py-12">
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
              <div className="space-y-4">
                {favorites.map((favorite) => (
                  <Card key={favorite.id} className="border-2 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate mb-1">
                            {favorite.block_title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {favorite.scope === 'apporteurs-nationaux' ? 'Guide Apporteurs' : 'Guide Apogée'} 
                            {' • '}
                            {new Date(favorite.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleNavigateToSection(favorite)}
                            variant="outline"
                            size="icon"
                            title="Voir la section"
                            className="border-helpconfort-blue-main hover:bg-helpconfort-blue-main hover:text-white transition-all duration-200"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleRemoveFavorite(favorite.id)}
                            variant="outline"
                            size="icon"
                            title="Retirer des favoris"
                            className="border-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
