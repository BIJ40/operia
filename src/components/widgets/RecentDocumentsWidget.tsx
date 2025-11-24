import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { DashboardWidget } from './DashboardWidget';
import { Button } from '@/components/ui/button';

interface Document {
  id: string;
  title: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

interface RecentDocumentsWidgetProps {
  size?: 'small' | 'medium' | 'large';
  isConfigMode?: boolean;
  onRemove?: () => void;
}

export function RecentDocumentsWidget({ size = 'medium', isConfigMode, onRemove }: RecentDocumentsWidgetProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <DashboardWidget
      title="Documents récents"
      description="Accès rapide aux derniers documents"
      size={size}
      isConfigMode={isConfigMode}
      onRemove={onRemove}
    >
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <FileText className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">Aucun document disponible</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium truncate">{doc.title}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 flex-shrink-0"
                onClick={() => downloadDocument(doc)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardWidget>
  );
}
