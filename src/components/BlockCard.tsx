import { Block, ColorPreset } from '@/types/block';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEditor } from '@/contexts/EditorContext';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, GripVertical } from 'lucide-react';

interface BlockCardProps {
  block: Block;
}

const colorPresets: Record<ColorPreset, string> = {
  good: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
  tip: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
  bad: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
  none: 'bg-background',
};

const sizeClasses: Record<string, string> = {
  sm: 'col-span-1',
  md: 'col-span-2',
  lg: 'col-span-3',
  xl: 'col-span-4',
};

export function BlockCard({ block }: BlockCardProps) {
  const { isEditMode, updateBlock, deleteBlock } = useEditor();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !isEditMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = block.icon && (Icons as any)[block.icon] 
    ? (Icons as any)[block.icon]
    : null;
  const Icon = IconComponent as React.ComponentType<{ className?: string }> | null;

  const handlePinnedToggle = (checked: boolean) => {
    const slug = checked ? block.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : undefined;
    updateBlock(block.id, { pinned: checked, slug });
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(sizeClasses[block.size])}>
      <Card className={cn('p-4 h-full', colorPresets[block.colorPreset], isEditMode && 'ring-2 ring-primary/20')}>
        {isEditMode && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <Switch
                  id={`pin-${block.id}`}
                  checked={block.pinned}
                  onCheckedChange={handlePinnedToggle}
                />
                <Label htmlFor={`pin-${block.id}`} className="text-xs cursor-pointer">
                  Épingler au menu
                </Label>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteBlock(block.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex-shrink-0">
              <Icon className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-2">{block.title}</h3>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
            {block.pinned && block.slug && (
              <Badge variant="secondary" className="mt-2">
                📌 Épinglé
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
