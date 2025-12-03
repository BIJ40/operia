/**
 * Document Item avec support Drag & Drop et sélection multiple - Finder RH
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { DocumentItem } from './DocumentItem';
import { GripVertical } from 'lucide-react';

interface DraggableDocumentItemProps {
  document: CollaboratorDocument;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onEdit: () => void;
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
  onEdit,
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
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {/* Drag handle - only this area triggers drag */}
      {canManage && (
        <div
          {...listeners}
          {...attributes}
          className="absolute top-2 left-2 z-10 p-1 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity touch-none"
          title="Glisser pour déplacer"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <DocumentItem
        document={document}
        onPreview={onPreview}
        onDownload={onDownload}
        onDelete={onDelete}
        onEdit={onEdit}
        onRename={onRename}
        canManage={canManage}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
}
