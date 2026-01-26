/**
 * PublicGuideHome - Page d'accueil du Guide Apogée (dans un onglet)
 * Version allégée car la sidebar est toujours visible
 */

import { useState, useMemo } from 'react';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { Input } from '@/components/ui/input';
import { Search, Clock, Ban, BookOpen, AlertTriangle } from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { Block } from '@/types/block';
import { cn } from '@/lib/utils';

export default function PublicGuideHome() {
  const { blocks, loading } = usePublicEditor();
  const { openTab } = usePublicGuideTabs();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les catégories Apogée
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

  // Helper pour les badges
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

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) return BookOpen;
    const IconsRecord = Icons as unknown as Record<string, LucideIcon>;
    const Icon = IconsRecord[iconName];
    return Icon || BookOpen;
  };

  const filteredCategories = searchTerm 
    ? apogeeCategories.filter(cat => {
        const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
        const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
        const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTitle || matchesSection;
      })
    : apogeeCategories;

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="h-8 w-64 bg-muted animate-pulse rounded mx-auto mb-3" />
          <div className="h-5 w-48 bg-muted animate-pulse rounded mx-auto" />
        </div>
        <div className="max-w-md mx-auto mb-6">
          <div className="h-10 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  const handleOpenCategory = (category: Block) => {
    const Icon = getIcon(category.icon);
    openTab(category.slug, category.title, Icon);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header compact */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Guide Apogée</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Toutes les informations pour maîtriser le logiciel Apogée
        </p>
      </div>

      {/* Avertissement */}
      <div className="mb-6 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              <span className="font-semibold">En cours de rédaction</span> — Ce manuel est mis à jour au fur et à mesure de l'évolution du logiciel.
            </p>
          </div>
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grille de catégories - version compacte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCategories.map(category => {
          const badges = getCategoryBadges(category.id, category);
          const Icon = getIcon(category.icon);
          const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');

          return (
            <button
              key={category.id}
              onClick={() => handleOpenCategory(category)}
              className={cn(
                'group relative border-2 border-l-4 rounded-full px-4 py-2.5 text-left',
                'hover:shadow-md hover:scale-[1.01] transition-all duration-200',
                'flex items-center gap-3 overflow-visible',
                badges.isEmpty 
                  ? 'bg-muted/50 border-muted-foreground/30 border-l-muted-foreground/50 opacity-60'
                  : 'bg-gradient-to-r from-helpconfort-blue/10 via-helpconfort-blue/5 to-transparent border-helpconfort-blue/20 border-l-helpconfort-blue hover:from-helpconfort-blue/15 hover:border-helpconfort-blue/30'
              )}
            >
              {/* Badge Vide */}
              {badges.isEmpty && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="bg-muted text-muted-foreground text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 border">
                    <Ban className="w-3 h-3" />
                    Vide
                  </div>
                </div>
              )}

              {/* Badge NEW */}
              {badges.hasNew && !badges.isEmpty && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-primary text-primary-foreground rounded shadow-sm">
                  NEW
                </span>
              )}

              {/* Badge En cours */}
              {badges.hasInProgress && !badges.isEmpty && (
                <div className="absolute -top-2 -right-2 z-20">
                  <div className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
              )}

              {/* Icône */}
              {isCustomImage && category.icon ? (
                <img
                  src={category.icon} 
                  alt={category.title} 
                  className="w-5 h-5 object-contain flex-shrink-0" 
                />
              ) : (
                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
              )}

              {/* Titre */}
              <span className="text-sm font-medium text-foreground truncate">
                {category.title}
              </span>
            </button>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'Aucun résultat pour cette recherche' : 'Aucune catégorie disponible'}
          </p>
        </div>
      )}
    </div>
  );
}
