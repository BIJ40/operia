import { useState, useCallback } from "react";
import { Upload, Trash2, Stamp, Image as ImageIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface AgencyStampUploadProps {
  agencyId: string;
  disabled?: boolean;
}

interface AgencyStamp {
  id: string;
  agency_id: string;
  file_name: string;
  file_path: string;
  stamp_type: string;
  is_active: boolean;
}

export function AgencyStampUpload({ agencyId, disabled = false }: AgencyStampUploadProps) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing stamp for this agency
  const { data: stamp, isLoading } = useQuery({
    queryKey: ['agency-stamp', agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_stamps')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('stamp_type', 'signature')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as AgencyStamp | null;
    },
    enabled: !!agencyId,
  });

  // Get signed URL for preview
  const { data: stampUrl } = useQuery({
    queryKey: ['agency-stamp-url', stamp?.file_path],
    queryFn: async () => {
      if (!stamp?.file_path) return null;
      const { data } = await supabase.storage
        .from('agency-stamps')
        .createSignedUrl(stamp.file_path, 3600);
      return data?.signedUrl || null;
    },
    enabled: !!stamp?.file_path,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const filePath = `${agencyId}/signature_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('agency-stamps')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Deactivate existing stamps
      await supabase
        .from('agency_stamps')
        .update({ is_active: false })
        .eq('agency_id', agencyId)
        .eq('stamp_type', 'signature');

      // Create new stamp record
      const { data, error } = await supabase
        .from('agency_stamps')
        .insert({
          agency_id: agencyId,
          file_name: file.name,
          file_path: filePath,
          stamp_type: 'signature',
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tampon uploadé avec succès");
      queryClient.invalidateQueries({ queryKey: ['agency-stamp', agencyId] });
    },
    onError: (error: any) => {
      logError('STAMP_UPLOAD', error);
      toast.error("Erreur lors de l'upload du tampon");
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!stamp) return;
      
      // Delete from storage
      await supabase.storage
        .from('agency-stamps')
        .remove([stamp.file_path]);

      // Delete record
      const { error } = await supabase
        .from('agency_stamps')
        .delete()
        .eq('id', stamp.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tampon supprimé");
      queryClient.invalidateQueries({ queryKey: ['agency-stamp', agencyId] });
    },
    onError: (error: any) => {
      logError('STAMP_DELETE', error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0 && !disabled) {
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation, disabled]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    maxSize: 2 * 1024 * 1024, // 2MB
    disabled: disabled || isUploading,
  });

  if (isLoading) {
    return (
      <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Stamp className="h-4 w-4 text-helpconfort-blue" />
        <span className="font-medium text-sm">Tampon / Signature RH</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Ce tampon sera apposé sur les documents RH générés (attestations, certificats...)
      </p>

      {stamp && stampUrl ? (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 border rounded bg-white flex items-center justify-center overflow-hidden">
              <img
                src={stampUrl}
                alt="Tampon agence"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">{stamp.file_name}</p>
              <p className="text-xs text-muted-foreground">Tampon actif</p>
              {!disabled && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('stamp-replace-input')?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Remplacer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Supprimer
                  </Button>
                  <input
                    id="stamp-replace-input"
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadMutation.mutate(file);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive && "border-helpconfort-blue bg-helpconfort-blue/5",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "hover:border-helpconfort-blue/50 hover:bg-muted/30"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            {isUploading ? (
              <p className="text-sm text-muted-foreground">Upload en cours...</p>
            ) : isDragActive ? (
              <p className="text-sm text-helpconfort-blue">Déposez l'image ici</p>
            ) : (
              <>
                <p className="text-sm font-medium">Glissez-déposez une image</p>
                <p className="text-xs text-muted-foreground">
                  ou cliquez pour sélectionner (PNG, JPG - max 2MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
