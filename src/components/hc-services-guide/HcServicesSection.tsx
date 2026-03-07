import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit, Trash2, Plus, Lightbulb, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { OperiaBlock } from '@/contexts/HcServicesEditorContext';
import { createSanitizedHtml } from '@/lib/sanitize';

interface HcServicesSectionProps {
  section: OperiaBlock;
  isEditMode: boolean;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddSection: (afterId?: string) => void;
  onAddTips: (afterId?: string) => void;
}

const TIPS_ICONS: Record<string, any> = {
  information: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

const TIPS_COLORS: Record<string, string> = {
  information: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
  warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
  success: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
};

export function HcServicesSection({
  section,
  isEditMode,
  canEdit,
  onEdit,
  onDelete,
  onAddSection,
  onAddTips,
}: HcServicesSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isTips = section.contentType === 'tips';
  const TipsIcon = isTips ? TIPS_ICONS[section.tipsType || 'information'] : null;
  const tipsColor = isTips ? TIPS_COLORS[section.tipsType || 'information'] : '';

  if (isTips) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`relative group border rounded-lg p-4 ${tipsColor}`}
      >
        {isEditMode && canEdit && (
          <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing bg-background rounded-full p-1 shadow-md"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}
        
        {isEditMode && canEdit && (
          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <Button
              onClick={() => onEdit(section.id)}
              size="icon"
              variant="outline"
              className="h-7 w-7 bg-background shadow-md"
            >
              <Edit className="w-3 h-3" />
            </Button>
            <Button
              onClick={() => onDelete(section.id)}
              size="icon"
              variant="destructive"
              className="h-7 w-7 shadow-md"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex items-start gap-3">
          {TipsIcon && <TipsIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <div 
            className="prose prose-sm dark:prose-invert max-w-none flex-1"
            dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
          />
        </div>
      </div>
    );
  }

  return (
    <AccordionItem
      value={section.id}
      ref={setNodeRef}
      style={style}
      className="relative group border rounded-lg bg-card"
    >
      {isEditMode && canEdit && (
        <div className="absolute -top-2 -left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing bg-background rounded-full p-1 shadow-md"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}
      
      {isEditMode && canEdit && (
        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            onClick={() => onAddSection(section.id)}
            size="icon"
            variant="outline"
            className="h-7 w-7 bg-background shadow-md"
            title="Ajouter une section après"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onAddTips(section.id)}
            size="icon"
            variant="outline"
            className="h-7 w-7 bg-background shadow-md"
            title="Ajouter un TIPS après"
          >
            <Lightbulb className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onEdit(section.id)}
            size="icon"
            variant="outline"
            className="h-7 w-7 bg-background shadow-md"
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            onClick={() => onDelete(section.id)}
            size="icon"
            variant="destructive"
            className="h-7 w-7 shadow-md"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <span className="text-left font-medium">{section.title}</span>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div 
          className="prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
        />
      </AccordionContent>
    </AccordionItem>
  );
}
