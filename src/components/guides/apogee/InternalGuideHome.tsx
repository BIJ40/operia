/**
 * InternalGuideHome - Page d'accueil du Guide Apogée interne
 */

import { BookOpen, Search, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { useEditor } from '@/contexts/EditorContext';
import { useInternalGuideTabs } from './InternalGuideTabsContext';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export function InternalGuideHome() {
  const { blocks } = useEditor();
  const { openTab } = useInternalGuideTabs();
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-helpconfort-blue to-helpconfort-blue/80 flex items-center justify-center shadow-lg">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guide Apogée</h1>
          <p className="text-muted-foreground mt-1">
            Toutes les informations pour maîtriser le logiciel Apogée
          </p>
        </div>
      </div>

      {/* Avertissement version en cours */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
          <span className="font-semibold">⚠️ En cours de rédaction</span> — Ce manuel est mis à jour au fur et à mesure de l'évolution du logiciel.
        </p>
      </div>

      {/* Barre de recherche */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder="Rechercher une catégorie ou section..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Navigation rapide */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Accès rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filteredCategories.slice(0, 6).map(category => {
            const Icon = getIcon(category.icon);
            const isCustomImage = category.icon?.startsWith('http://') || category.icon?.startsWith('https://');
            
            return (
              <button
                key={category.id}
                onClick={() => openTab(category.slug, category.title, Icon)}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-left group"
              >
                {isCustomImage && category.icon ? (
                  <img src={category.icon} alt="" className="w-5 h-5 object-contain" />
                ) : (
                  <Icon className="w-5 h-5 text-primary" />
                )}
                <span className="text-sm font-medium truncate">{category.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Guide d'utilisation */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-medium text-sm">💡 Comment naviguer</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Cliquez sur une catégorie dans le <strong>menu à gauche</strong> pour l'ouvrir dans un nouvel onglet</li>
          <li>• Glissez-déposez les onglets pour les réorganiser</li>
          <li>• Fermez les onglets avec le bouton ✕</li>
        </ul>
      </div>
    </div>
  );
}
