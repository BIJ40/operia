import React, { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { RHDocumentPreviewPopup } from './RHDocumentPreviewPopup';

interface RHDocumentCellProps {
  collaboratorId: string;
  agencyId: string;
  docType: 'permis' | 'cni';
  className?: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  permis: 'Permis de conduire',
  cni: 'Carte d\'identité',
};

export function RHDocumentCell({ collaboratorId, agencyId, docType, className }: RHDocumentCellProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Query existing document
  const { data: existingDoc, isLoading } = useQuery({
    queryKey: ['rh-document', collaboratorId, docType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborator_documents')
        .select('id, file_path, file_name, title')
        .eq('collaborator_id', collaboratorId)
        .eq('doc_type', docType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${docType}_${Date.now()}.${fileExt}`;
      const filePath = `${agencyId}/${collaboratorId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rh-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('collaborator_documents')
        .insert({
          collaborator_id: collaboratorId,
          agency_id: agencyId,
          doc_type: docType,
          title: DOC_TYPE_LABELS[docType],
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
          visibility: 'rh_only',
          employee_visible: false,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      toast.success('Document uploadé avec succès');
      queryClient.invalidateQueries({ queryKey: ['rh-document', collaboratorId, docType] });
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents', collaboratorId] });
      queryClient.invalidateQueries({ queryKey: ['rh-documents-check', collaboratorId] });
      setIsUploadOpen(false);
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        uploadMutation.mutate(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });


  if (isLoading) {
    return <div className={cn("h-7 w-7 animate-pulse bg-muted rounded", className)} />;
  }

  // Document exists - show preview popup on click
  if (existingDoc) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 text-primary hover:text-primary/80", className)}
                onClick={() => setIsPreviewOpen(true)}
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Voir {DOC_TYPE_LABELS[docType]}</p>
              <p className="text-xs text-muted-foreground">{existingDoc.file_name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <RHDocumentPreviewPopup
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          title={DOC_TYPE_LABELS[docType]}
          filePath={existingDoc.file_path}
          fileName={existingDoc.file_name}
          onReplace={() => {
            setIsPreviewOpen(false);
            setIsUploadOpen(true);
          }}
        />
        
        {/* Upload dialog for replacement */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remplacer {DOC_TYPE_LABELS[docType]}</DialogTitle>
            </DialogHeader>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {isUploading ? (
                <p className="text-sm text-muted-foreground">Upload en cours...</p>
              ) : isDragActive ? (
                <p className="text-sm text-primary">Déposez le fichier ici</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Glissez-déposez ou cliquez pour sélectionner
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG</p>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // No document - show upload dialog
  return (
    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 text-muted-foreground hover:text-primary", className)}
        >
          <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter {DOC_TYPE_LABELS[docType]}</DialogTitle>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isUploading ? (
            <p className="text-sm text-muted-foreground">Upload en cours...</p>
          ) : isDragActive ? (
            <p className="text-sm text-primary">Déposez le fichier ici</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Glissez-déposez ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
