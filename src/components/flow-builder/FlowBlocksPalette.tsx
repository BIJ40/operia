import { useMemo } from 'react';
import { 
  Ruler, 
  Type, 
  HelpCircle, 
  Camera, 
  PenTool,
  FileText,
  Hash,
  Calendar,
  List,
  LucideIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { QuestionBlock } from '@/lib/flow/flowTypes';

interface FlowBlocksPaletteProps {
  blocks: QuestionBlock[];
  onDragStart: (event: React.DragEvent, block: QuestionBlock) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Ruler,
  Type,
  HelpCircle,
  Camera,
  PenTool,
  FileText,
  Hash,
  Calendar,
  List,
};

const CATEGORY_LABELS: Record<string, string> = {
  mesures: '📐 Mesures',
  saisie: '📝 Saisie',
  choix: '❓ Choix',
  media: '📷 Média',
  validation: '✅ Validation',
  general: '📋 Général',
};

export function FlowBlocksPalette({ blocks, onDragStart }: FlowBlocksPaletteProps) {
  const groupedBlocks = useMemo(() => {
    const groups: Record<string, QuestionBlock[]> = {};
    for (const block of blocks) {
      const category = block.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(block);
    }
    return groups;
  }, [blocks]);

  const categories = Object.keys(groupedBlocks).sort();

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Blocs disponibles</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-2">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {categories.map(category => (
              <div key={category}>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  {CATEGORY_LABELS[category] || category}
                </div>
                <div className="space-y-1">
                  {groupedBlocks[category].map(block => {
                    const IconComponent = block.icon ? ICON_MAP[block.icon] : FileText;
                    return (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, block)}
                        className="flex items-center gap-2 p-2 rounded-md border border-border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
                      >
                        {IconComponent && (
                          <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{block.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {block.schema.fields?.length || 0}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {blocks.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Aucun bloc disponible
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
