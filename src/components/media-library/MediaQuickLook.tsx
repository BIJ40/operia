/**
 * MediaQuickLook - Aperçu rapide des fichiers (style macOS)
 */

import { useEffect, useCallback, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  Loader2,
} from 'lucide-react';
import { MediaQuickLookState, MediaLinkWithAsset } from '@/types/mediaLibrary';
import { cn } from '@/lib/utils';

interface MediaQuickLookProps {
  state: MediaQuickLookState;
  onClose: () => void;
  onDownload?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  getSignedUrl: (assetId: string, linkId?: string) => Promise<string | null>;
}

export function MediaQuickLook({
  state,
  onClose,
  onDownload,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  getSignedUrl,
}: MediaQuickLookProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { isOpen, asset, link } = state;

  // Load preview URL
  useEffect(() => {
    if (!isOpen || !asset || !link) {
      setPreviewUrl(null);
      return;
    }

    const loadUrl = async () => {
      setLoading(true);
      try {
        const url = await getSignedUrl(asset.id, link.id);
        setPreviewUrl(url);
      } finally {
        setLoading(false);
      }
    };

    loadUrl();
  }, [isOpen, asset, link, getSignedUrl]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (hasPrevious) onPrevious?.();
          break;
        case 'ArrowRight':
          if (hasNext) onNext?.();
          break;
        case ' ':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);

  if (!asset || !link) return null;

  const mimeType = asset.mime_type || '';
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');

  const getFileIcon = () => {
    if (isImage) return FileImage;
    if (isPdf) return FileText;
    if (isVideo) return FileVideo;
    if (isAudio) return FileAudio;
    return File;
  };

  const FileIcon = getFileIcon();

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Taille inconnue';
    const units = ['o', 'Ko', 'Mo', 'Go'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0 gap-0 flex flex-col" hideCloseButton>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0">
              <h3 className="font-medium truncate">
                {link.label || asset.file_name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(asset.file_size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="ghost" size="icon" onClick={onDownload}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-black/5">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewUrl ? (
            <>
              {isImage && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <img
                    src={previewUrl}
                    alt={link.label || asset.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title={link.label || asset.file_name}
                />
              )}

              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-full"
                  />
                </div>
              )}

              {isAudio && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <FileAudio className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                    <audio src={previewUrl} controls className="w-80" />
                  </div>
                </div>
              )}

              {!isImage && !isPdf && !isVideo && !isAudio && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <FileIcon className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Aperçu non disponible
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={onDownload}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <FileIcon className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Impossible de charger l'aperçu
                </p>
              </div>
            </div>
          )}

          {/* Navigation arrows */}
          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2',
                'bg-background/80 hover:bg-background shadow-md'
              )}
              onClick={onPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2',
                'bg-background/80 hover:bg-background shadow-md'
              )}
              onClick={onNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          Appuyez sur Espace ou Échap pour fermer • ← → pour naviguer
        </div>
      </DialogContent>
    </Dialog>
  );
}
