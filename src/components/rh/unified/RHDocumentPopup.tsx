import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CreditCard, Car, Heart, X, Eye, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  onDocumentClick: (type: DocumentType) => void;
}

export function DocumentIcons({ collaboratorId, onDocumentClick }: DocumentIconsProps) {
  // Query to check which document types exist for this collaborator
  const { data: existingDocs = [] } = useQuery({
    queryKey: ['rh-documents-check', collaboratorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('doc_type')
        .eq('collaborator_id', collaboratorId)
        .in('doc_type', ['permis', 'cni', 'carte_vitale', 'contrat', 'rib']);
      
      if (error) throw error;
      return data?.map(d => d.doc_type) || [];
    },
    staleTime: 30000, // Cache 30 seconds
  });

  return (
    <div className="flex items-center gap-1">
      {DOCUMENT_TYPES.map((docType) => {
        const hasDoc = existingDocs.includes(docType.type);
        
        return (
          <button
            key={docType.type}
            onClick={(e) => {
              e.stopPropagation();
              onDocumentClick(docType.type);
            }}
            className={cn(
              "p-1 rounded hover:bg-muted transition-colors",
              hasDoc ? docType.color : "text-muted-foreground/40"
            )}
            title={`${docType.label}${hasDoc ? ' ✓' : ' (vide)'}`}
          >
            {docType.icon}
          </button>
        );
      })}
    </div>
  );
}
