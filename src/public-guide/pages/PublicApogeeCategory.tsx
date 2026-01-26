/**
 * PublicApogeeCategory - Page de catégorie du Guide Apogée public
 * Affiche les sections en mode lecture seule avec navigation
 */

import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { usePublicEditor } from '../contexts/PublicEditorContext';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsDownUp, 
  ChevronsUpDown,
  Lightbulb 
} from 'lucide-react';
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

export default function PublicApogeeCategory() {
  const { slug } = useParams();
  const { blocks, loading } = usePublicEditor();
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [showTips, setShowTips] = useState(true);
  const [showSections, setShowSections] = useState(true);

  // Trouver la catégorie
  const category = useMemo(() => 
    blocks.find(b => b.type === 'category' && b.slug === slug),
    [blocks, slug]
  );

  // Catégories disponibles pour navigation
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

  // Filtrage TIPS / Sections
  const hasTips = sections.some(s => s.contentType === 'tips');
  const hasSections = sections.some(s => s.contentType !== 'tips');

  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      if (section.contentType === 'tips') return showTips;
      return showSections;
    });
  }, [sections, showTips, showSections]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
        <div className="h-10 w-64 bg-muted animate-pulse rounded mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return <Navigate to="/guide-apogee" replace />;
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
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Header avec navigation */}
      <div className="sticky top-16 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Zone gauche */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/guide-apogee">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={prevCategory ? `/guide-apogee/category/${prevCategory.slug}` : '#'}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={!prevCategory}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                    </Link>
                  </span>
                </TooltipTrigger>
                {prevCategory && (
                  <TooltipContent side="bottom">
                    {prevCategory.title}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Zone centrale */}
          <h1 className="text-2xl font-bold text-foreground truncate flex-1 min-w-0">
            {category.title}
          </h1>
          
          {/* Zone droite */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentCategoryIndex + 1) / availableCategories.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
              {currentCategoryIndex + 1}/{availableCategories.length}
            </span>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Link to={nextCategory ? `/guide-apogee/category/${nextCategory.slug}` : '#'}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={!nextCategory}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </span>
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
        <div className="flex items-center justify-end gap-1 sm:gap-2 mt-2 flex-wrap">
          {hasTips && (
            <Button
              variant={showTips ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTips(!showTips)}
              className="gap-1 sm:gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              <span className="hidden sm:inline">TIPS</span>
            </Button>
          )}
          {hasSections && (
            <Button
              variant={showSections ? "default" : "outline"}
              size="sm"
              onClick={() => setShowSections(!showSections)}
              className="gap-1 sm:gap-2"
            >
              <span className="hidden sm:inline">Sections</span>
              <span className="sm:hidden">Sec.</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpenAccordions(openAccordions.length > 0 ? [] : sections.map(s => s.id))}
            className="gap-1 sm:gap-2"
          >
            {openAccordions.length > 0 ? (
              <><ChevronsDownUp className="h-4 w-4" /><span className="hidden sm:inline">Tout fermer</span></>
            ) : (
              <><ChevronsUpDown className="h-4 w-4" /><span className="hidden sm:inline">Tout ouvrir</span></>
            )}
          </Button>
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <p className="text-muted-foreground text-lg">
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
          className="space-y-4"
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
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="text-left">
                  <div className="flex items-center gap-2">
                    {isTips && <Lightbulb className="w-4 h-4 text-amber-500" />}
                    <span>{section.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
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
