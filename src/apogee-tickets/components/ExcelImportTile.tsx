import { useState, useCallback } from 'react';
import { FileSpreadsheet, ChevronDown, ChevronUp, Upload, Trash2, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface StoredExcel {
  name: string;
  created_at: string;
  id: string;
}

export function ExcelImportTile() {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  // Fetch stored Excel files
  const { data: storedFiles = [], isLoading } = useQuery({
    queryKey: ['apogee-excel-files'],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from('apogee-imports')
        .list('excel-sources', {
          sortBy: { column: 'created_at', order: 'desc' }
        });
      
      if (error) {
        // Bucket might not exist yet
        if (error.message.includes('not found')) {
          return [];
        }
        throw error;
      }
      
      return (data || []).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileName = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('apogee-imports')
        .upload(`excel-sources/${fileName}`, file);
      
      if (error) throw error;
      return fileName;
    },
    onSuccess: () => {
      toast.success('Fichier Excel enregistré');
      queryClient.invalidateQueries({ queryKey: ['apogee-excel-files'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const { error } = await supabase.storage
        .from('apogee-imports')
        .remove([`excel-sources/${fileName}`]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Fichier supprimé');
      queryClient.invalidateQueries({ queryKey: ['apogee-excel-files'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Download file
  const handleDownload = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('apogee-imports')
      .download(`excel-sources/${fileName}`);
    
    if (error) {
      toast.error('Erreur lors du téléchargement');
      return;
    }
    
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/^\d+_/, ''); // Remove timestamp prefix
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        uploadMutation.mutate(file);
      } else {
        toast.error(`${file.name} n'est pas un fichier Excel`);
      }
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    noClick: !isExpanded,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDisplayName = (fileName: string) => {
    return fileName.replace(/^\d+_/, '');
  };

  return (
    <Card 
      {...getRootProps()}
      className={cn(
        "relative transition-all duration-200 cursor-pointer",
        isDragActive && "ring-2 ring-primary ring-offset-2 bg-primary/5",
        isExpanded && "col-span-full"
      )}
    >
      <input {...getInputProps()} />
      
      {/* Header - always visible */}
      <div 
        className="p-4 flex items-center justify-between"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Fichiers Excel sources</h3>
            <p className="text-sm text-muted-foreground">
              {isDragActive ? 'Déposez le fichier ici...' : 'Glissez-déposez vos Excel ici'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {storedFiles.length > 0 && (
            <Badge variant="secondary">{storedFiles.length}</Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <CardContent className="pt-0 border-t">
          {/* Drop zone */}
          <div 
            className={cn(
              "mt-4 border-2 border-dashed rounded-lg p-6 text-center transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Glissez-déposez vos fichiers Excel ou cliquez pour sélectionner
            </p>
          </div>

          {/* File list */}
          {isLoading ? (
            <p className="text-sm text-muted-foreground mt-4">Chargement...</p>
          ) : storedFiles.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Aucun fichier enregistré
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {storedFiles.map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getDisplayName(file.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(file.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(file.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
