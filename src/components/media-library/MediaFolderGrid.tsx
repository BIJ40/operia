/**
 * MediaFolderGrid - Grille de dossiers et fichiers style Finder avec drag & drop
 */

import { useState } from 'react';
import { MediaFolder, MediaLinkWithAsset, MediaSelection, MediaContextTarget } from '@/types/mediaLibrary';
import { cn } from '@/lib/utils';
import { Folder, FileText, FileImage, FileVideo, FileAudio, File } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface MediaFolderGridProps {
  folders: MediaFolder[];
  links: MediaLinkWithAsset[];
  selection: MediaSelection[];
  onFolderClick: (folderId: string) => void;
  onFileClick: (link: MediaLinkWithAsset) => void;
  onSelect: (type: 'folder' | 'file', id: string, multiSelect?: boolean) => void;
  onContextMenu: (e: React.MouseEvent, target: MediaContextTarget | null) => void;
  onDownload: (link: MediaLinkWithAsset) => void;
  onMoveFile?: (linkId: string, targetFolderId: string) => void;
  onMoveFolder?: (folderId: string, targetFolderId: string) => void;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType.includes('pdf') || mimeType.includes('document')) return FileText;
  return File;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Composant dossier droppable
function DroppableFolder({
  folder,
  isSelected,
  onSelect,
  onFolderClick,
  onContextMenu,
}: {
  folder: MediaFolder;
  isSelected: boolean;
  onSelect: (type: 'folder' | 'file', id: string, multiSelect?: boolean) => void;
  onFolderClick: (folderId: string) => void;
  onContextMenu: (e: React.MouseEvent, target: MediaContextTarget | null) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `folder-drop-${folder.id}`,
    data: { type: 'folder', folder },
  });

  return (
    <button
      ref={setNodeRef}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          onSelect('folder', folder.id, true);
        } else {
          onSelect('folder', folder.id);
        }
      }}
      onDoubleClick={() => onFolderClick(folder.id)}
      onContextMenu={(e) => onContextMenu(e, { type: 'folder', data: folder })}
      className={cn(
        "group flex flex-col items-center p-4 rounded-2xl transition-all border-2",
        "hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/40",
        isSelected && "bg-muted/80 ring-2 ring-primary/40 border-border/50",
        isOver 
          ? "border-primary bg-primary/10 scale-105" 
          : "border-transparent hover:border-border/40"
      )}
    >
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105",
        folder.is_system ? "bg-primary/10" : "bg-muted/40",
        isOver && "bg-primary/20"
      )}>
        <Folder className={cn(
          "w-8 h-8",
          folder.is_system ? "text-primary" : "text-muted-foreground",
          isOver && "text-primary"
        )} />
      </div>
      <span className="text-sm font-medium text-center line-clamp-2 w-full">
        {folder.name}
      </span>
    </button>
  );
}

// Composant fichier draggable
function DraggableFile({
  link,
  isSelected,
  onSelect,
  onFileClick,
  onContextMenu,
}: {
  link: MediaLinkWithAsset;
  isSelected: boolean;
  onSelect: (type: 'folder' | 'file', id: string, multiSelect?: boolean) => void;
  onFileClick: (link: MediaLinkWithAsset) => void;
  onContextMenu: (e: React.MouseEvent, target: MediaContextTarget | null) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `file-${link.id}`,
    data: { type: 'file', link },
  });

  const Icon = getFileIcon(link.asset.mime_type);
  const fileName = link.label || link.asset.file_name;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) {
          onSelect('file', link.id, true);
        } else {
          onSelect('file', link.id);
        }
      }}
      onDoubleClick={() => onFileClick(link)}
      onContextMenu={(e) => onContextMenu(e, { type: 'file', data: link })}
      className={cn(
        "group flex flex-col items-center p-4 rounded-2xl transition-all border border-transparent cursor-grab active:cursor-grabbing",
        "hover:bg-muted/60 hover:border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/40",
        isSelected && "bg-muted/80 ring-2 ring-primary/40 border-border/50",
        isDragging && "opacity-50"
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-2 transition-transform group-hover:scale-105 overflow-hidden">
        {link.asset.mime_type?.startsWith('image/') ? (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${link.asset.storage_bucket}/${link.asset.storage_path}`}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <Icon className={cn(
          "w-8 h-8 text-muted-foreground",
          link.asset.mime_type?.startsWith('image/') && "hidden"
        )} />
      </div>
      <span className="text-sm font-medium text-center line-clamp-2 w-full">
        {fileName}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatFileSize(link.asset.file_size)}
      </span>
    </button>
  );
}

// Overlay pour le drag
function DragOverlayContent({ link }: { link: MediaLinkWithAsset }) {
  const Icon = getFileIcon(link.asset.mime_type);
  const fileName = link.label || link.asset.file_name;

  return (
    <div className="flex flex-col items-center p-4 rounded-2xl bg-card border-2 border-primary shadow-lg">
      <div className="w-16 h-16 rounded-2xl bg-muted/40 flex items-center justify-center mb-2 overflow-hidden">
        {link.asset.mime_type?.startsWith('image/') ? (
          <img
            src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${link.asset.storage_bucket}/${link.asset.storage_path}`}
            alt={fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-8 h-8 text-muted-foreground" />
        )}
      </div>
      <span className="text-sm font-medium text-center line-clamp-2 w-full">
        {fileName}
      </span>
    </div>
  );
}

export function MediaFolderGrid({
  folders,
  links,
  selection,
  onFolderClick,
  onFileClick,
  onSelect,
  onContextMenu,
  onDownload,
  onMoveFile,
  onMoveFolder,
}: MediaFolderGridProps) {
  const [activeLink, setActiveLink] = useState<MediaLinkWithAsset | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Nécessite 8px de mouvement avant de démarrer le drag
      },
    })
  );

  const isEmpty = folders.length === 0 && links.length === 0;

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === 'file') {
      setActiveLink(data.link);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLink(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // File dropped on folder
    if (activeData?.type === 'file' && overData?.type === 'folder') {
      const link = activeData.link as MediaLinkWithAsset;
      const targetFolder = overData.folder as MediaFolder;
      
      // Don't move to same folder
      if (link.folder_id !== targetFolder.id) {
        onMoveFile?.(link.id, targetFolder.id);
      }
    }
  };

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <Folder className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Dossier vide
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-sm">
          Glissez-déposez des fichiers ici ou utilisez le bouton "Nouveau" pour créer un dossier.
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {/* Folders (droppable) */}
        {folders.map((folder) => {
          const isSelected = selection.some(s => s.type === 'folder' && s.id === folder.id);
          
          return (
            <DroppableFolder
              key={folder.id}
              folder={folder}
              isSelected={isSelected}
              onSelect={onSelect}
              onFolderClick={onFolderClick}
              onContextMenu={onContextMenu}
            />
          );
        })}

        {/* Files (draggable) */}
        {links.map((link) => {
          const isSelected = selection.some(s => s.type === 'file' && s.id === link.id);
          
          return (
            <DraggableFile
              key={link.id}
              link={link}
              isSelected={isSelected}
              onSelect={onSelect}
              onFileClick={onFileClick}
              onContextMenu={onContextMenu}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLink ? <DragOverlayContent link={activeLink} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
