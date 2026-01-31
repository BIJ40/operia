/**
 * MediaSidebar - Arborescence des dossiers système
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { 
  FolderOpen, Users, Truck, FileText, Building2, 
  ChevronRight, Home 
} from 'lucide-react';
import { MediaSystemFolder } from '@/types/mediaLibrary';

interface MediaSidebarProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  users: Users,
  truck: Truck,
  'file-text': FileText,
  building: Building2,
  folder: FolderOpen,
};

export function MediaSidebar({ currentFolderId, onNavigate }: MediaSidebarProps) {
  // Fetch system folders
  const { data: systemFolders = [] } = useQuery({
    queryKey: ['media-system-folders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media_system_folders')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as MediaSystemFolder[];
    },
  });

  // Group by root path
  const rootFolders = systemFolders.filter(f => 
    f.path_slug.split('/').filter(Boolean).length === 1
  );

  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Navigation
        </h3>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {/* Root / Home */}
        <button
          onClick={() => onNavigate(null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            !currentFolderId
              ? "bg-primary/10 text-primary font-medium"
              : "hover:bg-muted text-foreground"
          )}
        >
          <Home className="w-4 h-4" />
          <span>Tous les fichiers</span>
        </button>

        <div className="h-px bg-border my-2" />

        {/* System folders */}
        {rootFolders.map((folder) => {
          const Icon = ICON_MAP[folder.icon] || FolderOpen;
          
          return (
            <button
              key={folder.id}
              onClick={() => {
                // Navigate to system folder - need to find actual folder ID
                // For now, just show the label
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                "hover:bg-muted text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{folder.display_label}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
