/**
 * Page Coffre-fort RH - Vue salarié
 * Permet aux employés de consulter leurs documents RH visibles
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2, FolderOpen, File } from 'lucide-react';
import { useMyDocuments } from '@/hooks/useCollaboratorDocuments';
import { DOCUMENT_TYPES, DocumentType } from '@/types/collaboratorDocument';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { useQueryClient } from '@tanstack/react-query';

export default function MonCoffreRH() {
  const queryClient = useQueryClient();
  const { documents, isLoading, error, downloadDocument } = useMyDocuments();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['my-documents'] });
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: fr });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDocTypeLabel = (type: DocumentType) => {
    return DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.doc_type as DocumentType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<DocumentType, typeof documents>);

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-10 text-center space-y-4">
              <p className="text-destructive">Erreur lors du chargement de vos documents.</p>
              <Button variant="outline" onClick={handleRetry}>
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Mon Coffre-fort RH
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span>Chargement de vos documents...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun document disponible dans votre coffre-fort.</p>
                <p className="text-sm mt-2">
                  Les documents mis à disposition par votre agence apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedDocuments).map(([type, docs]) => (
                  <div key={type}>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      {getDocTypeLabel(type as DocumentType)}
                      <Badge variant="secondary">{docs.length}</Badge>
                    </h3>
                    <div className="space-y-2">
                      {docs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{doc.title}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{formatDate(doc.created_at)}</span>
                                <span>·</span>
                                <span>{formatFileSize(doc.file_size)}</span>
                                {doc.period_month && doc.period_year && (
                                  <>
                                    <span>·</span>
                                    <span>{`${doc.period_month}/${doc.period_year}`}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => downloadDocument(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
