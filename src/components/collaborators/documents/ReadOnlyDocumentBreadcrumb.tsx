/**
 * Fil d'Ariane en lecture seule - Finder RH Employé
 * Pas de drag & drop, pas de bouton création
 */

import { ChevronRight, Home } from 'lucide-react';
import { DOCUMENT_TYPES, DocumentType } from '@/types/collaboratorDocument';

interface ReadOnlyDocumentBreadcrumbProps {
  activeCategory: DocumentType | 'ALL';
  activeSubfolder: string | null;
  onNavigateRoot: () => void;
  onNavigateCategory: () => void;
}

export function ReadOnlyDocumentBreadcrumb({
  activeCategory,
  activeSubfolder,
  onNavigateRoot,
  onNavigateCategory,
}: ReadOnlyDocumentBreadcrumbProps) {
  if (activeCategory === 'ALL') return null;

  const categoryLabel = DOCUMENT_TYPES.find((t) => t.value === activeCategory)?.label || activeCategory;

  return (
    <div className="flex items-center gap-4 py-2 px-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-1.5 text-sm min-w-0">
        {/* Home button */}
        <button
          onClick={onNavigateRoot}
          className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
          title="Tous les documents"
        >
          <Home className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
        
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        
        {/* Category */}
        <button
          onClick={onNavigateCategory}
          className={`truncate transition-colors ${
            activeSubfolder 
              ? 'text-muted-foreground hover:text-foreground' 
              : 'font-medium text-foreground'
          }`}
        >
          {categoryLabel}
        </button>
        
        {/* Subfolder */}
        {activeSubfolder && (
          <>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-foreground truncate">{activeSubfolder}</span>
          </>
        )}
      </div>
    </div>
  );
}
