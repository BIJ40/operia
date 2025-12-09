import { useState, useEffect } from 'react';
import { BookOpen, FileText, FolderOpen, HelpCircle, Heart } from 'lucide-react';
import { IndexTile, getVariantForIndex } from '@/components/ui/index-tile';
import { ROUTES } from '@/config/routes';
import { useMenuLabels } from '@/hooks/use-page-metadata';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';

const ROUTE_TO_PAGE_KEY: Record<string, string> = {
  [ROUTES.academy.apogee]: 'academy_apogee',
  [ROUTES.academy.apporteurs]: 'academy_apporteurs',
  [ROUTES.academy.documents]: 'academy_documents',
};

const academyModules = [
  {
    title: 'Guide Apogée',
    description: 'Guide complet pour maîtriser le logiciel Apogée',
    icon: BookOpen,
    href: ROUTES.academy.apogee,
  },
  {
    title: 'Guide Apporteurs',
    description: 'Ressources pour les apporteurs d\'affaires',
    icon: FileText,
    href: ROUTES.academy.apporteurs,
  },
  {
    title: 'Base Documentaire',
    description: 'Documents et ressources HelpConfort',
    icon: FolderOpen,
    href: ROUTES.academy.documents,
  },
];

// Tuile FAQ non cliquable pour le moment
const faqModule = {
  title: 'FAQ',
  description: 'Questions fréquentes et réponses',
  icon: HelpCircle,
  disabled: true,
};

export default function AcademyIndex() {
  const menuLabels = useMenuLabels();
  const { user, isAuthenticated } = useAuth();
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFavoritesCount();
    }
  }, [isAuthenticated, user]);

  const loadFavoritesCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('scope', ['apogee', 'apporteurs-nationaux']);
    setFavoritesCount(count || 0);
  };

  const getModuleTitle = (module: typeof academyModules[0]): string => {
    const pageKey = ROUTE_TO_PAGE_KEY[module.href];
    if (pageKey && menuLabels.has(pageKey)) {
      return menuLabels.get(pageKey)!;
    }
    return module.title;
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <PageHeader
        title="Help! Academy"
        subtitle="Documentation, guides et ressources"
        backTo="/"
        backLabel="Accueil"
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {academyModules.map((module, index) => (
          <IndexTile
            key={module.href}
            title={getModuleTitle(module)}
            description={module.description}
            icon={module.icon}
            href={module.href}
            variant={getVariantForIndex(index)}
          />
        ))}
        {/* Mes Favoris Tile */}
        {isAuthenticated && (
          <Link 
            to={ROUTES.academy.favorites}
            className="group h-full rounded-xl p-5
              bg-gradient-to-r from-helpconfort-blue-light/20 via-helpconfort-blue-light/10 to-transparent dark:from-helpconfort-blue-dark/30 dark:via-helpconfort-blue-dark/10
              border border-helpconfort-blue-light/40 dark:border-helpconfort-blue-dark/40 border-l-4 border-l-helpconfort-blue
              shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full border-2 border-helpconfort-blue-light dark:border-helpconfort-blue-dark flex items-center justify-center bg-helpconfort-blue-light/30 dark:bg-helpconfort-blue-dark/50 group-hover:scale-110 transition-transform">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500 animate-heartbeat" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">Mes Favoris</h3>
                  {favoritesCount > 0 && (
                    <Badge className="bg-pink-500 text-white text-xs">
                      {favoritesCount}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {favoritesCount === 0 
                    ? 'Ajoutez des sections en favoris' 
                    : `${favoritesCount} section${favoritesCount > 1 ? 's' : ''} sauvegardée${favoritesCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* FAQ Tile - non cliquable */}
        <div className="group h-full rounded-xl p-5
          bg-gradient-to-r from-muted/50 via-muted/30 to-transparent
          border border-muted/40 border-l-4 border-l-muted
          shadow-sm opacity-60 cursor-not-allowed">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border-2 border-muted/50 flex items-center justify-center bg-muted/30">
              <faqModule.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-muted-foreground">{faqModule.title}</h3>
                <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                  Bientôt
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground/70">{faqModule.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
