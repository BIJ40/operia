/**
 * MediaBreadcrumbNav - Navigation fil d'Ariane
 */

import { MediaBreadcrumb } from '@/types/mediaLibrary';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaBreadcrumbNavProps {
  breadcrumbs: MediaBreadcrumb[];
  onNavigate: (folderId: string | null) => void;
  onNavigateRoot: () => void;
}

export function MediaBreadcrumbNav({ 
  breadcrumbs, 
  onNavigate, 
  onNavigateRoot 
}: MediaBreadcrumbNavProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5 border-b border-red-100/50 dark:border-red-900/30 bg-gradient-to-r from-red-50/30 to-transparent dark:from-red-950/10 text-sm overflow-x-auto">
      <button
        onClick={onNavigateRoot}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors",
          "text-red-600/70 dark:text-red-400/70 hover:text-red-700 dark:hover:text-red-300"
        )}
      >
        <Home className="w-4 h-4" />
        <span>Racine</span>
      </button>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-red-300/60 dark:text-red-700/60 mx-1" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className={cn(
              "px-2.5 py-1 rounded-lg hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors",
              index === breadcrumbs.length - 1
                ? "font-medium text-red-700 dark:text-red-300 bg-red-100/40 dark:bg-red-900/20"
                : "text-red-600/70 dark:text-red-400/70 hover:text-red-700 dark:hover:text-red-300"
            )}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}
