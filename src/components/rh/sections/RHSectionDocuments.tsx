/**
 * Section Documents - Version compacte Finder avec support dossiers
 */

import React, { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  FolderOpen, 
  Upload, 
  LayoutGrid,
  List,
  FolderPlus,
  ChevronRight,
  Home,
  Trash2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RHCollaborator } from '@/types/rh-suivi';
import { RHDocumentUploadPopup } from '@/components/rh/unified/RHDocumentUploadPopup';
import { DocumentFinderItem } from '@/components/rh/tabs/components/DocumentFinderItem';
import { DocumentQuickLook } from '@/components/rh/tabs/components/DocumentQuickLook';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSubfolders } from '@/hooks/useSubfolders';

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
  subfolder: string | null;
}

type ViewMode = 'grid' | 'list';

export function RHSectionDocuments({ collaborator }: Props) {
  const [previewDoc, setPreviewDoc] = React.useState<CollaboratorDocument | null>(null);
  const [showUploadDialog, setShowUploadDialog] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [selectedDocId, setSelectedDocId] = React.useState<string | null>(null);
  const [activeSubfolder, setActiveSubfolder] = React.useState<string | null>(null);
  const [showNewFolderDialog, setShowNewFolderDialog] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  
  const queryClient = useQueryClient();
  const { getSubfolders, addSubfolder, removeSubfolder, syncWithDocuments } = useSubfolders(collaborator.id);

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

  // Get all unique subfolders from documents + persisted folders
  const subfolders = useMemo(() => {
    const persistedFolders = getSubfolders('OTHER');
    const documentFolders = new Set<string>();
    documents.forEach((doc) => {
      if (doc.subfolder) documentFolders.add(doc.subfolder);
    });
    const allFolders = new Set([...persistedFolders, ...documentFolders]);
    return Array.from(allFolders).sort();
  }, [documents, getSubfolders]);

  // Sync document subfolders to localStorage
  React.useEffect(() => {
    const docFolders = documents.filter(d => d.subfolder).map(d => d.subfolder!);
    if (docFolders.length > 0) {
      syncWithDocuments('OTHER', docFolders);
    }
  }, [documents, syncWithDocuments]);

  // Get document count per subfolder
  const subfolderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      if (doc.subfolder) {
        counts[doc.subfolder] = (counts[doc.subfolder] || 0) + 1;
      }
    });
    return counts;
  }, [documents]);

  // Filter documents by active subfolder
  const filteredDocuments = useMemo(() => {
    if (activeSubfolder === null) {
      // At root: show only docs without subfolder
      return documents.filter((doc) => !doc.subfolder);
    }
    return documents.filter((doc) => doc.subfolder === activeSubfolder);
  }, [documents, activeSubfolder]);

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

  const handleCreateSubfolder = useCallback(() => {
    if (!newFolderName.trim()) return;
    const folderName = newFolderName.trim();
    addSubfolder('OTHER', folderName);
    setShowNewFolderDialog(false);
    setNewFolderName('');
    toast.success(`Dossier "${folderName}" créé`);
  }, [newFolderName, addSubfolder]);

  const handleDeleteSubfolder = useCallback((folderName: string) => {
    removeSubfolder('OTHER', folderName);
    if (activeSubfolder === folderName) {
      setActiveSubfolder(null);
    }
    toast.success(`Dossier "${folderName}" supprimé`);
  }, [removeSubfolder, activeSubfolder]);

  const handleUploadSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaborator.id] });
  }, [queryClient, collaborator.id]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div onClick={handleBackgroundClick} className="space-y-3">
      {/* Header compact */}
      <div className="flex items-center justify-between">
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

      {/* Breadcrumb + Navigation dossiers */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm">
          <button
            onClick={(e) => { e.stopPropagation(); setActiveSubfolder(null); }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors",
              activeSubfolder === null && "font-medium text-primary"
            )}
          >
            <Home className="h-3.5 w-3.5" />
            <span>Racine</span>
          </button>
          {activeSubfolder && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="px-2 py-1 font-medium text-primary">{activeSubfolder}</span>
            </>
          )}
        </div>
        
        <div className="flex-1" />
        
        {/* Bouton création dossier */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-7 text-xs"
          onClick={(e) => { e.stopPropagation(); setShowNewFolderDialog(true); }}
        >
          <FolderPlus className="h-3.5 w-3.5" />
          Nouveau dossier
        </Button>
      </div>

      {/* Dossiers (seulement visible à la racine) */}
      {activeSubfolder === null && subfolders.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {subfolders.map(folder => (
            <div
              key={folder}
              className="relative group flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors"
              onClick={(e) => { e.stopPropagation(); setActiveSubfolder(folder); }}
            >
              <FolderOpen className="h-8 w-8 text-helpconfort-orange" />
              <span className="text-xs font-medium text-center truncate max-w-full">{folder}</span>
              {subfolderCounts[folder] && (
                <Badge variant="secondary" className="text-[10px] h-4">
                  {subfolderCounts[folder]}
                </Badge>
              )}
              {/* Delete button for empty folders */}
              {!subfolderCounts[folder] && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubfolder(folder);
                  }}
                  title="Supprimer le dossier vide"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Documents */}
      {filteredDocuments.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">
            {activeSubfolder ? `Aucun document dans "${activeSubfolder}"` : 'Aucun document'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-2 p-2 bg-muted/20 rounded-lg border">
          {filteredDocuments.map(doc => (
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
          {filteredDocuments.map(doc => (
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
        documents={filteredDocuments}
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
        subfolder={activeSubfolder}
        onSuccess={handleUploadSuccess}
      />

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-[320px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateSubfolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSubfolder} disabled={!newFolderName.trim()}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
