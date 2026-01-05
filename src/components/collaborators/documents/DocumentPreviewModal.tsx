/**
 * Modal de prévisualisation de document - Finder RH
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { CollaboratorDocument } from '@/types/collaboratorDocument';
import { 
  X, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewModalProps {
  document: CollaboratorDocument | null;
  documents: CollaboratorDocument[];
  onClose: () => void;
  onDownload: (doc: CollaboratorDocument) => void;
  getSignedUrl: (filePath: string) => Promise<string | null>;
}

export function DocumentPreviewModal({
  document,
  documents,
  onClose,
  onDownload,
  getSignedUrl,
}: DocumentPreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentDoc = document;

  useEffect(() => {
    if (currentDoc) {
      const index = documents.findIndex((d) => d.id === currentDoc.id);
      setCurrentIndex(index >= 0 ? index : 0);
      loadSignedUrl(currentDoc.file_path);
    }
  }, [currentDoc?.id]);

  const loadSignedUrl = async (filePath: string) => {
    setIsLoading(true);
    setSignedUrl(null);
    const url = await getSignedUrl(filePath);
    setSignedUrl(url);
    setIsLoading(false);
  };

  const navigateTo = (newIndex: number) => {
    if (newIndex >= 0 && newIndex < documents.length) {
      const newDoc = documents[newIndex];
      setCurrentIndex(newIndex);
      loadSignedUrl(newDoc.file_path);
    }
  };

  const handlePrevious = () => navigateTo(currentIndex - 1);
  const handleNext = () => navigateTo(currentIndex + 1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onClose();
  };

  if (!currentDoc) return null;

  const displayDoc = documents[currentIndex] || currentDoc;
  const isImage = displayDoc.file_type?.startsWith('image/');
  const isPDF = displayDoc.file_type === 'application/pdf';
  const canPreview = isImage || isPDF;

  return (
    <Dialog open={!!document} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl w-full h-[90vh] sm:h-[90vh] max-h-[100dvh] p-0 gap-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Aperçu de {displayDoc.title}</DialogTitle>
        </VisuallyHidden>
        {/* Header - Responsive */}
        <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b bg-muted/30">
          <div className="flex-1 min-w-0 mr-2">
            <h3 className="font-semibold truncate text-sm sm:text-base">{displayDoc.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {currentIndex + 1} / {documents.length}
            </p>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(displayDoc)}
              className="gap-1 sm:gap-2 h-8 px-2 sm:px-3"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            {signedUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(signedUrl, '_blank')}
                className="gap-1 sm:gap-2 h-8 px-2 sm:px-3"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">Ouvrir</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content - Responsive */}
        <div className="flex-1 relative bg-muted/10 overflow-hidden min-h-0">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signedUrl && canPreview ? (
            <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
              {isImage ? (
                <img
                  src={signedUrl}
                  alt={displayDoc.title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              ) : isPDF ? (
                <iframe
                  src={signedUrl}
                  title={displayDoc.title}
                  className="w-full h-full rounded-lg border"
                />
              ) : null}
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mb-4 opacity-30" />
              <p className="text-base sm:text-lg font-medium text-center">Aperçu non disponible</p>
              <p className="text-xs sm:text-sm text-center">Téléchargez le fichier pour le consulter</p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => onDownload(displayDoc)}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </div>
          )}

          {/* Navigation arrows - Responsive */}
          {documents.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg',
                  'bg-background/90 backdrop-blur-sm hover:bg-background',
                  currentIndex === 0 && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg',
                  'bg-background/90 backdrop-blur-sm hover:bg-background',
                  currentIndex === documents.length - 1 && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handleNext}
                disabled={currentIndex === documents.length - 1}
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
