/**
 * FAQ Item Row - Single FAQ item with inline actions
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { FaqItem, CONTEXT_OPTIONS } from './types';

interface FaqItemRowProps {
  item: FaqItem;
  onEdit: (item: FaqItem) => void;
  onDelete: (item: FaqItem) => void;
  onTogglePublish: (item: FaqItem) => void;
}

export function FaqItemRow({ item, onEdit, onDelete, onTogglePublish }: FaqItemRowProps) {
  const [expanded, setExpanded] = useState(false);

  const handleDelete = () => {
    if (confirm(`Supprimer "${item.question.substring(0, 50)}..." ?`)) {
      onDelete(item);
    }
  };

  return (
    <div className="group border-b border-border/50 last:border-b-0">
      <div className="flex items-start gap-3 py-3 px-4 hover:bg-muted/30 transition-colors">
        {/* Drag handle */}
        <div className="pt-1 opacity-0 group-hover:opacity-50 cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left w-full"
          >
            <p className="font-medium text-sm leading-relaxed">
              {item.question}
            </p>
          </button>
          
          {expanded && (
            <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {item.answer}
            </div>
          )}
        </div>
        
        {/* Status */}
        <Badge 
          variant={item.is_published ? "default" : "secondary"}
          className={`shrink-0 ${item.is_published ? 'bg-green-600' : ''}`}
        >
          {item.is_published ? 'Publié' : 'Masqué'}
        </Badge>
        
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onTogglePublish(item)}
            title={item.is_published ? 'Masquer' : 'Publier'}
          >
            {item.is_published ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(item)}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={handleDelete}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
