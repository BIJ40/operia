/**
 * Page Coffre-fort RH - Vue salarié
 * Consultation des documents RH personnels
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen } from 'lucide-react';
import { useMyDocuments } from '@/hooks/useCollaboratorDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { HRDocumentViewer } from '@/components/collaborators/documents';

export default function MonCoffreRH() {
  const queryClient = useQueryClient();
  const { documents, isLoading, error, downloadDocument, getSignedUrl } = useMyDocuments();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ['my-documents'] });
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-l-4 border-l-destructive bg-gradient-to-br from-destructive/5 via-background to-background">
          <CardContent className="py-10 text-center space-y-4">
            <p className="text-destructive">Erreur lors du chargement de vos documents.</p>
            <Button variant="outline" onClick={handleRetry}>
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bloc Coffre-fort documents - Finder RH */}
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
            <h3 className="font-semibold">Mes documents RH</h3>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <HRDocumentViewer
              documents={documents}
              isLoading={isLoading}
              onDownload={downloadDocument}
              getSignedUrl={getSignedUrl}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
