/**
 * Grille d'affichage des documents avec Drag & Drop et sélection multiple - Finder RH
 */

import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { DraggableDocumentItem } from './DraggableDocumentItem';
import { FolderOpen } from 'lucide-react';

interface DocumentGridProps {
  documents: CollaboratorDocument[];
  onPreview: (doc: CollaboratorDocument) => void;
  onDownload: (doc: CollaboratorDocument) => void;
  onDelete: (doc: CollaboratorDocument) => void;
  onEdit: (doc: CollaboratorDocument) => void;
  onRename: (doc: CollaboratorDocument, newTitle: string) => void;
  canManage: boolean;
  selectedIds: Set<string>;
  onSelect: (docId: string, e: React.MouseEvent) => void;
}

export function DocumentGrid({
  documents,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
  onRename,
  canManage,
  selectedIds,
  onSelect,
}: DocumentGridProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FolderOpen className="h-16 w-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">Aucun document</p>
        <p className="text-sm">Glissez-déposez des fichiers pour les ajouter</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
  );
}
