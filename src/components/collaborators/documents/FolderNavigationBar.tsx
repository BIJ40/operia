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
    <div className="flex items-center justify-between gap-4 py-2 px-4 rounded-xl bg-gradient-to-r from-muted/30 to-muted/10 border border-border/30 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-sm min-w-0 flex-1 overflow-hidden">
        {/* Home button */}
        <button
          onClick={onNavigateToRoot}
          className="p-1.5 rounded-lg hover:bg-warm-green/10 transition-colors flex-shrink-0 group"
          title="Tous les documents"
        >
          <Home className="h-4 w-4 text-muted-foreground group-hover:text-warm-green" />
        </button>
        
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
        
        {/* Category */}
        <button
          onClick={onNavigateToCategory}
          className={`truncate transition-colors whitespace-nowrap px-2 py-1 rounded-lg ${
            folderPath.length === 0 
              ? 'font-semibold text-warm-green bg-warm-green/10' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {categoryLabel}
        </button>
        
        {/* Folder path with chevrons */}
        {folderPath.map((folder, index) => (
          <div key={folder.id || `root-${index}`} className="flex items-center gap-2 flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <button
              onClick={() => onNavigateToFolder(folder.id)}
              className={`truncate transition-colors whitespace-nowrap px-2 py-1 rounded-lg ${
                index === folderPath.length - 1
                  ? 'font-semibold text-warm-green bg-warm-green/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
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
        className="flex-shrink-0 bg-muted/30 rounded-lg p-0.5"
      >
        <ToggleGroupItem 
          value="grid" 
          aria-label="Vue grille" 
          size="sm"
          className="data-[state=on]:bg-warm-green data-[state=on]:text-white rounded-md"
        >
          <LayoutGrid className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="list" 
          aria-label="Vue liste" 
          size="sm"
          className="data-[state=on]:bg-warm-green data-[state=on]:text-white rounded-md"
        >
          <List className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
