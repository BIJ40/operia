import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { useUploadAsset } from "../hooks/useCommercialProfile";

interface CommercialImageUploadProps {
  label: string;
  fieldName: string;
  currentUrl: string | null;
  agencyId: string;
  onUrlChange: (url: string | null) => void;
}

export function CommercialImageUpload({
  label,
  fieldName,
  currentUrl,
  agencyId,
  onUrlChange,
}: CommercialImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const uploadMutation = useUploadAsset();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    try {
      const url = await uploadMutation.mutateAsync({
        file: acceptedFiles[0],
        agencyId,
        fieldName,
      });
      onUrlChange(url);
    } finally {
      setIsUploading(false);
    }
  }, [agencyId, fieldName, uploadMutation, onUrlChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleRemove = () => {
    onUrlChange(null);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {currentUrl ? (
        <div className="relative group">
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-4 h-32
            flex flex-col items-center justify-center gap-2
            cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground text-center">
                {isDragActive ? 'Déposez ici' : 'Cliquez ou glissez une image'}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
