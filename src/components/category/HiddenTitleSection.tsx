import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2, Clock, Sparkles } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Section, CategoryBlock } from './types';
import { Block } from '@/types/block';

// Helper to check if section is new (completed within 7 days)
const isSectionNew = (completedAt?: string) => {
  if (!completedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(completedAt) > sevenDaysAgo;
};

export interface HiddenTitleSectionProps {
  section: Section;
  category: CategoryBlock;
  isEditMode: boolean;
  /** V2: Renamed from isAdmin - indicates if user can edit content */
  canEdit: boolean;
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
  canEdit,
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
  const isNew = isSectionNew(section.completedAt);

  return (
    <div className="rounded-2xl border-2 border-l-4 border-helpconfort-orange/40 border-l-primary bg-card shadow-sm p-6 hover:border-helpconfort-orange/60 hover:shadow-md transition-all">
      {isEditMode && canEdit && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {section.isInProgress && (
              <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Clock className="w-3 h-3" />
                En cours
              </span>
            )}
            {isNew && !section.isInProgress && (
              <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                New
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="cursor-move h-8 w-8 p-0"
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
              className="h-8 w-8 p-0"
              onClick={() => onAddSection(section.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insérer un TIPS après"
              className="h-8 w-8 p-0"
              onClick={() => onAddTips(section.id)}
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onEdit(section.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Dupliquer la section"
              className="h-8 w-8 p-0"
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
                  className="h-8 w-8 p-0"
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
              className="h-8 w-8 p-0 hover:bg-destructive/20"
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      {!isEditMode && (section.isInProgress || isNew) && (
        <div className="flex gap-2 mb-4">
          {section.isInProgress && (
            <span className="bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
              <Clock className="w-3 h-3" />
              En cours
            </span>
          )}
          {isNew && !section.isInProgress && (
            <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          )}
        </div>
      )}
      <div
        className="prose prose-sm max-w-none break-words overflow-visible dark:prose-invert"
        dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
      />
    </div>
  );
}
