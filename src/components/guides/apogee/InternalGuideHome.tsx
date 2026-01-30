/**
 * InternalGuideHome - Page d'accueil du Guide Apogée interne
 * Version Warm Pastel
 */

import { BookOpen, Search, AlertTriangle, MousePointerClick, Layers, GripVertical, Info, Sparkles, Plus, Ban, Clock } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEditor } from '@/contexts/EditorContext';
import { useInternalGuideTabs } from './InternalGuideTabsContext';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { WarmCard } from '@/components/ui/warm-card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function InternalGuideHome() {
  const { blocks, isEditMode, canEdit, addBlock } = useEditor();
  const { openTab } = useInternalGuideTabs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrer les catégories Apogée
  const categories = useMemo(() => 
    blocks
      .filter(b => 
        b.type === 'category' && 
        b.slug !== 'faq' && 
        !b.title.toLowerCase().includes('faq') && 
        !b.slug.startsWith('helpconfort-') &&
        !b.title.toLowerCase().includes('support de formation') &&
        !b.title.toLowerCase().includes('recap fiches rapides') &&
        !b.title.toLowerCase().includes('récap fiches rapides')
      )
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  // Helper pour les badges (comme dans la sidebar)
  const getCategoryBadges = useCallback((categoryId: string) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const category = blocks.find(b => b.id === categoryId);
    const sections = blocks.filter(b => b.parentId === categoryId && b.type === 'section');
    const hasInProgress = sections.some(s => s.isInProgress);
    const hasNew = sections.some(s => {
      if (!s.completedAt) return false;
      return new Date(s.completedAt) > sevenDaysAgo;
    });
    const isEmpty = category?.isEmpty || (sections.length > 0 && sections.every(s => s.isEmpty));
    return { hasInProgress, hasNew, isEmpty };
  }, [blocks]);

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) return BookOpen;
    const IconsRecord = Icons as unknown as Record<string, LucideIcon>;
    return IconsRecord[iconName] || BookOpen;
  };

  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    return categories.filter(cat => {
      const matchesTitle = cat.title.toLowerCase().includes(searchTerm.toLowerCase());
      const sections = blocks.filter(b => b.type === 'section' && b.parentId === cat.id);
      const matchesSection = sections.some(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTitle || matchesSection;
    });
  }, [categories, blocks, searchTerm]);

  // Ajouter une nouvelle catégorie
  const handleAddCategory = useCallback(async () => {
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(c => c.order)) : 0;
    
    await addBlock({
      type: 'category',
      title: 'Nouvelle catégorie',
      slug: `category-${Date.now()}`,
      content: '',
      order: maxOrder + 1,
      colorPreset: 'white',
      icon: 'BookOpen',
      attachments: [],
    });

    toast({ title: 'Catégorie créée' });
  }, [categories, addBlock, toast]);

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-warm-blue/20 to-warm-teal/10 mb-4 shadow-warm">
          <BookOpen className="w-8 h-8 text-warm-blue" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Guide Apogée</h1>
        <p className="text-muted-foreground text-lg">
          Toutes les informations pour maîtriser le logiciel Apogée
        </p>
      </div>

      {/* Avertissement - masqué en mode édition pour plus de place */}
      {!isEditMode && (
        <WarmCard 
          variant="gradient" 
          accentColor="orange" 
          className="mb-6"
          icon={AlertTriangle}
          title="En cours de rédaction"
          description="Ce manuel est mis à jour au fur et à mesure de l'évolution du logiciel."
        >
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              La <span className="font-medium text-foreground">version complète</span> sera livrée prochainement avec :
            </p>
            <ul className="text-muted-foreground space-y-1.5 ml-1">
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
                Un support d'utilisation détaillé
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
                Un suivi des tickets ouverts
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-warm-orange" />
                Une FAQ interactive
              </li>
            </ul>
          </div>
        </WarmCard>
      )}

      {/* Barre de recherche */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Rechercher une catégorie ou section..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 rounded-xl border-border/50 bg-background/60 focus:border-warm-blue/50"
        />
      </div>

      {/* Grille des catégories - visible en mode édition */}
      {isEditMode && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-warm-blue" />
            Catégories ({filteredCategories.length})
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCategories.map(category => {
              const Icon = getIcon(category.icon);
              const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
              const badges = getCategoryBadges(category.id);
              
              return (
                <button
                  key={category.id}
                  onClick={() => openTab(category.slug, category.title, Icon)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left",
                    "hover:bg-warm-blue/5 hover:border-warm-blue/30 hover:shadow-sm",
                    "bg-background/60",
                    badges.isEmpty && "border-dashed border-warm-orange/40 opacity-70"
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-warm-blue/10 flex items-center justify-center shrink-0">
                    {isCustomImage ? (
                      <img src={category.icon} alt="" className="w-5 h-5 object-contain" />
                    ) : (
                      <Icon className="w-5 h-5 text-warm-blue" />
                    )}
                  </div>
                  <span className="flex-1 font-medium text-sm truncate">{category.title}</span>
                  
                  {/* Badges */}
                  {badges.isEmpty && (
                    <Ban className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  )}
                  {badges.hasNew && !badges.isEmpty && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-warm-green/20 text-warm-green rounded-md shrink-0">
                      NEW
                    </span>
                  )}
                  {badges.hasInProgress && !badges.isEmpty && (
                    <Clock className="w-4 h-4 text-warm-orange shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bouton Ajouter une catégorie */}
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleAddCategory} 
              size="lg" 
              className="gap-2 bg-warm-green hover:bg-warm-green/90 text-white rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Ajouter une catégorie
            </Button>
          </div>
        </div>
      )}

      {/* Comment utiliser cette interface - visible seulement en mode lecture */}
      {!isEditMode && (
        <WarmCard 
          variant="gradient" 
          accentColor="teal"
          icon={Layers}
          title="Comment naviguer"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
                <MousePointerClick className="w-5 h-5 text-warm-teal" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Ouvrir une catégorie</p>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur une catégorie dans la <span className="font-medium">sidebar à gauche</span> pour l'ouvrir dans un nouvel onglet.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-warm-teal" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Naviguer entre les onglets</p>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez ouvrir <span className="font-medium">plusieurs catégories en même temps</span> et naviguer entre elles grâce aux onglets en haut de la zone de contenu.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-warm-teal/15 flex items-center justify-center shrink-0">
                <GripVertical className="w-5 h-5 text-warm-teal" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">Réorganiser les onglets</p>
                <p className="text-sm text-muted-foreground">
                  Glissez-déposez les onglets pour les <span className="font-medium">réorganiser</span> selon vos préférences. Fermez un onglet en cliquant sur la croix (×).
                </p>
              </div>
            </div>
          </div>
        </WarmCard>
      )}
    </div>
  );
}
