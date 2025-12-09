import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2, ChevronDown, Info, Clock, Sparkles, Ban, RefreshCw } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Section, CategoryBlock, CategoryScope } from './types';
import { Block } from '@/types/block';
import { isSectionUpdated } from './UpdateBadge';

// Helper to check if section is new (completed within 7 days)
const isSectionNew = (completedAt?: string) => {
  if (!completedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(completedAt) > sevenDaysAgo;
};

export interface AccordionSectionProps {
  section: Section;
  category: CategoryBlock;
  isEditMode: boolean;
  /** V2: Renamed from isAdmin - indicates if user can edit content */
  canEdit: boolean;
  availableCategories: Block[];
  scope: CategoryScope;
  dragAttributes: Record<string, any>;
  dragListeners: Record<string, any> | undefined;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onMoveToCategory: (sectionId: string, categoryId: string) => void;
  onAddSection: (afterSectionId: string) => void;
  onAddTips: (afterSectionId: string) => void;
}

export function AccordionSection({
  section,
  category,
  isEditMode,
  canEdit,
  availableCategories,
  scope,
  dragAttributes,
  dragListeners,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToCategory,
  onAddSection,
  onAddTips,
}: AccordionSectionProps) {
  const isNew = isSectionNew(section.completedAt);
  const isUpdated = isSectionUpdated(section.contentUpdatedAt);
  const isEmptySection = section.isEmpty === true;
  
  return (
    <AccordionItem 
      value={section.id} 
      id={section.id}
      className={isEmptySection ? 'opacity-50' : ''}
    >
      <AccordionTrigger className={isEmptySection && !isEditMode ? 'cursor-default' : ''} disabled={isEmptySection && !isEditMode}>
        <div className="flex items-center justify-between w-full text-foreground">
          <div className="flex items-center gap-3 flex-1">
            {section.showSummary && section.summary && !isEmptySection ? (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary shrink-0 cursor-pointer hover:bg-primary/30 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className="max-w-[400px] bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 z-[100] p-3"
                  >
                    <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{section.summary}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isEmptySection ? 'text-muted-foreground' : 'text-primary'}`} />
            )}
            <h2 className={`text-xl font-semibold text-left ${isEmptySection ? 'text-muted-foreground' : 'text-foreground'}`}>
              {section.title}
            </h2>
            {/* Section badges */}
            {isEmptySection && (
              <span className="bg-muted text-muted-foreground text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Ban className="w-3 h-3" />
                Vide
              </span>
            )}
            {!isEmptySection && section.isInProgress && (
              <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Clock className="w-3 h-3" />
                En cours
              </span>
            )}
            {!isEmptySection && isNew && !section.isInProgress && (
              <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            )}
            {!isEmptySection && isUpdated && !isNew && !section.isInProgress && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                M.A.J
              </span>
            )}
            {!isEditMode && !canEdit && !isEmptySection && (
              <div onClick={(e) => e.stopPropagation()}>
                <FavoriteButton
                  blockId={section.id}
                  blockTitle={section.title}
                  blockSlug={section.slug}
                  categorySlug={category.slug}
                  scope={scope}
                />
              </div>
            )}
          </div>
            {isEditMode && canEdit && (
            <div 
              className="flex gap-2"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="cursor-move text-primary hover:bg-primary/20 h-8 w-8 p-0"
                {...dragAttributes}
                {...dragListeners}
              >
                <GripVertical className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                title="Insérer une section après"
                className="text-primary hover:bg-primary/20 h-8 w-8 p-0"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddSection(section.id);
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                title="Insérer un TIPS après"
                className="text-primary hover:bg-primary/20 h-8 w-8 p-0"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onAddTips(section.id);
                }}
              >
                <Lightbulb className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-primary hover:bg-primary/20 h-8 w-8 p-0"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(section.id);
                }}
              >
                <Edit2 className="w-4 w-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                title="Dupliquer la section"
                className="text-primary hover:bg-primary/20 h-8 w-8 p-0"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDuplicate(section.id);
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title="Changer de catégorie"
                    className="text-primary hover:bg-primary/20 h-8 w-8 p-0"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    <FolderInput className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border shadow-md z-[200]">
                  {availableCategories
                    .filter(cat => cat.id !== category?.id)
                    .map((cat) => (
                      <DropdownMenuItem
                        key={cat.id}
                        onClick={() => onMoveToCategory(section.id, cat.id)}
                      >
                        {cat.title}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/20 h-8 w-8 p-0"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete(section.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </AccordionTrigger>
      {!isEmptySection && (
        <AccordionContent>
          <div
            className="prose prose-sm max-w-none text-foreground px-1 py-2 break-words overflow-visible"
            dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
          />
        </AccordionContent>
      )}
    </AccordionItem>
  );
}
