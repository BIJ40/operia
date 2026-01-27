/**
 * Quick Look - Prévisualisation directe du document style macOS
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Download, 
  ExternalLink,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface DocumentData {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
}

interface DocumentQuickLookProps {
  document: DocumentData | null;
  documents: DocumentData[];
  onClose: () => void;
  onDownload: (doc: DocumentData) => void;
}

export function DocumentQuickLook({
  document,
  documents,
  onClose,
  onDownload,
}: DocumentQuickLookProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    const { data, error } = await supabase.storage
      .from('rh-documents')
      .createSignedUrl(filePath, 3600);
    
    if (!error && data) {
      setSignedUrl(data.signedUrl);
    }
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
    if (e.key === ' ') {
      e.preventDefault();
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  if (!currentDoc) return null;

  const displayDoc = documents[currentIndex] || currentDoc;
  const isImage = displayDoc.file_type?.startsWith('image/');
  const isPDF = displayDoc.file_type === 'application/pdf';
  const canPreview = isImage || isPDF;

  return (
    <Dialog open={!!document} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50",
          isFullscreen 
            ? "max-w-[95vw] w-[95vw] h-[95vh]" 
            : "max-w-4xl w-full h-[80vh]"
        )}
        onKeyDown={handleKeyDown}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Aperçu de {displayDoc.title}</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="font-semibold truncate">{displayDoc.title}</h3>
            <p className="text-sm text-muted-foreground">
              {currentIndex + 1} sur {documents.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title="Plein écran (Espace)"
              className="h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(displayDoc)}
              className="gap-2 h-8"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Télécharger</span>
            </Button>
            {signedUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="gap-2 h-8"
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

        {/* Content - Preview Area */}
        <div className="flex-1 relative bg-muted/10 overflow-hidden min-h-0">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : signedUrl && canPreview ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
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
              <FileText className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Aperçu non disponible</p>
              <p className="text-sm">Téléchargez le fichier pour le consulter</p>
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

          {/* Navigation arrows */}
          {documents.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg',
                  'bg-background/90 backdrop-blur-sm hover:bg-background',
                  currentIndex === 0 && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className={cn(
                  'absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg',
                  'bg-background/90 backdrop-blur-sm hover:bg-background',
                  currentIndex === documents.length - 1 && 'opacity-50 cursor-not-allowed'
                )}
                onClick={handleNext}
                disabled={currentIndex === documents.length - 1}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
