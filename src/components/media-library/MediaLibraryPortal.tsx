/**
 * MediaLibraryPortal - Composant réutilisable pour afficher la médiathèque scopée
 * Utilisé comme "portail" vers une sous-arborescence de la médiathèque
 */

import { useCallback, useMemo } from 'react';
import { useScopedMediaLibrary } from '@/hooks/useScopedMediaLibrary';
import { MediaFolderGrid } from './MediaFolderGrid';
import { MediaBreadcrumbNav } from './MediaBreadcrumbNav';
import { MediaToolbar } from './MediaToolbar';
import { MediaQuickLook } from './MediaQuickLook';
import { MediaContextMenuPopover } from './MediaContextMenuPopover';
import { Loader2, FolderOpen, AlertTriangle } from 'lucide-react';
import { MediaLinkWithAsset, MediaContextTarget, MediaFolder } from '@/types/mediaLibrary';
import { cn } from '@/lib/utils';

interface MediaLibraryPortalProps {
  /** Chemin racine du scope (ex: "/rh/salaries/dupont-j") */
  rootPath: string;
  /** Autorise les modifications (upload, create, rename, delete) */
  canManage?: boolean;
  /** Titre affiché (optionnel) */
  title?: string;
  /** Classe CSS additionnelle */
  className?: string;
  /** Hauteur du conteneur (défaut: auto, utilise min-h) */
  height?: string;
  /** Callback lors du clic sur un fichier (optionnel, sinon QuickLook) */
  onFileClick?: (link: MediaLinkWithAsset) => void;
  /** Afficher la racine dans le breadcrumb */
  showBreadcrumbRoot?: boolean;
}

export function MediaLibraryPortal({
  rootPath,
  canManage = false,
  title,
  className,
  height,
  onFileClick,
  showBreadcrumbRoot = false,
}: MediaLibraryPortalProps) {
  const media = useScopedMediaLibrary({ rootPath });

  const isLoading = media.isLoading;

  // Quick Look navigation
  const currentLinkIndex = useMemo(() => {
    if (!media.quickLook.link) return -1;
    return media.links.findIndex(l => l.id === media.quickLook.link?.id);
  }, [media.links, media.quickLook.link]);

  const handleQuickLookPrevious = useCallback(() => {
    if (currentLinkIndex > 0) {
      media.openQuickLook(media.links[currentLinkIndex - 1]);
    }
  }, [currentLinkIndex, media.links, media.openQuickLook]);

  const handleQuickLookNext = useCallback(() => {
    if (currentLinkIndex < media.links.length - 1) {
      media.openQuickLook(media.links[currentLinkIndex + 1]);
    }
  }, [currentLinkIndex, media.links, media.openQuickLook]);

  const handleQuickLookDownload = useCallback(() => {
    if (media.quickLook.link) {
      media.downloadFile(media.quickLook.link);
    }
  }, [media.quickLook.link, media.downloadFile]);

  const handleFileClick = useCallback((link: MediaLinkWithAsset) => {
    if (onFileClick) {
      onFileClick(link);
    } else {
      media.openQuickLook(link);
    }
  }, [onFileClick, media.openQuickLook]);

  // Breadcrumbs filtering (optionally hide root)
  const displayBreadcrumbs = useMemo(() => {
    if (showBreadcrumbRoot) return media.breadcrumbs;
    // Skip first item (root folder)
    return media.breadcrumbs.slice(1);
  }, [media.breadcrumbs, showBreadcrumbRoot]);

  // Not ready - root folder doesn't exist
  if (!isLoading && !media.isReady) {
    return (
      <div className={cn(
        "border border-border/40 rounded-2xl bg-card/80 p-8",
        className
      )}>
        <div className="flex flex-col items-center justify-center text-muted-foreground gap-4">
          <AlertTriangle className="h-12 w-12 opacity-50" />
          <div className="text-center">
            <p className="font-medium">Dossier non trouvé</p>
            <p className="text-sm mt-1">Le chemin "{rootPath}" n'existe pas encore</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col border border-border/40 rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden shadow-warm",
        className
      )}
      style={{ height: height || 'auto', minHeight: '400px' }}
    >
      {/* Header with title */}
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-muted/30">
          <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
      )}

      {/* Toolbar */}
      <MediaToolbar
        viewMode={media.viewMode}
        onViewModeChange={media.setViewMode}
        filters={media.filters}
        onFiltersChange={media.setFilters}
        currentFolderId={media.currentFolderId}
        onUpload={canManage ? (file) => {
          if (media.currentFolderId) {
            media.uploadFile.mutate({ file, folderId: media.currentFolderId });
          }
        } : undefined}
        onCreateFolder={canManage ? (name) => {
          media.createFolder.mutate({ name, parentId: media.currentFolderId });
        } : undefined}
      />

      {/* Breadcrumb */}
      <MediaBreadcrumbNav
        breadcrumbs={displayBreadcrumbs}
        onNavigate={media.navigateToFolder}
        onNavigateRoot={media.navigateToRoot}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <MediaFolderGrid
            folders={media.folders}
            links={media.links}
            selection={media.selection}
            onFolderClick={media.navigateToFolder}
            onFileClick={handleFileClick}
            onSelect={media.toggleSelection}
            onContextMenu={canManage ? media.openContextMenu : undefined}
            onDownload={media.downloadFile}
          />
        )}
      </div>

      {/* Quick Look Modal */}
      <MediaQuickLook
        state={media.quickLook}
        onClose={media.closeQuickLook}
        onDownload={handleQuickLookDownload}
        onPrevious={handleQuickLookPrevious}
        onNext={handleQuickLookNext}
        hasPrevious={currentLinkIndex > 0}
        hasNext={currentLinkIndex < media.links.length - 1}
        getSignedUrl={media.getSignedUrl}
      />

      {/* Context Menu (only if canManage) */}
      {canManage && media.contextMenu && (
        <MediaContextMenuPopover
          x={media.contextMenu.x}
          y={media.contextMenu.y}
          target={media.contextMenu.target}
          onClose={media.closeContextMenu}
          onPreview={(link: MediaLinkWithAsset) => media.openQuickLook(link)}
          onDownload={(link: MediaLinkWithAsset) => media.downloadFile(link)}
          onRename={(target: MediaContextTarget) => {
            if (target.type === 'folder') {
              const folder = target.data as MediaFolder;
              const name = prompt('Nouveau nom :', folder.name);
              if (name) media.renameFolder.mutate({ folderId: folder.id, newName: name });
            } else {
              const link = target.data as MediaLinkWithAsset;
              const name = prompt('Nouveau nom :', link.label || link.asset?.file_name);
              if (name) media.renameFile.mutate({ linkId: link.id, newName: name });
            }
          }}
          onDelete={(target: MediaContextTarget) => {
            if (target.type === 'folder') {
              if (confirm('Supprimer ce dossier ?')) media.deleteFolder.mutate(target.data.id);
            } else {
              if (confirm('Supprimer ce fichier ?')) media.deleteFile.mutate(target.data.id);
            }
          }}
          onNewFolder={() => {
            const name = prompt('Nom du dossier :');
            if (name) media.createFolder.mutate({ name, parentId: media.currentFolderId });
          }}
        />
      )}
    </div>
  );
}
