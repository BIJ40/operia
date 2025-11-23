import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye } from 'lucide-react';

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_path: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
}

interface DocumentsListProps {
  blockId: string;
  scope: 'apogee' | 'apporteur' | 'helpconfort';
}

export function DocumentsList({ blockId, scope }: DocumentsListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, [blockId, scope]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const column = scope === 'apogee' 
        ? 'block_id' 
        : scope === 'apporteur'
        ? 'apporteur_block_id'
        : 'block_id'; // helpconfort uses block_id too
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('scope', scope)
        .eq(column, blockId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = (filePath: string) => {
    const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Documents</h3>
        <Card className="p-4 text-center text-muted-foreground">
          Chargement...
        </Card>
      </div>
    );
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        Documents disponibles
      </h3>
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{doc.title}</h4>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {doc.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(getDownloadUrl(doc.file_path), '_blank')}
                  title="Voir le document"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Voir
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = getDownloadUrl(doc.file_path);
                    link.download = doc.title;
                    link.click();
                  }}
                  title="Télécharger"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Télécharger
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
