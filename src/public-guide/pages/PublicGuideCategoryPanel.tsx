/**
 * PublicGuideCategoryPanel - Contenu d'une catégorie (dans un onglet)
 * Mode lecture seule avec accordéons pour les sections
 */

import { useMemo, useState } from 'react';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { usePublicGuideTabs } from '../contexts/PublicGuideTabsContext';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsDownUp, 
  ChevronsUpDown,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Block } from '@/types/block';
import { createSanitizedHtml } from '@/lib/sanitize';
import { cn } from '@/lib/utils';

// Couleurs pour les TIPS
const TIPS_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  danger: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-l-red-500', icon: 'text-red-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-l-amber-500', icon: 'text-amber-500' },
  success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-l-green-500', icon: 'text-green-500' },
  information: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-l-blue-500', icon: 'text-blue-500' },
};

interface PublicGuideCategoryPanelProps {
  slug: string;
}

export default function PublicGuideCategoryPanel({ slug }: PublicGuideCategoryPanelProps) {
  const { blocks, loading } = usePublicEditor();
  const { openTab } = usePublicGuideTabs();
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);

  // Trouver la catégorie
  const category = useMemo(() => 
    blocks.find(b => b.type === 'category' && b.slug === slug),
    [blocks, slug]
  );

  // Catégories pour navigation précédent/suivant
  const availableCategories = useMemo(() =>
    blocks
      .filter(b => 
        b.type === 'category' && 
        !b.title.toLowerCase().includes('faq') && 
        !b.slug.startsWith('helpconfort-')
      )
      .sort((a, b) => a.order - b.order),
    [blocks]
  );

  const currentCategoryIndex = useMemo(() => 
    availableCategories.findIndex(c => c.slug === slug),
    [availableCategories, slug]
  );

  const prevCategory = currentCategoryIndex > 0 ? availableCategories[currentCategoryIndex - 1] : null;
  const nextCategory = currentCategoryIndex < availableCategories.length - 1 ? availableCategories[currentCategoryIndex + 1] : null;

  // Sections de cette catégorie
  const sections = useMemo(() => 
    blocks
      .filter(b => b.parentId === category?.id && b.type === 'section')
      .sort((a, b) => a.order - b.order),
    [blocks, category?.id]
  );

  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      if (section.contentType === 'tips') return showTips;
      return showSections;
    });
  }, [sections, showTips, showSections]);

  const getIcon = (iconName?: string): LucideIcon => {
    if (!iconName) return BookOpen;
    if (iconName.startsWith('http://') || iconName.startsWith('https://')) return BookOpen;
    const IconsRecord = Icons as unknown as Record<string, LucideIcon>;
    const Icon = IconsRecord[iconName];
    return Icon || BookOpen;
  };

  const handleNavigateCategory = (cat: Block) => {
    const Icon = getIcon(cat.icon);
    openTab(cat.slug, cat.title, Icon);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded mb-6" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Catégorie non trouvée</p>
      </div>
    );
  }

  const renderSectionContent = (section: Block) => {
    const isTips = section.contentType === 'tips';
    const tipsType = section.tipsType || 'information';
    const colors = TIPS_COLORS[tipsType] || TIPS_COLORS.information;

    if (isTips) {
      return (
        <div className={cn(
          "rounded-lg border-l-4 p-4",
          colors.bg,
          colors.border
        )}>
          <div className="flex items-start gap-3">
            <Lightbulb className={cn("w-5 h-5 mt-0.5 flex-shrink-0", colors.icon)} />
            <div 
              className="prose prose-sm dark:prose-invert max-w-none flex-1"
              dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
            />
          </div>
        </div>
      );
    }

    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
      />
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header avec navigation */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 -mt-2 pt-2">
        <div className="flex items-center justify-between gap-2">
          {/* Zone gauche - Navigation */}
          <div className="flex items-center gap-1 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    disabled={!prevCategory}
                    onClick={() => prevCategory && handleNavigateCategory(prevCategory)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                {prevCategory && (
                  <TooltipContent side="bottom">
                    {prevCategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Zone centrale - Titre */}
          <h1 className="text-xl font-bold text-foreground truncate flex-1 min-w-0 text-center">
            {category.title}
          </h1>
          
          {/* Zone droite - Progress + Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentCategoryIndex + 1) / availableCategories.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
              {currentCategoryIndex + 1}/{availableCategories.length}
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    disabled={!nextCategory}
                    onClick={() => nextCategory && handleNavigateCategory(nextCategory)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                {nextCategory && (
                  <TooltipContent side="bottom">
                    {nextCategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        {/* Boutons de filtrage */}
        <div className="flex items-center justify-end gap-1 mt-3 flex-wrap">
          {hasTips && (
            <Button
              variant={showTips ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTips(!showTips)}
              className="gap-1 h-7 text-xs"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              TIPS
            </Button>
          )}
          {hasSections && (
            <Button
              variant={showSections ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSections(!showSections)}
              className="gap-1 h-7 text-xs"
            >
              Sections
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.id))}
            className="gap-1 h-7 text-xs"
          >
            {openAccordions.length > 0 ? (
              <><ChevronsDownUp className="h-3.5 w-3.5" />Fermer</>
            ) : (
              <><ChevronsUpDown className="h-3.5 w-3.5" />Ouvrir</>
            )}
          </Button>
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground">
            {sections.length === 0 
              ? "Aucune section dans cette catégorie" 
              : "Utilisez les boutons TIPS / Sections pour afficher le contenu"}
          </p>
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openAccordions}
          onValueChange={setOpenAccordions}
          className="space-y-3"
        >
          {filteredSections.map((section) => {
            const isTips = section.contentType === 'tips';
            
            // TIPS inline (pas d'accordéon)
            if (isTips && section.hideTitle) {
              return (
                <div key={section.id}>
                  {renderSectionContent(section)}
                </div>
              );
            }

            return (
              <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-4">
                <AccordionTrigger className="text-left py-3">
                  <div className="flex items-center gap-2">
                    {isTips && <Lightbulb className="w-4 h-4 text-warning" />}
                    <span className="text-sm">{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {renderSectionContent(section)}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
