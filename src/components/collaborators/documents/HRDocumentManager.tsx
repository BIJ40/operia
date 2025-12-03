/**
 * Finder RH - Gestionnaire de documents collaborateur
 * Interface style Finder avec drag & drop, catégories et preview
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderOpen, Loader2, Upload, Grid3X3, List } from 'lucide-react';
import { useCollaboratorDocuments } from '@/hooks/useCollaboratorDocuments';
import { CollaboratorDocument, DocumentType, DocumentVisibility, DOCUMENT_TYPES, DOCUMENT_VISIBILITY } from '@/types/collaboratorDocument';
import { DocumentCategoryTabs } from './DocumentCategoryTabs';
import { DocumentGrid } from './DocumentGrid';
import { DocumentDropzone } from './DocumentDropzone';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { toast } from 'sonner';

interface HRDocumentManagerProps {
  collaboratorId: string;
  canManage: boolean;
}

interface PendingUpload {
  file: File;
  title: string;
  doc_type: DocumentType;
  visibility: DocumentVisibility;
}

export function HRDocumentManager({ collaboratorId, canManage }: HRDocumentManagerProps) {
  const {
    documents,
    isLoading,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
    getSignedUrl,
  } = useCollaboratorDocuments(collaboratorId);

  // State
  const [activeCategory, setActiveCategory] = useState<DocumentType | 'ALL'>('ALL');
  const [previewDoc, setPreviewDoc] = useState<CollaboratorDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<CollaboratorDocument | null>(null);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.doc_type] = (acc[doc.doc_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [documents]);

  // Filter documents by active category
  const filteredDocuments = useMemo(() => {
    if (activeCategory === 'ALL') return documents;
    return documents.filter((doc) => doc.doc_type === activeCategory);
  }, [documents, activeCategory]);

  // Handle files dropped
  const handleFilesDropped = useCallback((files: File[], suggestedType?: DocumentType) => {
    if (!canManage) return;

    const uploads: PendingUpload[] = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: suggestedType || 'OTHER',
      visibility: 'ADMIN_ONLY' as DocumentVisibility,
    }));

    setPendingUploads(uploads);
    setCurrentUploadIndex(0);
    setShowUploadDialog(true);
  }, [canManage]);

  // Handle upload confirmation
  const handleConfirmUpload = async () => {
    const upload = pendingUploads[currentUploadIndex];
    if (!upload) return;

    try {
      await uploadDocument.mutateAsync({
        collaborator_id: collaboratorId,
        doc_type: upload.doc_type,
        title: upload.title,
        visibility: upload.visibility,
        file: upload.file,
      });

      // Move to next upload or close
      if (currentUploadIndex < pendingUploads.length - 1) {
        setCurrentUploadIndex((prev) => prev + 1);
      } else {
        setShowUploadDialog(false);
        setPendingUploads([]);
        setCurrentUploadIndex(0);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Handle rename
  const handleRename = (doc: CollaboratorDocument, newTitle: string) => {
    updateDocument.mutate({ id: doc.id, data: { title: newTitle } });
  };

  // Update pending upload
  const updatePendingUpload = (field: keyof PendingUpload, value: any) => {
    setPendingUploads((prev) => {
      const newUploads = [...prev];
      newUploads[currentUploadIndex] = {
        ...newUploads[currentUploadIndex],
        [field]: value,
      };
      return newUploads;
    });
  };

  const currentUpload = pendingUploads[currentUploadIndex];

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-helpconfort-blue">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Chargement des documents...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
            Documents RH
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Tabs */}
          <DocumentCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            counts={categoryCounts}
            totalCount={documents.length}
          />

          {/* Dropzone (only if can manage) */}
          {canManage && (
            <DocumentDropzone
              onFilesDropped={handleFilesDropped}
              activeCategory={activeCategory}
              isUploading={uploadDocument.isPending}
            />
          )}

          {/* Document Grid */}
          <DocumentGrid
            documents={filteredDocuments}
            onPreview={setPreviewDoc}
            onDownload={downloadDocument}
            onDelete={setDocumentToDelete}
            onRename={handleRename}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        documents={filteredDocuments}
        onClose={() => setPreviewDoc(null)}
        onDownload={downloadDocument}
        getSignedUrl={getSignedUrl}
      />

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Ajouter un document {pendingUploads.length > 1 && `(${currentUploadIndex + 1}/${pendingUploads.length})`}
            </DialogTitle>
          </DialogHeader>

          {currentUpload && (
            <div className="space-y-4 py-4">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{currentUpload.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(currentUpload.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  value={currentUpload.title}
                  onChange={(e) => updatePendingUpload('title', e.target.value)}
                  placeholder="Titre du document"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Type de document</Label>
                <Select
                  value={currentUpload.doc_type}
                  onValueChange={(v) => updatePendingUpload('doc_type', v as DocumentType)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label>Visibilité</Label>
                <Select
                  value={currentUpload.visibility}
                  onValueChange={(v) => updatePendingUpload('visibility', v as DocumentVisibility)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {DOCUMENT_VISIBILITY.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={uploadDocument.isPending || !currentUpload?.title.trim()}
            >
              {uploadDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {currentUploadIndex < pendingUploads.length - 1 ? 'Suivant' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document "{documentToDelete?.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (documentToDelete) {
                  deleteDocument.mutate(documentToDelete);
                  setDocumentToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
