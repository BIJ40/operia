/**
 * Vue grille des dossiers et documents avec menu contextuel - Finder RH
 */

import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { DraggableDocumentItem } from './DraggableDocumentItem';
import { FolderOpen, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface SubfolderInfo {
  id: string;
  name: string;
  documentCount: number;
}

interface FolderGridViewProps {
  documents: CollaboratorDocument[];
  subfolders: SubfolderInfo[];
  onPreview: (doc: CollaboratorDocument) => void;
  onDownload: (doc: CollaboratorDocument) => void;
  onDelete: (doc: CollaboratorDocument) => void;
  onEdit: (doc: CollaboratorDocument) => void;
  onRename: (doc: CollaboratorDocument, newTitle: string) => void;
  onFolderClick: (folderId: string) => void;
  canManage: boolean;
  selectedIds: Set<string>;
  onSelect: (docId: string, e: React.MouseEvent) => void;
  onCreateFolder: () => void;
}

// Folder card component with droppable
function FolderCard({ 
  folder, 
  onClick 
}: { 
  folder: SubfolderInfo; 
  onClick: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-${folder.id}`,
    data: { subfolder: folder.name, folderId: folder.id },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onDoubleClick={onClick}
      className={cn(
        'group relative flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer',
        'bg-gradient-to-br from-background to-muted/20',
        'hover:border-helpconfort-blue/50 hover:shadow-md',
        isOver && 'border-helpconfort-orange border-2 bg-helpconfort-orange/10 scale-105'
      )}
    >
      <FolderOpen 
        className={cn(
          'h-12 w-12 mb-2 transition-colors',
          isOver ? 'text-helpconfort-orange' : 'text-helpconfort-orange'
        )} 
      />
      <p className="font-medium text-sm text-center truncate w-full">{folder.name}</p>
      {folder.documentCount > 0 && (
        <Badge variant="secondary" className="mt-1 text-xs">
          {folder.documentCount} doc{folder.documentCount > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  );
}

export function FolderGridView({
  documents,
  subfolders,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  onRename,
  onFolderClick,
  canManage,
  selectedIds,
  onSelect,
  onCreateFolder,
}: FolderGridViewProps) {
  if (documents.length === 0 && subfolders.length === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderOpen className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Aucun document</p>
            <p className="text-sm">Clic droit pour créer un dossier</p>
          </div>
        </ContextMenuTrigger>
        {canManage && (
          <ContextMenuContent>
            <ContextMenuItem onClick={onCreateFolder} className="gap-2">
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </ContextMenuItem>
          </ContextMenuContent>
        )}
      </ContextMenu>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {/* Folders first */}
          {subfolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => onFolderClick(folder.id)}
            />
          ))}
          
          {/* Documents */}
          {documents.map((doc) => (
            <DraggableDocumentItem
              key={doc.id}
              document={doc}
              onPreview={() => onPreview(doc)}
              onDownload={() => onDownload(doc)}
              onDelete={() => onDelete(doc)}
              onEdit={() => onEdit(doc)}
              onRename={(newTitle) => onRename(doc, newTitle)}
              canManage={canManage}
              isSelected={selectedIds.has(doc.id)}
              onSelect={(e) => onSelect(doc.id, e)}
              selectedCount={selectedIds.size}
            />
          ))}
        </div>
      </ContextMenuTrigger>
      {canManage && (
        <ContextMenuContent>
          <ContextMenuItem onClick={onCreateFolder} className="gap-2">
            <FolderPlus className="h-4 w-4" />
            Nouveau dossier
          </ContextMenuItem>
        </ContextMenuContent>
      )}
    </ContextMenu>
  );
}
