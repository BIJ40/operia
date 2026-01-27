/**
 * Onglet Documents - Interface Finder avec prévisualisation directe
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FolderOpen, 
  Upload, 
  LayoutGrid,
  List,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RHCollaborator } from '@/types/rh-suivi';
import { RHDocumentUploadPopup } from '@/components/rh/unified/RHDocumentUploadPopup';
import { DocumentFinderItem } from './components/DocumentFinderItem';
import { DocumentQuickLook } from './components/DocumentQuickLook';
import { cn } from '@/lib/utils';

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
  file_size: number | null;
  created_at: string;
  period_year: number | null;
  period_month: number | null;
}

type ViewMode = 'grid' | 'list';

export function RHTabDocuments({ collaborator }: Props) {
  const [previewDoc, setPreviewDoc] = React.useState<CollaboratorDocument | null>(null);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
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

  const handleDownload = async (doc: CollaboratorDocument) => {
    const { data } = await supabase.storage
      .from('rh-documents')
      .createSignedUrl(doc.file_path, 3600);
    
    if (data?.signedUrl) {
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = doc.file_name;
      a.click();
    }
  };

  const handleOpenExternal = async (doc: CollaboratorDocument) => {
    const { data } = await supabase.storage
      .from('rh-documents')
      .createSignedUrl(doc.file_path, 3600);
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const handleSelect = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocId(docId === selectedDocId ? null : docId);
  };

  // Clear selection on background click
  const handleBackgroundClick = () => {
    setSelectedDocId(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4 p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4" onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
          Documents ({documents.length})
        </h3>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded',
                viewMode === 'grid' && 'bg-background shadow-sm'
              )}
              onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }}
              title="Vue grille"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-7 w-7 rounded',
                viewMode === 'list' && 'bg-background shadow-sm'
              )}
              onClick={(e) => { e.stopPropagation(); setViewMode('list'); }}
              title="Vue liste"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={(e) => { e.stopPropagation(); setShowUploadDialog(true); }}
          >
            <Upload className="h-4 w-4" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Documents Finder Grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun document</p>
            <p className="text-sm mt-1">Cliquez sur "Ajouter" pour importer des fichiers</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 p-2 bg-muted/20 rounded-xl border">
          {documents.map(doc => (
            <DocumentFinderItem
              key={doc.id}
              document={doc}
              onPreview={() => setPreviewDoc(doc)}
              onDownload={() => handleDownload(doc)}
              onOpenExternal={() => handleOpenExternal(doc)}
              canManage
              isSelected={selectedDocId === doc.id}
              onSelect={(e) => handleSelect(doc.id, e)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1 p-2 bg-muted/20 rounded-xl border">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 cursor-pointer transition-colors',
                selectedDocId === doc.id && 'bg-helpconfort-blue/10 ring-1 ring-helpconfort-blue'
              )}
              onClick={(e) => handleSelect(doc.id, e)}
              onDoubleClick={() => setPreviewDoc(doc)}
              onContextMenu={(e) => {
                // Trigger context menu
                e.preventDefault();
              }}
            >
              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                {doc.file_type?.startsWith('image/') ? (
                  <span className="text-[8px] font-bold text-helpconfort-blue">IMG</span>
                ) : doc.file_type === 'application/pdf' ? (
                  <span className="text-[8px] font-bold text-destructive">PDF</span>
                ) : (
                  <span className="text-[8px] font-bold text-muted-foreground">DOC</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(doc.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Look Modal */}
      <DocumentQuickLook
        document={previewDoc}
        documents={documents}
        onClose={() => setPreviewDoc(null)}
        onDownload={handleDownload}
      />
      
      {/* Upload Dialog */}
      <RHDocumentUploadPopup
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        collaboratorId={collaborator.id}
        collaboratorName={`${collaborator.first_name} ${collaborator.last_name}`}
        fieldKey="general"
        fieldLabel="Document"
      />
    </div>
  );
}
