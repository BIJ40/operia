/**
 * Grille de documents en lecture seule - Finder RH Employé
 * Pas de drag & drop, pas de sélection multiple
 */

import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { ReadOnlyDocumentItem } from './ReadOnlyDocumentItem';

interface ReadOnlyDocumentGridProps {
  documents: CollaboratorDocument[];
  onPreview: (doc: CollaboratorDocument) => void;
  onDownload: (doc: CollaboratorDocument) => void;
}

export function ReadOnlyDocumentGrid({
  documents,
  onPreview,
  onDownload,
}: ReadOnlyDocumentGridProps) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {documents.map((doc) => (
        <ReadOnlyDocumentItem
          key={doc.id}
          document={doc}
          onPreview={() => onPreview(doc)}
          onDownload={() => onDownload(doc)}
        />
      ))}
    </div>
  );
}
