/**
 * Zone de drag & drop multi-fichiers - Finder RH
 * RH-P1-02: Utilise la validation centralisée des fichiers
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/collaboratorDocument';
import { toast } from 'sonner';
import { 
  validateFile, 
  ALLOWED_MIME_TYPES, 
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB 
} from '@/utils/fileValidation';

interface DocumentDropzoneProps {
  onFilesDropped: (files: File[], suggestedType?: DocumentType) => void;
  activeCategory: DocumentType | 'ALL';
  isUploading?: boolean;
  className?: string;
}

export function DocumentDropzone({
  onFilesDropped,
  activeCategory,
  isUploading,
  className,
}: DocumentDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: { file: File; errors: { code: string; message: string }[] }[]) => {
      // Show errors for rejected files
      rejectedFiles.forEach(({ file, errors }) => {
        const errorMessages = errors.map(e => {
          if (e.code === 'file-too-large') return `Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`;
          if (e.code === 'file-invalid-type') return 'Type de fichier non autorisé';
          return e.message;
        });
        toast.error(`${file.name}: ${errorMessages.join(', ')}`);
      });

      // Additional validation with our centralized validator
      const validFiles: File[] = [];
      acceptedFiles.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          toast.error(`${file.name}: ${validation.error}`);
        }
      });

      if (validFiles.length > 0) {
        // Suggest category based on active tab (if not ALL)
        const suggestedType = activeCategory !== 'ALL' ? activeCategory : undefined;
        onFilesDropped(validFiles, suggestedType);
      }
    },
    [activeCategory, onFilesDropped]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    multiple: true,
    disabled: isUploading,
    accept: Object.fromEntries(
      Object.entries(ALLOWED_MIME_TYPES).map(([mime, exts]) => [mime, exts])
    ),
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200',
        isDragActive && !isDragReject && 'border-warm-green bg-warm-green/5 scale-[1.01]',
        isDragReject && 'border-warm-red bg-warm-red/5',
        !isDragActive && !isUploading && 'border-border/50 hover:border-warm-green/50 hover:bg-warm-green/5',
        isUploading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-2">
        {isDragActive && isDragReject ? (
          <>
            <AlertCircle className="h-10 w-10 text-warm-red" />
            <p className="font-medium text-warm-red">
              Type de fichier non autorisé
            </p>
          </>
        ) : isDragActive ? (
          <>
            <FileUp className="h-10 w-10 text-warm-green animate-bounce" />
            <p className="font-medium text-warm-green">
              Déposez vos fichiers ici
            </p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">
                Glissez-déposez vos fichiers ici
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou cliquez pour sélectionner
              </p>
            </div>
          </>
        )}
        
        <p className="text-xs text-muted-foreground mt-2">
          PDF, images, Word, Excel • Max {MAX_FILE_SIZE_MB} Mo par fichier
        </p>
        
        {activeCategory !== 'ALL' && (
          <p className="text-xs text-warm-green mt-1">
            Les fichiers seront ajoutés à la catégorie active
          </p>
        )}
      </div>
    </div>
  );
}
