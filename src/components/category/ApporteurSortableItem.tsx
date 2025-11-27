import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Edit2, Trash2, ChevronDown, FolderInput, Clock, Sparkles } from 'lucide-react';
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

// Helper to check if section is new (completed within 7 days)
const isSectionNew = (completedAt?: string) => {
  if (!completedAt) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return new Date(completedAt) > sevenDaysAgo;
};

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

  const isNew = isSectionNew(section.completedAt);

  // Unified toolbar style matching AccordionSection
  const EditControls = ({ variant = "light" }: { variant?: "light" | "dark" }) => {
    const isDark = variant === "dark";
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={`cursor-move h-8 w-8 p-0 ${isDark ? 'text-white hover:bg-white/20' : 'hover:bg-muted'}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              type="button" 
              size="sm" 
              variant="ghost" 
              title="Changer de sous-catégorie"
              className={`h-8 w-8 p-0 ${isDark ? 'text-white hover:bg-white/20' : 'hover:bg-muted'}`}
            >
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
        <Button 
          type="button" 
          size="sm" 
          variant="ghost" 
          onClick={() => onEdit(section.id)}
          className={`h-8 w-8 p-0 ${isDark ? 'text-white hover:bg-white/20' : 'hover:bg-muted'}`}
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button 
          type="button" 
          size="sm" 
          variant="ghost" 
          onClick={() => onDelete(section.id)}
          className={`h-8 w-8 p-0 ${isDark ? 'text-white hover:bg-red-500/80' : 'hover:bg-destructive/20'}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  // Badges component
  const SectionBadges = () => (
    <>
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
    </>
  );

  // Hidden title section
  if (section.hideTitle && !section.hideFromSidebar && section.contentType !== 'tips') {
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <div className="rounded-2xl border-2 border-l-4 border-helpconfort-orange/40 border-l-primary bg-card shadow-sm p-6 hover:border-helpconfort-orange/60 hover:shadow-md transition-all">
          {isEditMode && (
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <SectionBadges />
              </div>
              <EditControls variant="light" />
            </div>
          )}
          {!isEditMode && (section.isInProgress || isNew) && (
            <div className="flex gap-2 mb-4">
              <SectionBadges />
            </div>
          )}
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
    return (
      <div ref={setNodeRef} style={style} className="mb-4">
        <div className="rounded-2xl overflow-hidden border-2 border-l-4 border-primary/40 border-l-helpconfort-orange bg-card shadow-sm hover:border-primary/60 hover:shadow-md transition-all">
          <div className="p-6 bg-gradient-to-r from-helpconfort-orange/20 to-helpconfort-orange/10 relative">
            {isEditMode && (
              <div className="absolute top-2 right-2">
                <EditControls variant="light" />
              </div>
            )}
            <div className="flex items-center gap-2">
              {!section.hideTitle && section.title && section.title.trim() !== '' ? (
                <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
              ) : !section.hideTitle ? (
                <h3 className="text-lg font-semibold text-foreground">💡 Information / Astuce</h3>
              ) : null}
              <SectionBadges />
            </div>
          </div>
          <div className="p-6 bg-card">
            <div 
              className="prose prose-sm max-w-none break-words overflow-visible"
              dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
            />
          </div>
        </div>
      </div>
    );
  }

  // Normal accordion section
  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={section.slug} id={section.slug}>
        <AccordionTrigger>
          <div className="flex items-center justify-between w-full text-foreground">
            <div className="flex items-center gap-3 flex-1">
              <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform duration-200" />
              <h2 className="text-xl font-semibold text-left text-foreground">{section.title}</h2>
              <SectionBadges />
            </div>
            {isEditMode && (
              <div 
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              >
                <EditControls variant="light" />
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
