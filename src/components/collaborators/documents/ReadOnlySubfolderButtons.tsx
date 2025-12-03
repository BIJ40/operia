/**
 * Boutons de sous-dossiers en lecture seule - Finder RH Employé
 * Pas de drag & drop, pas de bouton création
 */

import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';

interface ReadOnlySubfolderButtonsProps {
  subfolders: string[];
  subfolderCounts: Record<string, number>;
  onFolderClick: (folder: string) => void;
}

export function ReadOnlySubfolderButtons({
  subfolders,
  subfolderCounts,
  onFolderClick,
}: ReadOnlySubfolderButtonsProps) {
  if (subfolders.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {subfolders.map((folder) => (
        <button
          key={folder}
          onClick={() => onFolderClick(folder)}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
            'bg-background hover:bg-helpconfort-blue/5 hover:border-helpconfort-blue/50'
          )}
        >
          <FolderOpen className="h-4 w-4 text-helpconfort-orange" />
          <span className="text-sm font-medium">{folder}</span>
          {(subfolderCounts[folder] || 0) > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {subfolderCounts[folder]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
