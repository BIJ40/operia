/**
 * MediaContextMenu - Menu contextuel pour dossiers et fichiers
 */

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Download,
  Eye,
  Pencil,
  Trash2,
  FolderInput,
  Copy,
  FileText,
} from 'lucide-react';
import { MediaContextTarget } from '@/types/mediaLibrary';

interface MediaContextMenuProps {
  children: React.ReactNode;
  target: MediaContextTarget | null;
  onPreview?: () => void;
  onDownload?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onGetInfo?: () => void;
}

export function MediaContextMenu({
  children,
  target,
  onPreview,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onGetInfo,
}: MediaContextMenuProps) {
  const isFile = target?.type === 'file';
  const isFolder = target?.type === 'folder';
  const isSystem = target?.isSystem ?? false;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Preview - files only */}
        {isFile && onPreview && (
          <ContextMenuItem onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            Aperçu rapide
          </ContextMenuItem>
        )}

        {/* Download - files only */}
        {isFile && onDownload && (
          <ContextMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </ContextMenuItem>
        )}

        {(isFile && (onPreview || onDownload)) && <ContextMenuSeparator />}

        {/* Rename - not for system folders */}
        {!isSystem && onRename && (
          <ContextMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            Renommer
          </ContextMenuItem>
        )}

        {/* Move */}
        {!isSystem && onMove && (
          <ContextMenuItem onClick={onMove}>
            <FolderInput className="mr-2 h-4 w-4" />
            Déplacer vers...
          </ContextMenuItem>
        )}

        {/* Copy - files only */}
        {isFile && onCopy && (
          <ContextMenuItem onClick={onCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Copier dans...
          </ContextMenuItem>
        )}

        {(!isSystem && (onRename || onMove || onCopy)) && <ContextMenuSeparator />}

        {/* Get Info */}
        {onGetInfo && (
          <ContextMenuItem onClick={onGetInfo}>
            <FileText className="mr-2 h-4 w-4" />
            Informations
          </ContextMenuItem>
        )}

        {/* Delete - not for system folders */}
        {!isSystem && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Mettre à la corbeille
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
