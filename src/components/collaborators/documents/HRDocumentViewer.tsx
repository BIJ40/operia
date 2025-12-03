/**
 * Finder RH en lecture seule - Vue Coffre-fort Employé
 * Mêmes visuels que HRDocumentManager mais sans aucune action de modification
 */

import { useState, useMemo } from 'react';
import { CollaboratorDocument, DocumentType, DOCUMENT_TYPES } from '@/types/collaboratorDocument';
import { Loader2, FileText, FolderOpen } from 'lucide-react';
import { DocumentCategoryTabs } from './DocumentCategoryTabs';
import { ReadOnlyDocumentBreadcrumb } from './ReadOnlyDocumentBreadcrumb';
import { ReadOnlySubfolderButtons } from './ReadOnlySubfolderButtons';
import { ReadOnlyDocumentGrid } from './ReadOnlyDocumentGrid';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface HRDocumentViewerProps {
  documents: CollaboratorDocument[];
  isLoading: boolean;
  onDownload: (doc: CollaboratorDocument) => void;
  getSignedUrl: (filePath: string) => Promise<string | null>;
}

export function HRDocumentViewer({
  documents,
  isLoading,
  onDownload,
  getSignedUrl,
}: HRDocumentViewerProps) {
  const [activeCategory, setActiveCategory] = useState<DocumentType | 'ALL'>('ALL');
  const [activeSubfolder, setActiveSubfolder] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CollaboratorDocument | null>(null);

  // Compute category counts
  const { categoryCounts, totalCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    documents.forEach((doc) => {
      counts[doc.doc_type] = (counts[doc.doc_type] || 0) + 1;
    });
    return {
      categoryCounts: counts,
      totalCount: documents.length,
    };
  }, [documents]);

  // Compute subfolders for active category
  const { subfolders, subfolderCounts } = useMemo(() => {
    if (activeCategory === 'ALL') {
      return { subfolders: [], subfolderCounts: {} };
    }
    
    const categoryDocs = documents.filter((d) => d.doc_type === activeCategory);
    const folderSet = new Set<string>();
    const counts: Record<string, number> = {};
    
    categoryDocs.forEach((doc) => {
      if (doc.subfolder) {
        folderSet.add(doc.subfolder);
        counts[doc.subfolder] = (counts[doc.subfolder] || 0) + 1;
      }
    });
    
    return {
      subfolders: Array.from(folderSet).sort(),
      subfolderCounts: counts,
    };
  }, [documents, activeCategory]);

  // Filter documents by category and subfolder
  const filteredDocuments = useMemo(() => {
    let filtered = documents;
    
    if (activeCategory !== 'ALL') {
      filtered = filtered.filter((d) => d.doc_type === activeCategory);
      
      if (activeSubfolder) {
        filtered = filtered.filter((d) => d.subfolder === activeSubfolder);
      } else {
        // Show only documents without subfolder (root of category)
        filtered = filtered.filter((d) => !d.subfolder);
      }
    }
    
    return filtered;
  }, [documents, activeCategory, activeSubfolder]);

  const handleCategoryChange = (category: DocumentType | 'ALL') => {
    setActiveCategory(category);
    setActiveSubfolder(null);
  };

  const handleNavigateRoot = () => {
    setActiveCategory('ALL');
    setActiveSubfolder(null);
  };

  const handleNavigateCategory = () => {
    setActiveSubfolder(null);
  };

  if (isLoading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Chargement de vos documents...</span>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Aucun document disponible dans votre coffre-fort.</p>
        <p className="text-sm mt-2">
          Les documents mis à disposition par votre agence apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <DocumentCategoryTabs
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        counts={categoryCounts}
        totalCount={totalCount}
      />

      {/* Breadcrumb navigation */}
      <ReadOnlyDocumentBreadcrumb
        activeCategory={activeCategory}
        activeSubfolder={activeSubfolder}
        onNavigateRoot={handleNavigateRoot}
        onNavigateCategory={handleNavigateCategory}
      />

      {/* Subfolders (only when in a category, not in a subfolder) */}
      {activeCategory !== 'ALL' && !activeSubfolder && subfolders.length > 0 && (
        <ReadOnlySubfolderButtons
          subfolders={subfolders}
          subfolderCounts={subfolderCounts}
          onFolderClick={setActiveSubfolder}
        />
      )}

      {/* Documents grid */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Aucun document dans {activeSubfolder ? `"${activeSubfolder}"` : 'cette catégorie'}.</p>
        </div>
      ) : (
        <ReadOnlyDocumentGrid
          documents={filteredDocuments}
          onPreview={setPreviewDoc}
          onDownload={onDownload}
        />
      )}

      {/* Preview modal */}
      <DocumentPreviewModal
        document={previewDoc}
        documents={filteredDocuments}
        onClose={() => setPreviewDoc(null)}
        onDownload={onDownload}
        getSignedUrl={getSignedUrl}
      />
    </div>
  );
}
