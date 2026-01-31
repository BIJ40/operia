/**
 * RHDocumentCell - Cellule pour upload/preview de documents obligatoires
 * Utilise maintenant la médiathèque centralisée (media_assets + media_links)
 */

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

  // Query existing document from media_links
  const { data: existingDoc, isLoading } = useQuery({
    queryKey: ['rh-media-document', collaboratorId, docType, agencyId],
    queryFn: async () => {
      // Find folder for this docType under the collaborator's folder
      const { data: folder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('slug', docType)
        .maybeSingle();

      if (!folder) return null;

      // Get the latest file in this folder
      const { data: link, error } = await supabase
        .from('media_links')
        .select(`
          id,
          asset:media_assets!inner(
            id,
            file_name,
            file_path
          )
        `)
        .eq('folder_id', folder.id)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!link) return null;

      return {
        id: link.id,
        file_path: (link.asset as any)?.file_path || '',
        file_name: (link.asset as any)?.file_name || 'Document',
      };
    },
    enabled: !!agencyId,
  });

  // Upload mutation using media library
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);

      // 1. Ensure folder exists for this docType
      const folderSlug = docType;
      let folderId: string;

      // Find or create the docType folder under collaborator's folder
      const { data: existingFolder } = await supabase
        .from('media_folders')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('slug', folderSlug)
        .maybeSingle();

      if (existingFolder) {
        folderId = existingFolder.id;
      } else {
        // Get parent folder (salarie-xxx)
        const { data: parentFolder } = await supabase
          .from('media_folders')
          .select('id')
          .eq('agency_id', agencyId)
          .eq('slug', `salarie-${collaboratorId}`)
          .maybeSingle();

        // Create folder
        const { data: newFolder, error: folderError } = await supabase
          .from('media_folders')
          .insert({
            agency_id: agencyId,
            parent_id: parentFolder?.id || null,
            name: DOC_TYPE_LABELS[docType],
            slug: folderSlug,
            access_scope: 'rh',
          })
          .select('id')
          .single();

        if (folderError) throw folderError;
        folderId = newFolder.id;
      }

      // 2. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${docType}_${Date.now()}.${fileExt}`;
      const filePath = `media/${agencyId}/${folderId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rh-documents')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Create media_asset
      const { data: { user } } = await supabase.auth.getUser();

      const { data: asset, error: assetError } = await supabase
        .from('media_assets')
        .insert({
          agency_id: agencyId,
          storage_bucket: 'rh-documents',
          storage_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (assetError) throw assetError;

      // 4. Create media_link
      const { error: linkError } = await supabase
        .from('media_links')
        .insert({
          agency_id: agencyId,
          asset_id: asset.id,
          folder_id: folderId,
          display_name: DOC_TYPE_LABELS[docType],
        });

      if (linkError) throw linkError;
    },
    onSuccess: () => {
      toast.success('Document uploadé avec succès');
      queryClient.invalidateQueries({ queryKey: ['rh-media-document', collaboratorId, docType] });
      queryClient.invalidateQueries({ queryKey: ['media-links-preview', collaboratorId] });
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
