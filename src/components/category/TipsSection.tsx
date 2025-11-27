import { Button } from '@/components/ui/button';
import { GripVertical, Plus, Lightbulb, Edit2, Copy, FolderInput, Trash2 } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
import { FavoriteButton } from '@/components/FavoriteButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Section, CategoryBlock } from './types';
import { Block } from '@/types/block';

interface TipsSectionProps {
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

export function TipsSection({
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
}: TipsSectionProps) {
  const isTips = section.contentType === 'tips';

  return (
    <div className={`rounded-3xl overflow-hidden border-2 ${isTips ? 'border-[#0096D6]' : 'border-accent'} bg-card shadow-sm`}>
      <div className="p-6 bg-gradient-to-r from-helpconfort-blue-light to-helpconfort-blue-dark text-white relative">
        {isEditMode && isAdmin && (
          <div className="absolute top-2 right-2 flex gap-2 z-10">
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
              onClick={() => onAddSection(section.id)}
            >
              <Plus className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Insérer un TIPS après"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              onClick={() => onAddTips(section.id)}
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              onClick={() => onEdit(section.id)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Dupliquer la section"
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
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
              onClick={() => onDelete(section.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!isEditMode && !isAdmin && isTips && (
          <div className="absolute top-2 right-2">
            <FavoriteButton
              blockId={section.id}
              blockTitle={section.title || 'TIPS'}
              blockSlug={section.slug}
              categorySlug={category.slug}
              scope="apogee"
            />
          </div>
        )}
        {!section.hideTitle && section.title && section.title.trim() !== '' && section.contentType !== 'tips' ? (
          <div className="flex items-center justify-between gap-2 w-full">
            <h3 className="text-lg font-semibold text-white flex-1">{section.title}</h3>
            {!isEditMode && !isAdmin && (
              <FavoriteButton
                blockId={section.id}
                blockTitle={section.title}
                blockSlug={section.slug}
                categorySlug={category.slug}
                scope="apogee"
              />
            )}
          </div>
        ) : null}
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
