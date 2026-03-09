import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CreditCard, Car, Heart, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RHDocumentPreviewPopup } from './RHDocumentPreviewPopup';

export type DocumentType = 'cni' | 'permis' | 'carte_vitale' | 'contrat' | 'rib';

interface DocumentInfo {
  type: DocumentType;
  label: string;
  icon: React.ReactNode;
  color: string;
}

export const DOCUMENT_TYPES: DocumentInfo[] = [
  { type: 'cni', label: 'Carte d\'identité', icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-600' },
  { type: 'permis', label: 'Permis de conduire', icon: <Car className="h-4 w-4" />, color: 'text-green-600' },
  { type: 'carte_vitale', label: 'Carte Vitale', icon: <Heart className="h-4 w-4" />, color: 'text-emerald-600' },
  { type: 'contrat', label: 'Contrat de travail', icon: <FileText className="h-4 w-4" />, color: 'text-orange-600' },
  { type: 'rib', label: 'RIB', icon: <CreditCard className="h-4 w-4" />, color: 'text-purple-600' },
];

interface RHDocumentPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  collaboratorId: string;
  collaboratorName: string;
  existingDocumentUrl?: string | null;
  onUpload?: (file: File) => Promise<void>;
}

export function RHDocumentPopup({
  open,
  onOpenChange,
  documentType,
  collaboratorName,
  existingDocumentUrl,
  onUpload,
}: RHDocumentPopupProps) {
  const [isUploading, setIsUploading] = useState(false);
  const docInfo = DOCUMENT_TYPES.find(d => d.type === documentType);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || !onUpload) return;
    
    setIsUploading(true);
    try {
      await onUpload(acceptedFiles[0]);
      onOpenChange(false);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  }, [onUpload, onOpenChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {docInfo?.icon}
            {docInfo?.label} - {collaboratorName}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {existingDocumentUrl ? (
            <div className="space-y-4">
              {/* Preview du document existant */}
              <div className="border rounded-lg overflow-hidden bg-muted/50">
                {existingDocumentUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={existingDocumentUrl}
                    alt={docInfo?.label}
                    className="w-full h-64 object-contain"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" asChild>
                  <a href={existingDocumentUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-2" />
                    Voir
                  </a>
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a href={existingDocumentUrl} download>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </a>
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ou remplacer
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Zone de drop */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input {...getInputProps()} />
            <Upload className={cn("h-10 w-10 mx-auto mb-4", isDragActive ? "text-primary" : "text-muted-foreground")} />
            {isUploading ? (
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            ) : isDragActive ? (
              <p className="text-sm text-primary font-medium">Déposez le fichier ici</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium">Glisser-déposer le document ici</p>
                <p className="text-xs text-muted-foreground">ou cliquez pour sélectionner (PDF, JPG, PNG)</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Composant pour afficher les icônes de documents dans le tableau
interface DocumentIconsProps {
  collaboratorId: string;
  agencyId: string;
  onDocumentClick: (type: DocumentType) => void;
  large?: boolean;
  showVisibilityToggle?: boolean;
}

export function DocumentIcons({ collaboratorId, agencyId, onDocumentClick, large = false }: DocumentIconsProps) {
  const [previewDoc, setPreviewDoc] = useState<{type: DocumentType; filePath: string; fileName: string} | null>(null);

  // Query to check which document types exist via media_links (filtered by collaborator folder)
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['rh-documents-check', collaboratorId],
    queryFn: async () => {
      // 1. Find the collaborator's folder
      const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('slug', `salarie-${collaboratorId}`)
        .is('deleted_at', null)
        .maybeSingle();

      if (!folder) return [];

      // 2. Get subfolders too
      const { data: subFolders } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('parent_id', folder.id)
        .is('deleted_at', null);

      const folderIds = [folder.id, ...(subFolders || []).map(f => f.id)];

      // 3. Query links only in collaborator's folders
      const { data, error } = await supabase
        .from('media_links')
        .select(`
          id,
          label,
          asset:media_assets!inner(storage_path, file_name)
        `)
        .in('folder_id', folderIds)
        .is('deleted_at', null);
      
      if (error) throw error;
      
      // Map to doc types based on label or file_name
      return (data || []).map(d => {
        const assetData = d.asset as { storage_path: string; file_name: string } | null;
        const name = (d.label || assetData?.file_name || '').toLowerCase();
        let docType: DocumentType | null = null;
        if (name.includes('permis') || name.includes('license') || name.includes('driving')) {
          docType = 'permis';
        } else if (name.includes('cni') || name.includes('identité') || name.includes('identity') || name.includes('id_card')) {
          docType = 'cni';
        } else if (name.includes('vitale')) {
          docType = 'carte_vitale';
        } else if (name.includes('contrat')) {
          docType = 'contrat';
        } else if (name.includes('rib')) {
          docType = 'rib';
        }
        return { 
          doc_type: docType, 
          file_path: assetData?.storage_path || '', 
          file_name: assetData?.file_name || d.label || ''
        };
      }).filter(d => d.doc_type !== null);
    },
    staleTime: 0,
  });

  const handleClick = (docType: DocumentInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const doc = existingDocs.find(d => d.doc_type === docType.type);
    
    if (doc) {
      setPreviewDoc({
        type: docType.type,
        filePath: doc.file_path,
        fileName: doc.file_name
      });
    } else {
      onDocumentClick(docType.type);
    }
  };

  const hasDocument = (type: DocumentType) => {
    return existingDocs.some(d => d.doc_type === type);
  };

  const docInfo = previewDoc ? DOCUMENT_TYPES.find(d => d.type === previewDoc.type) : null;

  const iconSize = large ? 'h-6 w-6' : 'h-4 w-4';
  const buttonPadding = large ? 'p-2' : 'p-1';

  return (
    <>
      <div className={cn("flex items-center", large ? "gap-3" : "gap-1")}>
        {DOCUMENT_TYPES.map((docType) => {
          const hasDoc = hasDocument(docType.type);
          
          return (
            <button
              key={docType.type}
              onClick={(e) => handleClick(docType, e)}
              className={cn(
                "rounded hover:bg-muted transition-colors",
                buttonPadding,
                hasDoc ? docType.color : "text-muted-foreground/40"
              )}
              title={`${docType.label}${hasDoc ? ' ✓' : ' (vide)'}`}
            >
              {React.cloneElement(docType.icon as React.ReactElement, { className: iconSize })}
            </button>
          );
        })}
      </div>

      {previewDoc && docInfo && (
        <RHDocumentPreviewPopup
          open={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          title={docInfo.label}
          filePath={previewDoc.filePath}
          fileName={previewDoc.fileName}
          onReplace={() => {
            setPreviewDoc(null);
            onDocumentClick(previewDoc.type);
          }}
        />
      )}
    </>
  );
}
