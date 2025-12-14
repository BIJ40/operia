import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface RHDocumentPreviewPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  filePath: string;
  fileName: string;
  onReplace?: () => void;
}

export function RHDocumentPreviewPopup({
  open,
  onOpenChange,
  title,
  filePath,
  fileName,
  onReplace,
}: RHDocumentPreviewPopupProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);

  useEffect(() => {
    if (open && filePath) {
      setLoading(true);
      supabase.storage
        .from('rh-documents')
        .createSignedUrl(filePath, 3600)
        .then(({ data }) => {
          setSignedUrl(data?.signedUrl || null);
          setLoading(false);
        });
    }
  }, [open, filePath]);

  const handleDownload = () => {
    if (signedUrl) {
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = fileName;
      a.click();
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : signedUrl ? (
            <div className="h-80 border rounded-lg overflow-hidden bg-muted/30">
              {isImage ? (
                <img
                  src={signedUrl}
                  alt={title}
                  className="w-full h-full object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={signedUrl}
                  className="w-full h-full"
                  title={title}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <FileText className="h-16 w-16 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Prévisualisation non disponible</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Impossible de charger le document
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={!signedUrl}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenExternal} disabled={!signedUrl}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ouvrir
          </Button>
          {onReplace && (
            <Button variant="ghost" size="sm" onClick={onReplace} className="ml-auto">
              <Upload className="h-4 w-4 mr-2" />
              Remplacer
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
