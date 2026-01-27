/**
 * Section Documents - Version compacte Finder
 */

import React from 'react';
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
import { DocumentFinderItem } from '@/components/rh/tabs/components/DocumentFinderItem';
import { DocumentQuickLook } from '@/components/rh/tabs/components/DocumentQuickLook';
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

export function RHSectionDocuments({ collaborator }: Props) {
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

  const handleBackgroundClick = () => {
    setSelectedDocId(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div onClick={handleBackgroundClick}>
      {/* Header compact */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{documents.length} fichier(s)</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded p-0.5 bg-muted/50">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded',
                viewMode === 'grid' && 'bg-background shadow-sm'
              )}
              onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-6 w-6 rounded',
                viewMode === 'list' && 'bg-background shadow-sm'
              )}
              onClick={(e) => { e.stopPropagation(); setViewMode('list'); }}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1.5 h-7" 
            onClick={(e) => { e.stopPropagation(); setShowUploadDialog(true); }}
          >
            <Upload className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Documents */}
      {documents.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun document</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 p-2 bg-muted/20 rounded-lg border">
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
        <div className="space-y-0.5 p-2 bg-muted/20 rounded-lg border">
          {documents.map(doc => (
            <div
              key={doc.id}
              className={cn(
                'flex items-center gap-2 p-1.5 rounded hover:bg-muted/60 cursor-pointer transition-colors text-xs',
                selectedDocId === doc.id && 'bg-primary/10 ring-1 ring-primary'
              )}
              onClick={(e) => handleSelect(doc.id, e)}
              onDoubleClick={() => setPreviewDoc(doc)}
            >
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                {doc.file_type?.startsWith('image/') ? (
                  <span className="text-[6px] font-bold text-primary">IMG</span>
                ) : doc.file_type === 'application/pdf' ? (
                  <span className="text-[6px] font-bold text-destructive">PDF</span>
                ) : (
                  <span className="text-[6px] font-bold text-muted-foreground">DOC</span>
                )}
              </div>
              <span className="flex-1 truncate">{doc.title}</span>
              <span className="text-muted-foreground shrink-0">
                {new Date(doc.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Look */}
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
