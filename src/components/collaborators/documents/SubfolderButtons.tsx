/**
 * Boutons de sous-dossiers droppables - Finder RH
 */

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubfolderButtonProps {
  folderId: string;
  folderName: string;
  documentCount: number;
  onClick: () => void;
}

function SubfolderButton({ folderId, folderName, documentCount, onClick }: SubfolderButtonProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folderId}`,
    data: { subfolder: folderName },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        'bg-background hover:bg-helpconfort-blue/5 hover:border-helpconfort-blue/50',
        isOver && 'border-helpconfort-orange bg-helpconfort-orange/10 scale-105 shadow-md'
      )}
    >
      <FolderOpen 
        className={cn(
          'h-4 w-4',
          isOver ? 'text-helpconfort-orange' : 'text-helpconfort-orange'
        )} 
      />
      <span className="text-sm font-medium">{folderName}</span>
      {documentCount > 0 && (
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {documentCount}
        </span>
      )}
    </button>
  );
}

interface SubfolderButtonsProps {
  subfolders: string[];
  subfolderCounts: Record<string, number>;
  onFolderClick: (folder: string) => void;
  onCreateFolder: () => void;
  canManage: boolean;
}

export function SubfolderButtons({
  subfolders,
  subfolderCounts,
  onFolderClick,
  onCreateFolder,
  canManage,
}: SubfolderButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {subfolders.map((folder) => (
        <SubfolderButton
          key={folder}
          folderId={folder}
          folderName={folder}
          documentCount={subfolderCounts[folder] || 0}
          onClick={() => onFolderClick(folder)}
        />
      ))}
      
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFolder}
          className="gap-1.5 border-dashed"
        >
          <FolderPlus className="h-4 w-4" />
          + Nouveau
        </Button>
      )}
    </div>
  );
}
