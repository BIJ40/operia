import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Eye, Download, Trash2, Loader2, FileText, ImageIcon, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useTicketAttachments } from '@/apogee-tickets/hooks/useTicketAttachments';

interface TicketAttachmentsManagerProps {
  ticketId: string;
  className?: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string | null) {
  if (fileType?.startsWith('image/')) return ImageIcon;
  return FileText;
}

export function TicketAttachmentsManager({ ticketId, className }: TicketAttachmentsManagerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { attachments, isLoading, isUploading, isDeleting, uploadAttachment, deleteAttachment } = useTicketAttachments(ticketId);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      await uploadAttachment(file);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  const handleOpen = (url?: string) => {
    if (!url) {
      toast.error('Fichier introuvable dans le stockage');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = (url: string | undefined, fileName: string) => {
    if (!url) {
      toast.error('Téléchargement impossible : fichier introuvable');
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <p className="text-sm font-medium">Pièces jointes</p>
          <p className="text-xs text-muted-foreground">Les documents historiques et récents sont fusionnés automatiquement.</p>
        </div>

        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => void handleFilesSelected(event.target.files)}
          />
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Ajouter
          </Button>
        </>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Chargement des pièces jointes...
        </div>
      ) : attachments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune pièce jointe.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.file_type);

            return (
              <Card key={attachment.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="rounded-lg bg-muted p-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-medium break-all">{attachment.file_name}</p>
                          {attachment.source === 'storage' && <Badge variant="outline">Storage seul</Badge>}
                          {attachment.is_missing && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Fichier manquant
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                          <span>{formatFileSize(attachment.file_size)}</span>
                          <span>{format(new Date(attachment.created_at), 'd MMM yyyy à HH:mm', { locale: fr })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button type="button" size="icon" variant="outline" onClick={() => handleOpen(attachment.file_url)} disabled={!attachment.file_url}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="outline" onClick={() => handleDownload(attachment.file_url, attachment.file_name)} disabled={!attachment.file_url}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => deleteAttachment(attachment.id, attachment.file_path, attachment.source)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}