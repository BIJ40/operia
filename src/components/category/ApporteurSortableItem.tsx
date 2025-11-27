import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit2, Trash2, ChevronDown, FolderInput } from 'lucide-react';
import { createSanitizedHtml } from '@/lib/sanitize';
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
import { Section } from './types';
import { Block } from '@/types/block';

interface ApporteurSortableItemProps {
  section: Section;
  subcategory: Block;
  availableSubcategories: Block[];
  isEditMode: boolean;
  editingId: string | null;
  onEdit: (sectionId: string) => void;
  onDelete: (sectionId: string) => void;
  onMoveToSubcategory: (sectionId: string, subcategoryId: string) => void;
}

export function ApporteurSortableItem({
  section,
  subcategory,
  availableSubcategories,
  isEditMode,
  editingId,
  onEdit,
  onDelete,
  onMoveToSubcategory,
}: ApporteurSortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: editingId !== null });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms ease',
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const EditControls = ({ className = "" }: { className?: string }) => (
    <div className={`flex gap-2 bg-background/95 backdrop-blur-sm rounded-lg p-1 shadow-sm ${className}`}>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="cursor-move"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="ghost" title="Changer de sous-catégorie">
            <FolderInput className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border shadow-md z-[200]">
          {availableSubcategories
            .filter(sub => sub.id !== subcategory?.id)
            .map((sub) => (
              <DropdownMenuItem key={sub.id} onClick={() => onMoveToSubcategory(section.id, sub.id)}>
                {sub.title}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(section.id)}>
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => onDelete(section.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  // Hidden title section
  if (section.hideTitle && !section.hideFromSidebar && section.contentType !== 'tips') {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <div className="rounded-lg border-2 border-border bg-card shadow-sm p-6">
          {isEditMode && <EditControls className="mb-4 justify-end" />}
          <div
            className="prose prose-sm max-w-none break-words overflow-visible dark:prose-invert"
            dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
          />
        </div>
      </div>
    );
  }

  // Fixed section or TIPS
  if (section.isSingleSection || section.hideFromSidebar) {
    const isTips = section.hideFromSidebar || section.contentType === 'tips';
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <div className={`rounded-3xl relative border-2 ${isTips ? 'border-[#0096D6]' : 'border-accent'} bg-card p-6 shadow-sm overflow-hidden`}>
          {isEditMode && <EditControls className="absolute top-2 right-2" />}
          {!section.hideTitle && section.title && section.title.trim() !== '' ? (
            <h3 className="text-lg font-semibold mb-4 text-foreground">{section.title}</h3>
          ) : !section.hideTitle && isTips ? (
            <h3 className="text-lg font-semibold mb-4 text-foreground">💡 Information / Astuce</h3>
          ) : null}
          <div 
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
          />
        </div>
      </div>
    );
  }

  // Normal accordion section
  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={section.slug} id={section.slug}>
        <AccordionTrigger>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 flex-1">
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
              <h2 className="text-xl font-semibold text-left">{section.title}</h2>
            </div>
            {isEditMode && (
              <div 
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              >
                <EditControls />
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
    </div>
  );
}
