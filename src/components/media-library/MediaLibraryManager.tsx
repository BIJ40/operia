/**
 * MediaLibraryManager - Interface Finder principale
 */

import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { MediaSidebar } from './MediaSidebar';
import { MediaFolderGrid } from './MediaFolderGrid';
import { MediaBreadcrumbNav } from './MediaBreadcrumbNav';
import { MediaToolbar } from './MediaToolbar';
import { Loader2 } from 'lucide-react';

export function MediaLibraryManager() {
  const media = useMediaLibrary();

  const isLoading = media.foldersLoading || media.linksLoading;

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[500px] border rounded-xl bg-background overflow-hidden">
      {/* Sidebar */}
      <MediaSidebar
        currentFolderId={media.currentFolderId}
        onNavigate={media.navigateToFolder}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <MediaToolbar
          viewMode={media.viewMode}
          onViewModeChange={media.setViewMode}
          filters={media.filters}
          onFiltersChange={media.setFilters}
          currentFolderId={media.currentFolderId}
          onUpload={(file) => {
            if (media.currentFolderId) {
              media.uploadFile.mutate({ file, folderId: media.currentFolderId });
            }
          }}
          onCreateFolder={(name) => {
            media.createFolder.mutate({ name, parentId: media.currentFolderId });
          }}
        />

        {/* Breadcrumb */}
        <MediaBreadcrumbNav
          breadcrumbs={media.breadcrumbs}
          onNavigate={media.navigateToFolder}
          onNavigateRoot={media.navigateToRoot}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <MediaFolderGrid
              folders={media.folders}
              links={media.links}
              selection={media.selection}
              onFolderClick={media.navigateToFolder}
              onFileClick={media.openQuickLook}
              onSelect={media.toggleSelection}
              onContextMenu={media.openContextMenu}
              onDownload={media.downloadFile}
            />
          )}
        </div>
      </div>
    </div>
  );
}
