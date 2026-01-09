/**
 * Page Mes Documents - Coffre-fort RH du technicien
 */
import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Download, File, Loader2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMyDocuments, useDownloadDocument } from '@/hooks/rh-employee';
import { toast } from 'sonner';

export default function TechDocumentsPage() {
  const { data: documents = [], isLoading } = useMyDocuments();
  const { downloadDocument } = useDownloadDocument();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (filePath: string, fileName: string, docId: string) => {
    setDownloading(docId);
    try {
      await downloadDocument(filePath, fileName);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
    setDownloading(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header avec retour */}
      <div className="flex items-center gap-3">
        <Link to="/t/rh-parc">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-lg font-bold">Mes documents</h1>
          <p className="text-xs text-muted-foreground">Coffre-fort RH</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-sm">Aucun document disponible</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg border divide-y divide-border">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{doc.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {doc.period_month && doc.period_year
                      ? format(new Date(doc.period_year, doc.period_month - 1), 'MMMM yyyy', { locale: fr })
                      : format(new Date(doc.created_at!), 'd MMM yyyy', { locale: fr })}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDownload(doc.file_path, doc.file_name, doc.id)}
                disabled={downloading === doc.id}
              >
                {downloading === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
