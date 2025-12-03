/**
 * Document Item avec support Drag & Drop - Finder RH
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { DocumentItem } from './DocumentItem';

interface DraggableDocumentItemProps {
  document: CollaboratorDocument;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  canManage: boolean;
}

export function DraggableDocumentItem({
  document,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  canManage,
}: DraggableDocumentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: document.id,
    data: { document },
    disabled: !canManage,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <DocumentItem
        document={document}
        onPreview={onPreview}
        onDownload={onDownload}
        onDelete={onDelete}
        onRename={onRename}
        canManage={canManage}
      />
    </div>
  );
}
