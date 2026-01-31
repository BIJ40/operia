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
    <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 text-sm overflow-x-auto">
      <button
        onClick={onNavigateRoot}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <Home className="w-4 h-4" />
        <span>Racine</span>
      </button>

      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1" />
          <button
            onClick={() => onNavigate(crumb.id)}
            className={cn(
              "px-2 py-1 rounded hover:bg-muted transition-colors",
              index === breadcrumbs.length - 1
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {crumb.name}
          </button>
        </div>
      ))}
    </div>
  );
}
