/**
 * Section Documents (Cockpit) - Tuile en consultation.
 * Utilise MediaLibraryPortal pour la gestion des documents.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RHCollaborator } from '@/types/rh-suivi';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FolderOpen, Maximize2, FileText, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHasMinLevel } from '@/hooks/useHasGlobalRole';
import { HRDocumentManager } from '@/components/collaborators/documents';
import { useProfile } from '@/contexts/ProfileContext';

interface Props {
  collaborator: RHCollaborator;
}

interface MediaLinkPreview {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export function RHSectionDocuments({ collaborator }: Props) {
  const [openManager, setOpenManager] = React.useState(false);
  const canManage = useHasMinLevel(2);
  const { agencyId } = useProfile();

  // Query documents from media_links (unified media library)
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['media-links-preview', collaborator.id, agencyId],
    queryFn: async (): Promise<MediaLinkPreview[]> => {
      if (!agencyId) return [];
      
      // Get the collaborator's folder
      const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('slug', `salarie-${collaborator.id}`)
        .maybeSingle();

      if (!folder) return [];

      // Get all subfolders (including the root folder itself)
      const { data: subFolders } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('parent_id', folder.id)
        .is('deleted_at', null);

      const folderIds = [folder.id, ...(subFolders || []).map(f => f.id)];

      // Get files from this folder and subfolders only
      const { data, error } = await supabase
        .from('media_links')
        .select(`
          id,
          created_at,
          asset:media_assets!inner(
            file_name,
            mime_type,
            file_size
          )
        `)
        .in('folder_id', folderIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      
      return (data || []).map((link: any) => ({
        id: link.id,
        file_name: link.asset?.file_name || 'Document',
        file_type: link.asset?.mime_type || null,
        file_size: link.asset?.file_size || null,
        created_at: link.created_at,
      }));
    },
    enabled: !!agencyId,
  });

  const previewDocs = useMemo(() => documents.slice(0, 1), [documents]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Tuile consultation: clic n'importe où ouvre le gestionnaire */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpenManager(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpenManager(true);
        }}
        className={cn(
          'relative rounded-lg border bg-muted/10 p-3',
          'cursor-pointer transition-colors hover:bg-muted/20',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
        )}
        title="Ouvrir le gestionnaire de documents"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {documents.length} fichier(s)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setOpenManager(true);
            }}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Ouvrir
          </Button>
        </div>

        <div className="mt-3">
          {documents.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg bg-background/40">
              <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucun document</p>
              <p className="text-xs mt-1">Clique ici pour ouvrir le gestionnaire</p>
            </div>
          ) : (
            <div className="rounded-lg border bg-background/60 p-3">
              {previewDocs.map((doc) => {
                const isImage = doc.file_type?.startsWith('image/');
                const isPdf = doc.file_type === 'application/pdf';
                const Icon = isImage ? ImageIcon : FileText;
                const typeLabel = isPdf ? 'PDF' : isImage ? 'IMG' : 'DOC';

                return (
                  <div key={doc.id} className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 rounded-lg border bg-muted/30 flex items-center justify-center shrink-0">
                      <div className="flex flex-col items-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold text-muted-foreground mt-0.5">{typeLabel}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('fr-FR')} {doc.file_size ? `• ${formatFileSize(doc.file_size)}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}

              {documents.length > previewDocs.length && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{documents.length - previewDocs.length} autre(s)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fenêtre flottante centrée: gestion complète */}
      <Dialog open={openManager} onOpenChange={setOpenManager}>
        <DialogContent className="max-w-6xl w-[96vw] h-[90vh] p-0 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">
                    Documents — {collaborator.first_name} {collaborator.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Gestion complète (dossiers imbriqués, drag & drop, suppression)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <HRDocumentManager collaboratorId={collaborator.id} canManage={canManage} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
