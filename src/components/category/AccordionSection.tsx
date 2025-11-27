import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2, ChevronDown, Info } from 'lucide-react';
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Section, CategoryBlock, CategoryScope } from './types';
import { Block } from '@/types/block';

interface AccordionSectionProps {
  section: Section;
  category: CategoryBlock;
  isEditMode: boolean;
  isAdmin: boolean;
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
  isAdmin,
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
  return (
    <AccordionItem value={section.id} id={section.id}>
      <AccordionTrigger>
        <div className="flex items-center justify-between w-full text-white">
          <div className="flex items-center gap-3 flex-1">
            {section.showSummary && section.summary ? (
              <HoverCard openDelay={200}>
                <HoverCardTrigger asChild>
                  <div 
                    className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white shrink-0 cursor-help"
                    onClick={(e) => {
                      if (isEditMode && isAdmin) {
                        e.stopPropagation();
                        e.preventDefault();
                        onEdit(section.id);
                      }
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-[500px] bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200" side="right">
                  <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">{section.summary}</p>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-white transition-transform duration-200" />
            )}
            <h2 className="text-xl font-semibold text-left text-white">
              {section.title}
            </h2>
            {!isEditMode && !isAdmin && (
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
          {isEditMode && isAdmin && (
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
                className="cursor-move text-white hover:bg-white/20 h-8 w-8 p-0"
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
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                className="text-white hover:bg-red-500/80 h-8 w-8 p-0"
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
      <AccordionContent>
        <div
          className="prose prose-sm max-w-none text-foreground px-1 py-2 break-words overflow-visible"
          dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
