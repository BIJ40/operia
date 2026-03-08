/**
 * MediaSidebar - Arborescence des dossiers système
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useProfile } from '@/contexts/ProfileContext';
import { 
  FolderOpen, Users, Truck, FileText, Building2, 
  ChevronRight, ChevronDown, Home, Loader2 
} from 'lucide-react';
import { useState } from 'react';
import { MediaFolder } from '@/types/mediaLibrary';

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
  calendar: FolderOpen,       // Placeholder pour réunions
  'layout-template': FileText, // Placeholder pour modèles
};

export function MediaSidebar({ currentFolderId, onNavigate }: MediaSidebarProps) {
  const { agencyId } = useProfile();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Fetch root folders (system folders and user folders at root level)
  const { data: rootFolders = [], isLoading } = useQuery({
    queryKey: ['media-root-folders', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('agency_id', agencyId)
        .is('parent_id', null)
        .is('deleted_at', null)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as MediaFolder[];
    },
    enabled: !!agencyId,
  });

  // Fetch children for expanded folders
  const { data: childFolders = [] } = useQuery({
    queryKey: ['media-child-folders', agencyId, Array.from(expandedFolders)],
    queryFn: async () => {
      if (!agencyId || expandedFolders.size === 0) return [];
      
      const { data, error } = await supabase
        .from('media_folders')
        .select('*')
        .eq('agency_id', agencyId)
        .in('parent_id', Array.from(expandedFolders))
        .is('deleted_at', null)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) throw error;
      return data as MediaFolder[];
    },
    enabled: !!agencyId && expandedFolders.size > 0,
  });

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getChildrenOfFolder = (parentId: string) => {
    return childFolders.filter(f => f.parent_id === parentId);
  };

  const renderFolder = (folder: MediaFolder, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isActive = currentFolderId === folder.id;
    const children = getChildrenOfFolder(folder.id);
    const Icon = ICON_MAP[folder.icon || 'folder'] || FolderOpen;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-1 rounded-xl text-sm transition-all cursor-pointer",
            isActive
              ? "bg-muted/80 text-foreground font-medium border border-border/50"
              : "hover:bg-muted/50 text-foreground"
          )}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          {/* Expand toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id); }}
            className="p-1 hover:bg-muted/50 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            )}
          </button>

          {/* Folder button */}
          <button
            onClick={() => onNavigate(folder.id)}
            className="flex-1 flex items-center gap-2 py-2 pr-3"
          >
            <Icon className={cn(
              "w-4 h-4",
              folder.is_system ? "text-primary" : "text-muted-foreground"
            )} />
            <span className="truncate">{folder.name}</span>
          </button>
        </div>

        {/* Children */}
        {isExpanded && children.map(child => renderFolder(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-56 border-r border-border/40 bg-muted/20 flex flex-col">
      <div className="p-3 border-b border-border/30">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Navigation
        </h3>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {/* Root / Home */}
        <button
          onClick={() => onNavigate(null)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all",
            !currentFolderId
              ? "bg-muted/80 text-foreground font-medium border border-border/50 shadow-sm"
              : "hover:bg-muted/50 text-foreground"
          )}
        >
          <Home className="w-4 h-4" />
          <span>Tous les fichiers</span>
        </button>

        <div className="h-px bg-border my-2" />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Folder tree */}
        {!isLoading && rootFolders.map(folder => renderFolder(folder))}

        {/* Empty state */}
        {!isLoading && rootFolders.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Aucun dossier
          </div>
        )}
      </div>
    </div>
  );
}
