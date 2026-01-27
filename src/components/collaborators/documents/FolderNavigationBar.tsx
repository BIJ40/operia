/**
 * Barre de navigation dossiers avec chemin en tirets
 * Navigation: DOSSIER 1 - DOSSIER 2 - DOSSIER 3
 */

import { ChevronRight, Home, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DOCUMENT_TYPES, DocumentType } from '@/types/collaboratorDocument';

export interface FolderPath {
  id: string | null;
  name: string;
}

interface FolderNavigationBarProps {
  activeCategory: DocumentType | 'ALL';
  folderPath: FolderPath[];
  onNavigateToRoot: () => void;
  onNavigateToCategory: () => void;
  onNavigateToFolder: (folderId: string | null) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function FolderNavigationBar({
  activeCategory,
  folderPath,
  onNavigateToRoot,
  onNavigateToCategory,
  onNavigateToFolder,
  viewMode,
  onViewModeChange,
}: FolderNavigationBarProps) {
  if (activeCategory === 'ALL') return null;

  const categoryLabel = DOCUMENT_TYPES.find((t) => t.value === activeCategory)?.label || activeCategory;

  return (
    <div className="flex items-center justify-between gap-4 py-2 px-3 rounded-lg bg-muted/30 border">
      <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1 overflow-hidden">
        {/* Home button */}
        <button
          onClick={onNavigateToRoot}
          className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
          title="Tous les documents"
        >
          <Home className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
        
        <span className="text-muted-foreground flex-shrink-0">-</span>
        
        {/* Category */}
        <button
          onClick={onNavigateToCategory}
          className={`truncate transition-colors whitespace-nowrap ${
            folderPath.length === 0 
              ? 'font-semibold text-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {categoryLabel}
        </button>
        
        {/* Folder path with dashes */}
        {folderPath.map((folder, index) => (
          <div key={folder.id || `root-${index}`} className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-muted-foreground">-</span>
            <button
              onClick={() => onNavigateToFolder(folder.id)}
              className={`truncate transition-colors whitespace-nowrap ${
                index === folderPath.length - 1
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>
      
      {/* View mode toggle */}
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(val) => val && onViewModeChange(val as 'grid' | 'list')}
        className="flex-shrink-0"
      >
        <ToggleGroupItem value="grid" aria-label="Vue grille" size="sm">
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="Vue liste" size="sm">
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
