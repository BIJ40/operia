import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2, Clock, Sparkles } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Section, CategoryBlock, CategoryScope } from './types';
import { Block } from '@/types/block';

// Helper to check if section is new (completed within 7 days)
const isSectionNew = (completedAt?: string) => {
  if (!completedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(completedAt) > sevenDaysAgo;
};

export interface TipsSectionProps {
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

export function TipsSection({
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
}: TipsSectionProps) {
  const isTips = section.contentType === 'tips';
  const isNew = isSectionNew(section.completedAt);

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-l-4 border-primary/40 border-l-helpconfort-orange bg-card shadow-sm hover:border-primary/60 hover:shadow-md transition-all">
      <div className="p-6 bg-gradient-to-r from-helpconfort-orange/20 to-helpconfort-orange/10 text-foreground relative">
        {isEditMode && canEdit && (
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="cursor-move text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
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
              className="text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
              onClick={() => onAddSection(section.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insérer un TIPS après"
              className="text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
              onClick={() => onAddTips(section.id)}
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
              onClick={() => onEdit(section.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Dupliquer la section"
              className="text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
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
                  className="text-foreground hover:bg-helpconfort-orange/20 h-8 w-8 p-0"
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
              className="text-foreground hover:bg-red-500/20 hover:text-red-600 h-8 w-8 p-0"
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {!section.hideTitle && section.title && section.title.trim() !== '' && section.contentType !== 'tips' ? (
            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
          ) : null}
          {/* Section badges */}
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
      </div>
      <div className="p-6 bg-card">
        <div
          className="prose prose-sm max-w-none break-words overflow-visible"
          dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
        />
      </div>
    </div>
  );
}
