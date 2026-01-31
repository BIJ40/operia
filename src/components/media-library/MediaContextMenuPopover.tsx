/**
 * MediaContextMenuPopover - Menu contextuel positionné pour la médiathèque
 */

import { useEffect, useRef } from 'react';
import { MediaContextTarget, MediaLinkWithAsset, MediaFolder } from '@/types/mediaLibrary';
import {
  Download,
  Eye,
  Pencil,
  Trash2,
  FolderPlus,
  FileText,
} from 'lucide-react';

interface MediaContextMenuPopoverProps {
  x: number;
  y: number;
  target: MediaContextTarget | null;
  onClose: () => void;
  onPreview?: (link: MediaLinkWithAsset) => void;
  onDownload?: (link: MediaLinkWithAsset) => void;
  onRename?: (target: MediaContextTarget) => void;
  onDelete?: (target: MediaContextTarget) => void;
  onNewFolder?: () => void;
}

export function MediaContextMenuPopover({
  x,
  y,
  target,
  onClose,
  onPreview,
  onDownload,
  onRename,
  onDelete,
  onNewFolder,
}: MediaContextMenuPopoverProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const isFile = target?.type === 'file';
  const isFolder = target?.type === 'folder';
  const isSystem = isFolder && (target?.data as MediaFolder)?.is_system;

  // Compute position to stay in viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: Math.min(y, window.innerHeight - 250),
    left: Math.min(x, window.innerWidth - 200),
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="w-52 bg-popover border rounded-lg shadow-lg py-1 text-sm"
    >
      {/* No target = background menu */}
      {!target && (
        <>
          {onNewFolder && (
            <button
              onClick={() => { onNewFolder(); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
            >
              <FolderPlus className="w-4 h-4" />
              Nouveau dossier
            </button>
          )}
        </>
      )}

      {/* File actions */}
      {isFile && target && (
        <>
          {onPreview && (
            <button
              onClick={() => { onPreview(target.data as MediaLinkWithAsset); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
            >
              <Eye className="w-4 h-4" />
              Aperçu rapide
            </button>
          )}
          {onDownload && (
            <button
              onClick={() => { onDownload(target.data as MediaLinkWithAsset); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
          )}
          <div className="h-px bg-border my-1" />
        </>
      )}

      {/* Rename (non-system) */}
      {target && !isSystem && onRename && (
        <button
          onClick={() => { onRename(target); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <Pencil className="w-4 h-4" />
          Renommer
        </button>
      )}

      {/* Info */}
      {target && (
        <button
          onClick={() => { onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
        >
          <FileText className="w-4 h-4" />
          Informations
        </button>
      )}

      {/* Delete (non-system) */}
      {target && !isSystem && onDelete && (
        <>
          <div className="h-px bg-border my-1" />
          <button
            onClick={() => { onDelete(target); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Mettre à la corbeille
          </button>
        </>
      )}
    </div>
  );
}
