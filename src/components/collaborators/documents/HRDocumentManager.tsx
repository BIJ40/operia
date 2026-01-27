/**
 * Finder RH - Gestionnaire de documents collaborateur
 * Interface style Finder avec drag & drop, dossiers imbriqués, catégories et preview
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
import { useNestedFolders } from '@/hooks/useNestedFolders';
import { useDocumentSearch } from '@/hooks/useDocumentSearch';
import { useRHExport } from '@/hooks/useRHExport';
import { CollaboratorDocument, DocumentType, DocumentVisibility, DOCUMENT_TYPES } from '@/types/collaboratorDocument';
import { DocumentCategoryTabs } from './DocumentCategoryTabs';
import { FolderGridView } from './FolderGridView';
import { DocumentListView } from './DocumentListView';
import { DocumentDropzone } from './DocumentDropzone';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { FolderNavigationBar } from './FolderNavigationBar';
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

  const { 
    allFolders,
    currentFolderId,
    getSubfolders, 
    getFolderPath,
    getFolderById,
    createFolder, 
    deleteFolder,
    navigateToFolder,
    isCreating,
  } = useNestedFolders(collaboratorId);
  
  // Search hook
  const { 
    searchQuery, 
    setSearchQuery, 
    searchResults, 
    isSearchLoading, 
    isSearching, 
    startSearch, 
    cancelSearch 
  } = useDocumentSearch(collaboratorId);

  // Export hook
  const { exportDocuments, isExporting } = useRHExport();

  // State
  const [activeCategory, setActiveCategory] = useState<DocumentType | 'ALL'>('ALL');
  const [previewDoc, setPreviewDoc] = useState<CollaboratorDocument | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<CollaboratorDocument | null>(null);
  const [documentToEdit, setDocumentToEdit] = useState<CollaboratorDocument | null>(null);
  const [editForm, setEditForm] = useState({ title: '', doc_type: 'OTHER' as DocumentType, visibility: 'ADMIN_ONLY' as DocumentVisibility });
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [draggedDocument, setDraggedDocument] = useState<CollaboratorDocument | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Compute category counts
  const categoryCounts = useMemo(() => {
    return documents.reduce((acc, doc) => {
      acc[doc.doc_type] = (acc[doc.doc_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [documents]);

  // Get current folder path
  const folderPath = useMemo(() => {
    return getFolderPath(currentFolderId);
  }, [currentFolderId, getFolderPath]);

  // Get subfolders for current location
  const currentSubfolders = useMemo(() => {
    if (activeCategory === 'ALL') return [];
    return getSubfolders(activeCategory, currentFolderId);
  }, [activeCategory, currentFolderId, getSubfolders]);

  // Get subfolder info with document counts
  const subfolderInfo = useMemo(() => {
    return currentSubfolders.map(folder => {
      // Count documents in this folder (by subfolder name match)
      const count = documents.filter(
        doc => doc.doc_type === activeCategory && doc.subfolder === folder.name
      ).length;
      return {
        id: folder.id,
        name: folder.name,
        documentCount: count,
      };
    });
  }, [currentSubfolders, documents, activeCategory]);

  // Filter documents by active category and current folder
  const filteredDocuments = useMemo(() => {
    // If searching, show search results
    if (isSearching && searchQuery.length >= 2) {
      return searchResults;
    }

    let filtered = documents;
    
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter((doc) => doc.doc_type === activeCategory);
    }
    
    // Filter by current folder
    if (currentFolderId) {
      const currentFolder = getFolderById(currentFolderId);
      if (currentFolder) {
        filtered = filtered.filter((doc) => doc.subfolder === currentFolder.name);
      }
    } else if (activeCategory !== 'ALL') {
      // At category root: show docs with no subfolder
      const folderNames = currentSubfolders.map(f => f.name);
      filtered = filtered.filter((doc) => !doc.subfolder || !folderNames.includes(doc.subfolder));
    }
    
    return filtered;
  }, [documents, activeCategory, currentFolderId, getFolderById, currentSubfolders, isSearching, searchQuery, searchResults]);

  // Handle category change - reset folder navigation
  const handleCategoryChange = (category: DocumentType | 'ALL') => {
    setActiveCategory(category);
    navigateToFolder(null);
  };

  // Handle folder navigation
  const handleFolderClick = (folderId: string) => {
    navigateToFolder(folderId);
  };

  // Handle navigate to category root
  const handleNavigateToCategory = () => {
    navigateToFolder(null);
  };

  // Handle files dropped
  const handleFilesDropped = useCallback((files: File[], suggestedType?: DocumentType) => {
    if (!canManage) return;

    const currentFolder = getFolderById(currentFolderId);
    
    const uploads: PendingUpload[] = files.map((file) => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''),
      doc_type: suggestedType || (activeCategory !== 'ALL' ? activeCategory : 'OTHER'),
      visibility: 'ADMIN_ONLY' as DocumentVisibility,
      subfolder: currentFolder?.name || null,
    }));

    setPendingUploads(uploads);
    setCurrentUploadIndex(0);
    setShowUploadDialog(true);
  }, [canManage, activeCategory, currentFolderId, getFolderById]);

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

  // Open new folder dialog - capture current folder at dialog open time
  const openNewFolderDialog = useCallback(() => {
    setNewFolderParentId(currentFolderId); // Capture current position
    setNewFolderName('');
    setShowNewFolderDialog(true);
  }, [currentFolderId]);

  // Handle create new subfolder - use captured parent ID
  const handleCreateSubfolder = () => {
    if (!newFolderName.trim() || activeCategory === 'ALL') return;
    
    const folderName = newFolderName.trim();
    console.log('[HRDocumentManager] Creating folder:', { folderName, parentId: newFolderParentId, activeCategory });
    createFolder(activeCategory, folderName, newFolderParentId);
    setShowNewFolderDialog(false);
    setNewFolderName('');
    setNewFolderParentId(null);
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

  // Clear selection when category or folder changes
  useEffect(() => {
    setSelectedDocIds(new Set());
  }, [activeCategory, currentFolderId]);

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

          {/* Navigation Bar with folder path */}
          <FolderNavigationBar
            activeCategory={activeCategory}
            folderPath={folderPath}
            onNavigateToRoot={() => handleCategoryChange('ALL')}
            onNavigateToCategory={handleNavigateToCategory}
            onNavigateToFolder={navigateToFolder}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

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

          {/* Document View (Grid or List) */}
          {viewMode === 'grid' ? (
            <FolderGridView
              documents={filteredDocuments}
              subfolders={subfolderInfo}
              onPreview={setPreviewDoc}
              onDownload={downloadDocument}
              onDelete={setDocumentToDelete}
              onEdit={(doc) => {
                setDocumentToEdit(doc);
                setEditForm({ title: doc.title, doc_type: doc.doc_type, visibility: doc.visibility });
              }}
              onRename={handleRename}
              onFolderClick={handleFolderClick}
              canManage={canManage}
              selectedIds={selectedDocIds}
              onSelect={handleDocumentSelect}
              onCreateFolder={openNewFolderDialog}
            />
          ) : (
            <DocumentListView
              documents={filteredDocuments}
              subfolders={subfolderInfo}
              onPreview={setPreviewDoc}
              onDownload={downloadDocument}
              onDelete={setDocumentToDelete}
              onEdit={(doc) => {
                setDocumentToEdit(doc);
                setEditForm({ title: doc.title, doc_type: doc.doc_type, visibility: doc.visibility });
              }}
              onFolderClick={handleFolderClick}
              canManage={canManage}
              selectedIds={selectedDocIds}
              onSelect={handleDocumentSelect}
              onCreateFolder={openNewFolderDialog}
            />
          )}
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
            {newFolderParentId && (
              <p className="text-xs text-muted-foreground mt-2">
                📁 Sera créé dans : <strong>{getFolderById(newFolderParentId)?.name}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateSubfolder}
              disabled={!newFolderName.trim() || isCreating}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
