import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, ExternalLink, Lightbulb, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { createSanitizedHtml } from '@/lib/sanitize';
import { ROUTES } from '@/config/routes';
import { logError } from '@/lib/logger';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  content_type: string;
}

interface CategoryGroup {
  categorySlug: string;
  categoryTitle: string;
  favorites: FavoriteWithContent[];
}

export default function Favorites() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteWithContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(ROUTES.home);
      return;
    }
    
    loadFavorites();
  }, [isAuthenticated, user]);

  const loadFavorites = async () => {
    if (!user) return;

    try {
      // Charger les favoris (uniquement Academy: apogee et apporteurs-nationaux)
      const { data: favoritesData, error: favoritesError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .in('scope', ['apogee', 'apporteurs-nationaux'])
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
        .select('id, content, color_preset, content_type')
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
          content_type: block?.content_type || 'section',
        };
      });

      setFavorites(favoritesWithContent);

      // Récupérer les titres des catégories depuis blocks
      const categorySlugSet = new Set(favoritesWithContent.map(f => f.category_slug));
      const categorySlugs = Array.from(categorySlugSet);
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('blocks')
        .select('slug, title')
        .in('slug', categorySlugs)
        .eq('type', 'category');

      if (categoriesError) throw categoriesError;

      // Créer une map des catégories
      const categoriesMap = new Map(
        categoriesData?.map(cat => [cat.slug, cat.title]) || []
      );

      // Grouper les favoris par catégorie
      const groups: CategoryGroup[] = [];
      categorySlugs.forEach(slug => {
        const categoryFavorites = favoritesWithContent.filter(f => f.category_slug === slug);
        if (categoryFavorites.length > 0) {
          groups.push({
            categorySlug: slug,
            categoryTitle: categoriesMap.get(slug) || slug,
            favorites: categoryFavorites,
          });
        }
      });

      // Trier les groupes par nombre de favoris (décroissant)
      groups.sort((a, b) => b.favorites.length - a.favorites.length);
      setCategoryGroups(groups);

      // Ouvrir la première catégorie par défaut
      if (groups.length > 0) {
        setOpenCategories([groups[0].categorySlug]);
      }
    } catch (error) {
      logError('FAVORITES', 'Erreur chargement favoris', { error });
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
      logError('FAVORITES', 'Erreur suppression favori', { error });
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le favori',
        variant: 'destructive',
      });
    }
  };

  const handleNavigateToSection = (favorite: Favorite) => {
    let basePath: string = ROUTES.academy.apogee;
    if (favorite.scope === 'apporteurs-nationaux') basePath = ROUTES.academy.apporteurs;
    else if (favorite.scope === 'helpconfort') basePath = ROUTES.academy.documents;
    navigate(`${basePath}/category/${favorite.category_slug}#${favorite.block_id}`);
  };

  const getScopeLabel = (scope: string) => {
    if (scope === 'apporteurs-nationaux') return 'Apporteurs Nationaux';
    if (scope === 'helpconfort') return 'Base documentaire';
    return 'Guide Apogée';
  };

  if (!isAuthenticated) {
    return null;
  }

  const getColorClasses = (colorPreset: string) => {
    const colorMap: Record<string, string> = {
      white: 'bg-gradient-to-r from-muted to-muted/80',
      blue: 'bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark',
      orange: 'bg-gradient-to-r from-helpconfort-orange to-helpconfort-orange-light',
      green: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      yellow: 'bg-gradient-to-r from-amber-400 to-amber-500',
      red: 'bg-gradient-to-r from-red-500 to-red-600',
    };
    return colorMap[colorPreset] || 'bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark';
  };

  return (
    <div className="container max-w-4xl mx-auto p-8">
      <PageHeader
        title="Mes Favoris"
        subtitle="Vos sections favorites pour un accès rapide"
        backTo={ROUTES.academy.index}
        backLabel="Help! Academy"
      />

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
          <Button onClick={() => navigate(ROUTES.academy.index)} variant="outline">
            Parcourir les guides
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryGroups.map((group) => (
            <Collapsible
              key={group.categorySlug}
              open={openCategories.includes(group.categorySlug)}
              onOpenChange={(open) => {
                setOpenCategories(prev => 
                  open 
                    ? [...prev, group.categorySlug]
                    : prev.filter(slug => slug !== group.categorySlug)
                );
              }}
            >
              <div className="border-2 border-helpconfort-orange rounded-lg overflow-hidden">
                <CollapsibleTrigger className="w-full bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white p-4 hover:opacity-90 transition-opacity cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-5 h-5 transition-transform ${openCategories.includes(group.categorySlug) ? 'rotate-180' : ''}`} />
                      <h2 className="text-xl font-bold">{group.categoryTitle}</h2>
                      <Badge className="bg-white/20 text-white border-white/30">
                        {group.favorites.length} favori{group.favorites.length > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="p-4 bg-card space-y-3">
                    <Accordion type="multiple">
                      {group.favorites.map((favorite) => {
                        const colorClasses = getColorClasses(favorite.color_preset);
                        const isTips = favorite.content_type === 'tips';

                        return (
                          <AccordionItem 
                            key={favorite.id} 
                            value={favorite.id}
                            className="border-0 mb-3 last:mb-0"
                          >
                            <div className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow border-2 border-helpconfort-orange">
                              <div className={`${colorClasses} px-6 py-4`}>
                                <div className="flex items-center justify-between w-full gap-4">
                                  <AccordionTrigger className="flex-1 hover:no-underline p-0 [&>svg]:hidden">
                                    <div className="flex items-center gap-3 flex-1">
                                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center gap-1 shrink-0">
                                        {getScopeLabel(favorite.scope)}
                                      </Badge>
                                      <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center gap-1 shrink-0">
                                        {group.categoryTitle}
                                      </Badge>
                                      {isTips && (
                                        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30 flex items-center gap-1">
                                          <Lightbulb className="w-3 h-3" />
                                          TIPS
                                        </Badge>
                                      )}
                                      <h3 className="text-lg font-semibold text-white text-left hover:underline">
                                        {favorite.block_title}
                                      </h3>
                                    </div>
                                  </AccordionTrigger>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                      onClick={() => handleNavigateToSection(favorite)}
                                      variant="ghost"
                                      size="icon"
                                      title="Voir dans la catégorie"
                                      aria-label="Voir dans la catégorie"
                                      className="text-white hover:bg-white/20 h-8 w-8"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() => handleRemoveFavorite(favorite.id)}
                                      variant="ghost"
                                      size="icon"
                                      title="Retirer des favoris"
                                      aria-label="Retirer des favoris"
                                      className="text-white hover:bg-red-500/80 h-8 w-8"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <ChevronDown className="w-5 h-5 text-white transition-transform [&[data-state=open]]:rotate-180" />
                                  </div>
                                </div>
                              </div>
                              <AccordionContent className="bg-card border-t-2 border-helpconfort-orange">
                                <div className="p-6">
                                  <div
                                    className="prose prose-sm max-w-none break-words overflow-visible"
                                    dangerouslySetInnerHTML={createSanitizedHtml(favorite.content)}
                                  />
                                </div>
                              </AccordionContent>
                            </div>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
