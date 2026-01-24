/**
 * Finder RH - Gestionnaire de documents collaborateur
 * Interface style Finder avec drag & drop, catégories, sous-dossiers et preview
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin } from '@dnd-kit/core';
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
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Loader2, Upload, Download } from 'lucide-react';
import { useCollaboratorDocuments } from '@/hooks/useCollaboratorDocuments';
import { useSubfolders } from '@/hooks/useSubfolders';
import { useDocumentSearch } from '@/hooks/useDocumentSearch';
import { useRHExport } from '@/hooks/useRHExport';
import { CollaboratorDocument, DocumentType, DocumentVisibility, DOCUMENT_TYPES } from '@/types/collaboratorDocument';
import { DocumentCategoryTabs } from './DocumentCategoryTabs';
import { DocumentGrid } from './DocumentGrid';
import { DocumentDropzone } from './DocumentDropzone';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentBreadcrumb } from './DocumentBreadcrumb';
import { SubfolderButtons } from './SubfolderButtons';
import { DocumentItem } from './DocumentItem';
import { DocumentSearchBar } from './DocumentSearchBar';
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
  subfolder?: string | null;
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

  const { getSubfolders, addSubfolder, removeSubfolder, syncWithDocuments } = useSubfolders(collaboratorId);
  
  // Search hook (P2-02)
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    isSearchLoading, 
    isSearching, 
    startSearch, 
    cancelSearch 
  } = useDocumentSearch(collaboratorId);

  // Export hook (P2-03)
  const { exportDocuments, isExporting } = useRHExport();

  // State
  const [activeCategory, setActiveCategory] = useState<DocumentType | 'ALL'>('ALL');
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CollaboratorDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<CollaboratorDocument | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<CollaboratorDocument | null>(null);
  const [editForm, setEditForm] = useState({ title: '', doc_type: 'OTHER' as DocumentType, visibility: 'ADMIN_ONLY' as DocumentVisibility });
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedDocument, setDraggedDocument] = useState<CollaboratorDocument | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Compute category counts
  const categoryCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.doc_type] = (acc[doc.doc_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [documents]);

  // Get subfolders for active category (from localStorage + documents)
  const subfolders = useMemo(() => {
    if (activeCategory === 'ALL') return [];
    
    // Get persisted subfolders
    const persistedFolders = getSubfolders(activeCategory);
    
    // Get subfolders from documents
    const documentFolders = new Set<string>();
    documents
      .filter((doc) => doc.doc_type === activeCategory && doc.subfolder)
      .forEach((doc) => documentFolders.add(doc.subfolder!));
    
    // Merge and sort
    const allFolders = new Set([...persistedFolders, ...documentFolders]);
    return Array.from(allFolders).sort();
  }, [documents, activeCategory, getSubfolders]);

  // Sync document subfolders to localStorage
  useEffect(() => {
    if (activeCategory !== 'ALL') {
      const documentFolders = documents
        .filter((doc) => doc.doc_type === activeCategory && doc.subfolder)
        .map((doc) => doc.subfolder!);
      if (documentFolders.length > 0) {
        syncWithDocuments(activeCategory, documentFolders);
      }
    }
  }, [documents, activeCategory, syncWithDocuments]);

  // Get document count per subfolder
  const subfolderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    documents
      .filter((doc) => doc.doc_type === activeCategory && doc.subfolder)
      .forEach((doc) => {
        counts[doc.subfolder!] = (counts[doc.subfolder!] || 0) + 1;
      });
    return counts;
  }, [documents, activeCategory]);

  // Filter documents by active category and subfolder (or show search results)
  const filteredDocuments = useMemo(() => {
    // If searching, show search results
    if (isSearching && searchQuery.length >= 2) {
      return searchResults;
    }

    let filtered = documents;
    
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter((doc) => doc.doc_type === activeCategory);
    }
    
    if (activeSubfolder !== null) {
      filtered = filtered.filter((doc) => doc.subfolder === activeSubfolder);
    } else if (activeCategory !== 'ALL') {
      // When in a category but no subfolder selected, show only root docs (no subfolder)
      filtered = filtered.filter((doc) => !doc.subfolder);
    }
    
    return filtered;
  }, [documents, activeCategory, activeSubfolder, isSearching, searchQuery, searchResults]);

  // Handle category change - reset subfolder
  const handleCategoryChange = (category: DocumentType | 'ALL') => {
    setActiveCategory(category);
    setActiveSubfolder(null);
  };

  // Handle files dropped
  const handleFilesDropped = useCallback((files: File[], suggestedType?: DocumentType) => {
    if (!canManage) return;

    const uploads: PendingUpload[] = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: suggestedType || (activeCategory !== 'ALL' ? activeCategory : 'OTHER'),
      visibility: 'ADMIN_ONLY' as DocumentVisibility,
      subfolder: activeSubfolder,
    }));

    setPendingUploads(uploads);
    setCurrentUploadIndex(0);
    setShowUploadDialog(true);
  }, [canManage, activeCategory, activeSubfolder]);

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
        subfolder: upload.subfolder || null,
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

  // Handle create new subfolder
  const handleCreateSubfolder = () => {
    if (!newFolderName.trim() || activeCategory === 'ALL') return;
    
    const folderName = newFolderName.trim();
    addSubfolder(activeCategory, folderName);
    setActiveSubfolder(folderName);
    setShowNewFolderDialog(false);
    setNewFolderName('');
    toast.success(`Dossier "${folderName}" créé`);
  };

  // Handle delete empty subfolder
  const handleDeleteSubfolder = (folderName: string) => {
    if (activeCategory === 'ALL') return;
    removeSubfolder(activeCategory, folderName);
    toast.success(`Dossier "${folderName}" supprimé`);
  };

  // Handle rename
  const handleRename = (doc: CollaboratorDocument, newTitle: string) => {
    updateDocument.mutate({ id: doc.id, data: { title: newTitle } });
  };

  // Handle document selection (Cmd/Ctrl + click for multi-select)
  const handleDocumentSelect = useCallback((docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setSelectedDocIds((prev) => {
      const newSet = new Set(prev);
      
      if (e.metaKey || e.ctrlKey) {
        // Toggle selection
        if (newSet.has(docId)) {
          newSet.delete(docId);
        } else {
          newSet.add(docId);
        }
      } else if (e.shiftKey && prev.size > 0) {
        // Range selection
        const docIds = filteredDocuments.map((d) => d.id);
        const lastSelected = Array.from(prev).pop();
        const lastIndex = docIds.indexOf(lastSelected!);
        const currentIndex = docIds.indexOf(docId);
        const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)];
        docIds.slice(start, end + 1).forEach((id) => newSet.add(id));
      } else {
        // Single selection
        if (newSet.has(docId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(docId);
        }
      }
      
      return newSet;
    });
  }, [filteredDocuments]);

  // Clear selection when category or subfolder changes
  useEffect(() => {
    setSelectedDocIds(new Set());
  }, [activeCategory, activeSubfolder]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const doc = event.active.data.current?.document as CollaboratorDocument;
    const isSelected = event.active.data.current?.isSelected as boolean;
    
    // If dragging a non-selected document, select only it
    if (!isSelected) {
      setSelectedDocIds(new Set([doc.id]));
    }
    
    setDraggedDocument(doc);
  };

  // Handle drag end - move document(s) to new folder
  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedDocument(null);
    
    const { active, over } = event;
    if (!over || !active.data.current?.document) return;

    const targetData = over.data.current;
    if (!targetData) return;

    const newSubfolder = targetData.subfolder as string | null;
    
    // Get all documents to move (selected or just the dragged one)
    const docsToMove = selectedDocIds.size > 0 
      ? filteredDocuments.filter((d) => selectedDocIds.has(d.id))
      : [active.data.current.document as CollaboratorDocument];
    
    // Filter out documents already in target folder
    const docsNeedingMove = docsToMove.filter((d) => d.subfolder !== newSubfolder);
    
    if (docsNeedingMove.length === 0) return;

    // Move all selected documents
    docsNeedingMove.forEach((doc) => {
      updateDocument.mutate({ id: doc.id, data: { subfolder: newSubfolder } });
    });

    toast.success(
      docsNeedingMove.length === 1
        ? newSubfolder 
          ? `Document déplacé vers "${newSubfolder}"` 
          : 'Document déplacé à la racine'
        : newSubfolder
          ? `${docsNeedingMove.length} documents déplacés vers "${newSubfolder}"`
          : `${docsNeedingMove.length} documents déplacés à la racine`
    );
    
    // Clear selection after move
    setSelectedDocIds(new Set());
  };

  // Update pending upload - propagate doc_type/visibility to subsequent files
  const updatePendingUpload = (field: keyof PendingUpload, value: any) => {
    setPendingUploads((prev) => {
      const newUploads = [...prev];
      // Update current document
      newUploads[currentUploadIndex] = {
        ...newUploads[currentUploadIndex],
        [field]: value,
      };
      
      // Propagate doc_type and visibility to subsequent documents for faster batch uploads
      if (field === 'doc_type' || field === 'visibility') {
        for (let i = currentUploadIndex + 1; i < newUploads.length; i++) {
          newUploads[i] = {
            ...newUploads[i],
            [field]: value,
          };
        }
      }
      
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
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card className="border-l-4 border-l-helpconfort-blue bg-gradient-to-br from-helpconfort-blue/5 via-background to-background">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-helpconfort-blue" />
              Documents RH
            </CardTitle>
            <div className="flex items-center gap-2">
              <DocumentSearchBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                isSearching={isSearching}
                onStartSearch={startSearch}
                onCancelSearch={cancelSearch}
                resultCount={searchResults.length}
                isLoading={isSearchLoading}
              />
              {selectedDocIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportDocuments.mutate({ document_ids: Array.from(selectedDocIds) })}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter ({selectedDocIds.size})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category Tabs */}
          <DocumentCategoryTabs
            activeCategory={activeCategory}
            onCategoryChange={handleCategoryChange}
            counts={categoryCounts}
            totalCount={documents.length}
          />

          {/* Breadcrumb + New Folder Button */}
          <DocumentBreadcrumb
            activeCategory={activeCategory}
            activeSubfolder={activeSubfolder}
            onNavigateRoot={() => handleCategoryChange('ALL')}
            onNavigateCategory={() => setActiveSubfolder(null)}
            onCreateFolder={() => setShowNewFolderDialog(true)}
            canManage={canManage}
            isDragging={!!draggedDocument}
          />

          {/* Subfolder buttons + Dropzone row (only when in category, not in subfolder) */}
          {activeCategory !== 'ALL' && !activeSubfolder && (
            <div className="space-y-4">
              {/* Subfolder buttons inline with "+ Nouveau" */}
              {(subfolders.length > 0 || canManage) && (
                <SubfolderButtons
                  subfolders={subfolders}
                  subfolderCounts={subfolderCounts}
                  onFolderClick={setActiveSubfolder}
                  onCreateFolder={() => setShowNewFolderDialog(true)}
                  canManage={canManage}
                />
              )}
            </div>
          )}

          {/* Dropzone (only if can manage) */}
          {canManage && (
            <DocumentDropzone
              onFilesDropped={handleFilesDropped}
              activeCategory={activeCategory}
              isUploading={uploadDocument.isPending}
            />
          )}

          {/* Selection info */}
          {selectedDocIds.size > 0 && (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-helpconfort-blue/10 border border-helpconfort-blue/30">
              <Badge variant="secondary" className="bg-helpconfort-blue text-white">
                {selectedDocIds.size} sélectionné{selectedDocIds.size > 1 ? 's' : ''}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Glissez pour déplacer • Cmd/Ctrl+clic pour sélectionner plusieurs
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDocIds(new Set())}
                className="ml-auto"
              >
                Désélectionner
              </Button>
            </div>
          )}

          {/* Document Grid */}
          <DocumentGrid
            documents={filteredDocuments}
            onPreview={setPreviewDoc}
            onDownload={downloadDocument}
            onDelete={setDocumentToDelete}
            onEdit={(doc) => {
              setDocumentToEdit(doc);
              setEditForm({ title: doc.title, doc_type: doc.doc_type, visibility: doc.visibility });
            }}
            onRename={handleRename}
            canManage={canManage}
            selectedIds={selectedDocIds}
            onSelect={handleDocumentSelect}
          />
        </CardContent>
      </Card>

      {/* Drag Overlay */}
      <DragOverlay>
        {draggedDocument && (
          <div className="opacity-90 scale-105 pointer-events-none relative">
            <DocumentItem
              document={draggedDocument}
              onPreview={() => {}}
              onDownload={() => {}}
              onDelete={() => {}}
              onEdit={() => {}}
              onRename={() => {}}
              canManage={false}
            />
            {selectedDocIds.size > 1 && (
              <Badge 
                className="absolute -top-2 -right-2 bg-helpconfort-blue text-white shadow-lg"
              >
                {selectedDocIds.size}
              </Badge>
            )}
          </div>
        )}
      </DragOverlay>

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

              {/* Visibility - supprimé: tous les documents sont maintenant RH uniquement */}
            </div>
          )}

          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Annuler
            </Button>
            {pendingUploads.length > 1 && (
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!currentUpload) return;
                  // Apply current settings to all and upload all
                  const uploadsToProcess = pendingUploads.map(u => ({
                    ...u,
                    doc_type: currentUpload.doc_type,
                    visibility: currentUpload.visibility,
                    subfolder: currentUpload.subfolder
                  }));
                  
                  setShowUploadDialog(false);
                  
                  for (const upload of uploadsToProcess) {
                    await uploadDocument.mutateAsync({
                      collaborator_id: collaboratorId,
                      file: upload.file,
                      title: upload.title,
                      doc_type: upload.doc_type,
                      visibility: upload.visibility,
                      subfolder: upload.subfolder || null,
                    });
                  }
                  
                  setPendingUploads([]);
                  setCurrentUploadIndex(0);
                  toast.success(`${uploadsToProcess.length} documents uploadés`);
                }}
                disabled={uploadDocument.isPending}
              >
                {uploadDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Valider tous ({pendingUploads.length})
              </Button>
            )}
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

      {/* Edit Document Dialog */}
      <Dialog open={!!documentToEdit} onOpenChange={(open) => !open && setDocumentToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le document</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Titre du document"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select
                value={editForm.doc_type}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, doc_type: v as DocumentType }))}
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

            {/* Visibility - supprimé: tous les documents sont maintenant RH uniquement */}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentToEdit(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (documentToEdit && editForm.title.trim()) {
                  updateDocument.mutate({
                    id: documentToEdit.id,
                    data: {
                      title: editForm.title.trim(),
                      doc_type: editForm.doc_type,
                      visibility: editForm.visibility,
                    },
                  });
                  setDocumentToEdit(null);
                }
              }}
              disabled={updateDocument.isPending || !editForm.title.trim()}
            >
              {updateDocument.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Nom du dossier</Label>
            <Input
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: 2024, CDI, Avenants..."
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  handleCreateSubfolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateSubfolder}
              disabled={!newFolderName.trim()}
            >
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
