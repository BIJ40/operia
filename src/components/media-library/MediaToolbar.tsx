/**
 * MediaToolbar - Barre d'outils (recherche, vue, actions)
 */

import { useState, useRef } from 'react';
import { MediaViewMode, MediaFilters } from '@/types/mediaLibrary';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, Grid3X3, List, Plus, Upload, FolderPlus,
  SortAsc, SortDesc
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MediaToolbarProps {
  viewMode: MediaViewMode;
  onViewModeChange: (mode: MediaViewMode) => void;
  filters: MediaFilters;
  onFiltersChange: (filters: MediaFilters) => void;
  currentFolderId: string | null;
  onUpload: (file: File) => void;
  onCreateFolder: (name: string) => void;
}

export function MediaToolbar({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  currentFolderId,
  onUpload,
  onCreateFolder,
}: MediaToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => onUpload(file));
    }
    e.target.value = '';
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setNewFolderDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-red-100/50 dark:border-red-900/30 bg-gradient-to-r from-red-50/40 to-transparent dark:from-red-950/10">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>

        <div className="flex-1" />

        {/* View mode toggle */}
        <div className="flex items-center border border-red-200/50 dark:border-red-800/30 rounded-xl p-0.5 bg-red-50/30 dark:bg-red-950/20">
          <Button
            variant={viewMode.type === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onViewModeChange({ ...viewMode, type: 'grid' })}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode.type === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onViewModeChange({ ...viewMode, type: 'list' })}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {viewMode.sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              Trier
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewModeChange({ ...viewMode, sortBy: 'name' })}>
              Par nom {viewMode.sortBy === 'name' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange({ ...viewMode, sortBy: 'date' })}>
              Par date {viewMode.sortBy === 'date' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewModeChange({ ...viewMode, sortBy: 'size' })}>
              Par taille {viewMode.sortBy === 'size' && '✓'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewModeChange({ 
              ...viewMode, 
              sortOrder: viewMode.sortOrder === 'asc' ? 'desc' : 'asc' 
            })}>
              {viewMode.sortOrder === 'asc' ? 'Décroissant' : 'Croissant'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* New menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-2 bg-red-500 hover:bg-red-600 text-white shadow-md">
              <Plus className="w-4 h-4" />
              Nouveau
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setNewFolderDialogOpen(true)}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Nouveau dossier
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => fileInputRef.current?.click()}
              disabled={!currentFolderId}
            >
              <Upload className="w-4 h-4 mr-2" />
              Téléverser un fichier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* New folder dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Nom du dossier"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
