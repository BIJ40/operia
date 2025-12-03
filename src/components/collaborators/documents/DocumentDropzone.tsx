/**
 * Zone de drag & drop multi-fichiers - Finder RH
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocumentType } from '@/types/collaboratorDocument';

interface DocumentDropzoneProps {
  onFilesDropped: (files: File[], suggestedType?: DocumentType) => void;
  activeCategory: DocumentType | 'ALL';
  isUploading?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function DocumentDropzone({
  onFilesDropped,
  activeCategory,
  isUploading,
  className,
}: DocumentDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Filter files that are too large
      const validFiles = acceptedFiles.filter((file) => {
        if (file.size > MAX_FILE_SIZE) {
          return false;
        }
        return true;
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
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: MAX_FILE_SIZE,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
        isDragActive && !isDragReject && 'border-helpconfort-blue bg-helpconfort-blue/5 scale-[1.01]',
        isDragReject && 'border-destructive bg-destructive/5',
        !isDragActive && !isUploading && 'border-border hover:border-helpconfort-blue/50 hover:bg-muted/30',
        isUploading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-2">
        {isDragActive ? (
          <>
            <FileUp className="h-10 w-10 text-helpconfort-blue animate-bounce" />
            <p className="font-medium text-helpconfort-blue">
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
          PDF, images, Word • Max 10 Mo par fichier
        </p>
        
        {activeCategory !== 'ALL' && (
          <p className="text-xs text-helpconfort-blue mt-1">
            Les fichiers seront ajoutés à la catégorie active
          </p>
        )}
      </div>
    </div>
  );
}
