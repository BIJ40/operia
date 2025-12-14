/**
 * Popup d'upload de documents associés à un champ RH
 * Permet d'ajouter des PDFs/images avec type et visibilité
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp, AlertCircle, X, FileText, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  validateFile, 
  ALLOWED_MIME_TYPES, 
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB 
} from '@/utils/fileValidation';
import { useCollaboratorDocuments } from '@/hooks/useCollaboratorDocuments';
import { DocumentType, DOCUMENT_TYPES } from '@/types/collaboratorDocument';

// Types de documents associables aux champs RH
export const FIELD_DOCUMENT_TYPES: Record<string, { docType: DocumentType; label: string }> = {
  // Parc & Matériel
  vehicule: { docType: 'OTHER', label: 'Document véhicule' },
  carte_carburant: { docType: 'OTHER', label: 'Carte carburant' },
  carte_bancaire: { docType: 'OTHER', label: 'Carte bancaire' },
  carte_autre: { docType: 'OTHER', label: 'Carte autre' },
  // Compétences
  habilitation_electrique: { docType: 'ATTESTATION', label: 'Habilitation électrique' },
  caces: { docType: 'ATTESTATION', label: 'CACES' },
  // Sécurité
  epi: { docType: 'OTHER', label: 'Document EPI' },
  visite_medicale: { docType: 'MEDICAL_VISIT', label: 'Visite médicale' },
  // Contrats
  contrat: { docType: 'CONTRACT', label: 'Contrat de travail' },
  avenant: { docType: 'AVENANT', label: 'Avenant' },
  // Autres
  permis: { docType: 'OTHER', label: 'Permis de conduire' },
  cni: { docType: 'OTHER', label: 'Carte d\'identité' },
};

interface RHDocumentUploadPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  fieldKey: string;
  fieldLabel: string;
}

interface FileToUpload {
  file: File;
  title: string;
  employeeVisible: boolean;
}

export function RHDocumentUploadPopup({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  fieldKey,
  fieldLabel,
}: RHDocumentUploadPopupProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { uploadDocument } = useCollaboratorDocuments(collaboratorId);
  
  const fieldConfig = FIELD_DOCUMENT_TYPES[fieldKey] || { docType: 'OTHER' as DocumentType, label: fieldLabel };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: { file: File; errors: { code: string; message: string }[] }[]) => {
    // Show errors for rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      const errorMessages = errors.map(e => {
        if (e.code === 'file-too-large') return `Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`;
        if (e.code === 'file-invalid-type') return 'Type de fichier non autorisé';
        return e.message;
      });
      toast.error(`${file.name}: ${errorMessages.join(', ')}`);
    });

    // Validate with centralized validator
    const validFiles: FileToUpload[] = [];
    acceptedFiles.forEach((file) => {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          employeeVisible: false,
        });
      } else {
        toast.error(`${file.name}: ${validation.error}`);
      }
    });

    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    disabled: isUploading,
    accept: Object.fromEntries(
      Object.entries(ALLOWED_MIME_TYPES).map(([mime, exts]) => [mime, exts])
    ),
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileTitle = (index: number, title: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, title } : f));
  };

  const updateFileVisibility = (index: number, visible: boolean) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, employeeVisible: visible } : f));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    try {
      for (const fileData of files) {
        await uploadDocument.mutateAsync({
          collaborator_id: collaboratorId,
          doc_type: fieldConfig.docType,
          title: fileData.title,
          description: `Document associé: ${fieldLabel}`,
          visibility: fileData.employeeVisible ? 'EMPLOYEE_VISIBLE' : 'ADMIN_ONLY',
          subfolder: fieldKey,
          file: fileData.file,
        });
      }
      
      setFiles([]);
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-red-500" />;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Documents - {fieldLabel}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {collaboratorName}
          </p>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all',
            isDragActive && !isDragReject && 'border-primary bg-primary/5',
            isDragReject && 'border-destructive bg-destructive/5',
            !isDragActive && !isUploading && 'border-border hover:border-primary/50',
            isUploading && 'opacity-50 cursor-not-allowed',
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-1">
            {isDragActive && isDragReject ? (
              <>
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive">Type non autorisé</p>
              </>
            ) : isDragActive ? (
              <>
                <FileUp className="h-8 w-8 text-primary animate-bounce" />
                <p className="text-sm text-primary">Déposez ici</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-foreground">Glissez-déposez vos fichiers</p>
                <p className="text-xs text-muted-foreground">PDF, images • Max {MAX_FILE_SIZE_MB} Mo</p>
              </>
            )}
          </div>
        </div>

        {/* Files list */}
        {files.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {files.map((fileData, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  {getFileIcon(fileData.file)}
                  <span className="text-sm flex-1 truncate">{fileData.file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Titre du document</Label>
                    <Input
                      value={fileData.title}
                      onChange={(e) => updateFileTitle(index, e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Titre..."
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Visible par le salarié</Label>
                    <Switch
                      checked={fileData.employeeVisible}
                      onCheckedChange={(checked) => updateFileVisibility(index, checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Annuler
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? 'Envoi...' : `Ajouter ${files.length > 0 ? `(${files.length})` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
