import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { 
  Upload, Grid, List, Eye, Download, Trash2, FileText, 
  FileImage, FileVideo, File, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logError } from '@/lib/logger';

interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  created_at: string;
  url?: string;
}

interface FileManagerProps {
  bucketName: string;
  recordId: string;
  basePath?: string;
  className?: string;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

const FILE_ICONS: Record<string, typeof FileText> = {
  'image': FileImage,
  'video': FileVideo,
  'application/pdf': FileText,
  'default': File,
};

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return FILE_ICONS['image'];
  if (type.startsWith('video/')) return FILE_ICONS['video'];
  return FILE_ICONS[type] || FILE_ICONS['default'];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Sanitize filename for Supabase Storage
 * Removes accents, replaces spaces, keeps only safe characters
 */
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')             // Spaces → hyphens
    .replace(/[^a-zA-Z0-9._-]/g, '')  // Keep only safe characters
    .toLowerCase();
}

export function FileManager({ 
  bucketName, 
  recordId, 
  basePath = '',
  className,
  maxFileSize = 10,
  acceptedTypes
}: FileManagerProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const storagePath = basePath ? `${basePath}/${recordId}` : recordId;

  // Fetch files
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files', bucketName, storagePath],
    queryFn: async () => {
      const { data, error } = await (supabase.storage as any)
        .from(bucketName)
        .list(storagePath, { sortBy: { column: 'created_at', order: 'desc' } });
      
      if (error) {
        logError('FileManager', 'Error listing files:', error);
        return [];
      }

      // Filter out placeholders and invalid entries first
      const validFiles = (data || []).filter((file: any) => 
        file.id && file.name && !file.name.startsWith('.')
      );

      // Get signed URLs for each file
      const filesWithUrls = await Promise.all(
        validFiles.map(async (file: any) => {
          const filePath = `${storagePath}/${file.name}`;
          const { data: urlData } = await (supabase.storage as any)
            .from(bucketName)
            .createSignedUrl(filePath, 3600);
          
          return {
            id: file.id,
            name: file.name,
            size: file.metadata?.size || 0,
            type: file.metadata?.mimetype || 'application/octet-stream',
            path: filePath,
            created_at: file.created_at,
            url: urlData?.signedUrl,
          };
        })
      );

      return filesWithUrls as FileItem[];
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const sanitizedName = sanitizeFileName(file.name);
      const filePath = `${storagePath}/${Date.now()}-${sanitizedName}`;
      const { error } = await (supabase.storage as any)
        .from(bucketName)
        .upload(filePath, file);
      
      if (error) throw error;
      return filePath;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', bucketName, storagePath] });
      toast({ title: 'Fichier téléchargé avec succès' });
    },
    onError: (error: Error) => {
      logError('FileManager', 'Upload error:', error);
      toast({ 
        title: 'Erreur lors du téléchargement', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      const { error } = await (supabase.storage as any)
        .from(bucketName)
        .remove([path]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', bucketName, storagePath] });
      toast({ title: 'Fichier supprimé' });
    },
    onError: (error: Error) => {
      logError('FileManager', 'Delete error:', error);
      toast({ 
        title: 'Erreur lors de la suppression', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.size > maxFileSize * 1024 * 1024) {
        toast({
          title: 'Fichier trop volumineux',
          description: `La taille maximale est de ${maxFileSize} Mo`,
          variant: 'destructive',
        });
        return;
      }
      uploadMutation.mutate(file);
    });
  }, [maxFileSize, uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes ? Object.fromEntries(acceptedTypes.map(t => [t, []])) : undefined,
  });

  const handleDownload = async (file: FileItem) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const handleDelete = (file: FileItem) => {
    if (confirm(`Supprimer ${file.name} ?`)) {
      deleteMutation.mutate(file.path);
    }
  };

  return (
    <Card className={cn("border-helpconfort-blue/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Fichiers</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(viewMode === 'grid' && 'bg-muted')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(viewMode === 'list' && 'bg-muted')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive 
              ? "border-helpconfort-blue bg-helpconfort-blue/5" 
              : "border-border hover:border-helpconfort-blue/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-helpconfort-blue font-medium">Déposez les fichiers ici...</p>
          ) : (
            <p className="text-muted-foreground">
              Glissez-déposez des fichiers ou cliquez pour sélectionner
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Max {maxFileSize} Mo par fichier
          </p>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Files display */}
        {!isLoading && files.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const isImage = file.type.startsWith('image/');
                
                return (
                  <div
                    key={file.id}
                    className="group relative border rounded-lg p-3 hover:border-helpconfort-blue/50 transition-colors"
                  >
                    <div className="aspect-square flex items-center justify-center bg-muted/30 rounded mb-2 overflow-hidden">
                      {isImage && file.url ? (
                        <img 
                          src={file.url} 
                          alt={file.name}
                          className="w-full h-full object-cover"
                          data-no-modal
                        />
                      ) : (
                        <FileIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    
                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type);
                
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:border-helpconfort-blue/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Empty state */}
        {!isLoading && files.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            Aucun fichier
          </p>
        )}

        {/* Uploading indicator */}
        {uploadMutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Téléchargement en cours...
          </div>
        )}
      </CardContent>

      {/* Preview Modal */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {previewFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold truncate">{previewFile.name}</h3>
                <Button variant="outline" size="sm" onClick={() => handleDownload(previewFile)}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger
                </Button>
              </div>
              <div className="flex items-center justify-center bg-muted/30 rounded-lg min-h-[300px] max-h-[70vh] overflow-auto">
                {previewFile.type.startsWith('image/') && previewFile.url ? (
                  <img 
                    src={previewFile.url} 
                    alt={previewFile.name}
                    className="max-w-full max-h-[70vh] object-contain"
                    data-no-modal
                  />
                ) : previewFile.type === 'application/pdf' && previewFile.url ? (
                  <iframe 
                    src={previewFile.url} 
                    className="w-full h-[70vh]"
                    title={previewFile.name}
                  />
                ) : (
                  <div className="text-center py-12">
                    <File className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Aperçu non disponible
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => handleDownload(previewFile)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Télécharger le fichier
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
