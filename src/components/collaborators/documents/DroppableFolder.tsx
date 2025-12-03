/**
 * Dossier avec zone de drop - Finder RH
 */

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FolderOpen, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DroppableFolderProps {
  folderId: string;
  folderName: string;
  documentCount: number;
  onClick: () => void;
  onDelete?: () => void;
  canManage: boolean;
}

export function DroppableFolder({
  folderId,
  folderName,
  documentCount,
  onClick,
  onDelete,
  canManage,
}: DroppableFolderProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folderId}`,
    data: { subfolder: folderName },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-lg border transition-all cursor-pointer group',
        'border-border/50 hover:border-helpconfort-blue hover:bg-helpconfort-blue/5',
        isOver && 'border-helpconfort-orange border-2 bg-helpconfort-orange/10 scale-105'
      )}
    >
      <FolderOpen 
        className={cn(
          'h-10 w-10 transition-colors',
          isOver ? 'text-helpconfort-orange' : 'text-helpconfort-orange group-hover:text-helpconfort-blue'
        )} 
      />
      <span className="text-sm font-medium text-center line-clamp-2">{folderName}</span>
      {documentCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {documentCount} doc{documentCount > 1 ? 's' : ''}
        </Badge>
      )}
      
      {/* Delete folder button */}
      {canManage && onDelete && documentCount === 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Supprimer le dossier vide"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// Droppable zone for "root" (no subfolder)
export function DroppableRoot({ isActive }: { isActive: boolean }) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'folder-root',
    data: { subfolder: null },
  });

  if (!isActive) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-dashed transition-all',
        isOver 
          ? 'border-helpconfort-blue bg-helpconfort-blue/10' 
          : 'border-muted-foreground/30 bg-muted/20'
      )}
    >
      <FolderOpen className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {isOver ? 'Déposer ici' : 'Racine'}
      </span>
    </div>
  );
}
