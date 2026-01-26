/**
 * PublicApogeeGuide - Page d'index du Guide Apogée public
 * Affiche les catégories en mode lecture seule
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { Input } from '@/components/ui/input';
import { Search, Clock, Ban, BookOpen } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Block } from '@/types/block';

export default function PublicApogeeGuide() {
  const { blocks, loading } = usePublicEditor();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer uniquement les catégories Apogée (exclure FAQ et HelpConfort)
  const apogeeCategories = useMemo(() => 
    blocks
      .filter(b => 
        b.type === 'category' && 
        b.slug !== 'faq' && 
        !b.title.toLowerCase().includes('faq') && 
        !b.slug.startsWith('helpconfort-')
      )
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  // Helper pour calculer les badges de catégorie
  const getCategoryBadges = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return (categoryId: string, category: Block) => {
      const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
      const hasInProgress = sections.some(s => s.isInProgress);
      const hasNew = sections.some(s => {
        if (!s.completedAt) return false;
        return new Date(s.completedAt) > sevenDaysAgo;
      });
      const isEmpty = category.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
      return { hasInProgress, hasNew, isEmpty };
    };
  }, [blocks]);

  const IconComponent = (iconName: string) => {
    const Icon = (Icons as any)[iconName] || Icons.BookOpen;
    return Icon;
  };

  const filteredCategories = searchTerm 
    ? apogeeCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : apogeeCategories;

  // Skeleton loader
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="h-10 w-96 bg-muted animate-pulse rounded mx-auto mb-3" />
          <div className="h-6 w-64 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="max-w-md mx-auto mb-8">
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/80 flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Guide Apogée</h1>
        <p className="text-muted-foreground mb-4">
          Toutes les informations pour maîtriser le logiciel Apogée
        </p>
        
        {/* Avertissement version préliminaire */}
        <div className="max-w-2xl mx-auto bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            <span className="font-semibold">⚠️ Version préliminaire</span> — Ce manuel d'utilisation d'Apogée est en cours de réalisation et mis à jour au fur et à mesure de l'évolution du logiciel. Si une information est manquante, erronée ou obsolète, merci de <span className="font-medium">prévenir le franchiseur</span>.
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
            📬 Prochainement, vous aurez la possibilité de créer un ticket, poser des questions et proposer des améliorations via un support interne.
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-8 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Rechercher une catégorie ou section..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grille de catégories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(category => {
          const badges = getCategoryBadges(category.id, category);
          const Icon = IconComponent(category.icon || 'BookOpen');
          const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');

          const tileClass = badges.isEmpty 
            ? "bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60"
            : "bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border-helpconfort-blue/20 border-l-helpconfort-blue hover:from-helpconfort-blue/15 hover:via-helpconfort-blue/8 hover:border-helpconfort-blue/30 hover:shadow-lg";

          return (
            <Link
              key={category.id}
              to={`/guide-apogee/category/${category.slug}`}
              className={`group relative border-2 border-l-4 rounded-full px-4 py-2 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center gap-3 overflow-visible ${tileClass}`}
            >
              {/* Badge Vide */}
              {badges.isEmpty && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1 border border-muted-foreground/30">
                    <Ban className="w-3 h-3" />
                    Vide
                  </div>
                </div>
              )}

              {/* Badge NEW */}
              {badges.hasNew && !badges.isEmpty && (
                <div className="absolute -top-2 left-3/4 -translate-x-1/2 w-16 h-16 overflow-hidden z-20 pointer-events-none">
                  <div className="absolute top-3 -left-5 w-20 bg-green-500 text-white text-[10px] font-bold py-0.5 text-center transform -rotate-45 shadow-md">
                    NEW
                  </div>
                </div>
              )}

              {/* Badge En cours */}
              {badges.hasInProgress && !badges.isEmpty && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="bg-helpconfort-blue text-white text-xs font-semibold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    En cours
                  </div>
                </div>
              )}

              {/* Icône */}
              {isCustomImage && category.icon ? (
                <img 
                  src={category.icon} 
                  alt={category.title} 
                  className="w-6 h-6 object-contain flex-shrink-0" 
                />
              ) : (
                <Icon className="w-6 h-6 text-primary flex-shrink-0" />
              )}

              {/* Titre */}
              {category.showTitleOnCard !== false && (
                <span className="text-base font-medium text-foreground truncate">
                  {category.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchTerm ? 'Aucun résultat pour cette recherche' : 'Aucune catégorie disponible'}
          </p>
        </div>
      )}
    </div>
  );
}
