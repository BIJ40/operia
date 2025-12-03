/**
 * Fil d'Ariane pour navigation documents RH
 */

import { ChevronRight, Home, FolderPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPES, DocumentType } from '@/types/collaboratorDocument';
import { DroppableRoot } from './DroppableFolder';

interface DocumentBreadcrumbProps {
  activeCategory: DocumentType | 'ALL';
  activeSubfolder: string | null;
  onNavigateRoot: () => void;
  onNavigateCategory: () => void;
  onCreateFolder: () => void;
  canManage: boolean;
  isDragging: boolean;
}

export function DocumentBreadcrumb({
  activeCategory,
  activeSubfolder,
  onNavigateRoot,
  onNavigateCategory,
  onCreateFolder,
  canManage,
  isDragging,
}: DocumentBreadcrumbProps) {
  if (activeCategory === 'ALL') return null;

  const categoryLabel = DOCUMENT_TYPES.find((t) => t.value === activeCategory)?.label || activeCategory;

  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-muted/30 border">
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

        {/* Droppable root zone when dragging from subfolder */}
        {isDragging && activeSubfolder && (
          <DroppableRoot isActive={true} />
        )}
      </div>
      
      {/* New folder button only when in subfolder (otherwise shown in SubfolderButtons) */}
      {canManage && activeSubfolder && (
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFolder}
          className="gap-1.5 flex-shrink-0 border-dashed"
        >
          <FolderPlus className="h-4 w-4" />
          + Nouveau
        </Button>
      )}
    </div>
  );
}
