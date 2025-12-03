/**
 * Document Item avec support Drag & Drop et sélection multiple - Finder RH
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
  isSelected?: boolean;
  onSelect?: (e: React.MouseEvent) => void;
  selectedCount?: number;
}

export function DraggableDocumentItem({
  document,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  canManage,
  isSelected = false,
  onSelect,
  selectedCount = 0,
}: DraggableDocumentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: document.id,
    data: { document, isSelected, selectedCount },
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
        'touch-none cursor-grab active:cursor-grabbing',
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
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
}
