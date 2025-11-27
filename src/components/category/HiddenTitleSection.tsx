import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2 } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Section, CategoryBlock } from './types';
import { Block } from '@/types/block';

interface HiddenTitleSectionProps {
  section: Section;
  category: CategoryBlock;
  isEditMode: boolean;
  isAdmin: boolean;
  availableCategories: Block[];
  dragAttributes: Record<string, any>;
  dragListeners: Record<string, any> | undefined;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onDuplicate: (sectionId: string) => void;
  onMoveToCategory: (sectionId: string, categoryId: string) => void;
  onAddSection: (afterSectionId: string) => void;
  onAddTips: (afterSectionId: string) => void;
}

export function HiddenTitleSection({
  section,
  category,
  isEditMode,
  isAdmin,
  availableCategories,
  dragAttributes,
  dragListeners,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveToCategory,
  onAddSection,
  onAddTips,
}: HiddenTitleSectionProps) {
  return (
    <div className="rounded-lg border-2 border-border bg-card shadow-sm p-6">
      {isEditMode && isAdmin && (
        <div className="flex gap-2 mb-4 justify-end bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-move"
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
            onClick={() => onAddSection(section.id)}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Insérer un TIPS après"
            onClick={() => onAddTips(section.id)}
          >
            <Lightbulb className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onEdit(section.id)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            title="Dupliquer la section"
            onClick={() => onDuplicate(section.id)}
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
            onClick={() => onDelete(section.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <div
        className="prose prose-sm max-w-none break-words overflow-visible dark:prose-invert"
        dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
      />
    </div>
  );
}
