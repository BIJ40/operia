import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { Edit, Trash2, Copy, GripVertical, MoreVertical, MoveRight, Lightbulb, Info, AlertTriangle } from 'lucide-react';
import { Block } from '@/types/block';
import { createSanitizedHtml } from '@/lib/sanitize';

interface SortableAccordionItemProps {
  section: Block;
  isAdmin: boolean;
  availableCategories: Block[];
  onEdit: (section: Block) => void;
  onDuplicate: (section: Block) => void;
  onDelete: (section: Block) => void;
  onMove: (sectionId: string, categoryId: string) => void;
}

export function SortableAccordionItem({
  section,
  isAdmin,
  availableCategories,
  onEdit,
  onDuplicate,
  onDelete,
  onMove,
}: SortableAccordionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTipsIcon = (tipsType?: string) => {
    switch (tipsType) {
      case 'info':
        return <Info className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Lightbulb className="w-5 h-5" />;
    }
  };

  const getTipsColor = (tipsType?: string) => {
    switch (tipsType) {
      case 'info':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      default:
        return 'border-primary/30 bg-primary/5';
    }
  };

  if (section.contentType === 'tips') {
    return (
      <div ref={setNodeRef} style={style}>
        <Card className="rounded-2xl overflow-hidden border-2 border-l-4 border-primary/40 border-l-helpconfort-orange bg-card shadow-sm hover:border-primary/60 hover:shadow-md transition-all">
          <div className="p-6 bg-gradient-to-r from-helpconfort-orange/20 to-helpconfort-orange/10">
            <div className="flex items-start gap-4">
              {isAdmin && (
                <div {...attributes} {...listeners} className="cursor-move mt-1">
                  <GripVertical className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-shrink-0 mt-1 text-helpconfort-orange">{getTipsIcon(section.tipsType)}</div>
              <div className="flex-1">
                {!section.hideTitle && <h3 className="font-semibold text-lg mb-2">{section.title}</h3>}
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
                />
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(section)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(section)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <MoveRight className="w-4 h-4 mr-2" />
                          Déplacer vers
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {availableCategories.map((cat) => (
                            <DropdownMenuItem key={cat.id} onClick={() => onMove(section.id, cat.id)}>
                              {cat.title}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => onDelete(section)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={section.id} className="border-2 rounded-xl overflow-hidden bg-card">
        <AccordionTrigger className="px-6 py-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-4 flex-1">
            {isAdmin && (
              <div {...attributes} {...listeners} className="cursor-move">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            {!section.hideTitle && (
              <h3 className="text-xl font-semibold text-left">{section.title}</h3>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => onEdit(section)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(section)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Dupliquer
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <MoveRight className="w-4 h-4 mr-2" />
                        Déplacer vers
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {availableCategories.map((cat) => (
                          <DropdownMenuItem key={cat.id} onClick={() => onMove(section.id, cat.id)}>
                            {cat.title}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuItem onClick={() => onDelete(section)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-6 pb-6">
          {section.showSummary && section.summary && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground italic">{section.summary}</p>
            </div>
          )}
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={createSanitizedHtml(section.content)}
          />
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
