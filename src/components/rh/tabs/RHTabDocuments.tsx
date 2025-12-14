/**
 * Onglet Documents
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderOpen, 
  Upload, 
  FileText, 
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RHCollaborator } from '@/types/rh-suivi';
import { RHDocumentPreviewPopup } from '@/components/rh/unified/RHDocumentPreviewPopup';

interface Props {
  collaborator: RHCollaborator;
}

interface CollaboratorDocument {
  id: string;
  title: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  employee_visible: boolean;
  created_at: string;
  period_year: number | null;
  period_month: number | null;
}

export function RHTabDocuments({ collaborator }: Props) {
  const [previewDoc, setPreviewDoc] = React.useState<CollaboratorDocument | null>(null);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['collaborator-documents', collaborator.id],
    queryFn: async (): Promise<CollaboratorDocument[]> => {
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('*')
        .eq('collaborator_id', collaborator.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      payslip: 'Bulletin de paie',
      contract: 'Contrat',
      certificate: 'Attestation',
      medical: 'Médical',
      training: 'Formation',
      other: 'Autre',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Documents ({documents?.length || 0})
        </h3>
        <Button variant="outline" className="gap-2" disabled>
          <Upload className="h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      {/* Documents list */}
      {documents?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Aucun document pour ce collaborateur</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {documents?.map(doc => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="font-medium truncate text-left hover:underline"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        {doc.title}
                      </button>
                      <Badge variant="outline" className="shrink-0">
                        {getDocTypeLabel(doc.doc_type)}
                      </Badge>
                      {doc.employee_visible ? (
                        <Badge variant="secondary" className="gap-1 shrink-0">
                          <Eye className="h-3 w-3" />
                          Visible salarié
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 shrink-0 text-muted-foreground">
                          <EyeOff className="h-3 w-3" />
                          RH uniquement
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      {doc.period_year && doc.period_month && (
                        <span>
                          P&eacute;riode: {format(new Date(doc.period_year, doc.period_month - 1), 'MMMM yyyy', { locale: fr })}
                        </span>
                      )}
                      <span className="text-xs truncate max-w-[200px]">{doc.file_name}</span>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setPreviewDoc(doc)}
                    title="Prévisualiser le document"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {previewDoc && (
            <RHDocumentPreviewPopup
              open={!!previewDoc}
              onOpenChange={(open) => !open && setPreviewDoc(null)}
              title={previewDoc.title}
              filePath={previewDoc.file_path}
              fileName={previewDoc.file_name}
            />
          )}
        </>
      )}
    </div>
  );
}
