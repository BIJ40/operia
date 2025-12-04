/**
 * Upload de justificatif pour les demandes de congés (maladie, événement familial)
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { LEAVE_SUBFOLDER_MAP, type LeaveType } from '@/types/leaveRequest';

interface JustificationUploadProps {
  leaveRequestId: string;
  leaveType: LeaveType;
  collaboratorId: string;
  agencyId: string;
  onUploadComplete: (documentId: string) => void;
}

export function JustificationUpload({
  leaveRequestId,
  leaveType,
  collaboratorId,
  agencyId,
  onUploadComplete,
}: JustificationUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; id: string } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `justificatif_${leaveType.toLowerCase()}_${Date.now()}.${fileExt}`;
      const filePath = `leave-justifications/${agencyId}/${collaboratorId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('collaborator-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document entry
      const { data: doc, error: docError } = await supabase
        .from('collaborator_documents')
        .insert({
          collaborator_id: collaboratorId,
          agency_id: agencyId,
          doc_type: 'CONGES_ABSENCES',
          subfolder: LEAVE_SUBFOLDER_MAP[leaveType],
          title: `Justificatif - ${file.name}`,
          file_name: fileName,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          visibility: 'EMPLOYEE_VISIBLE',
          leave_request_id: leaveRequestId,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      setUploadedFile({ name: file.name, id: doc.id });
      onUploadComplete(doc.id);
      successToast('Justificatif téléversé');
    } catch (error) {
      console.error('Upload error:', error);
      errorToast('Erreur lors du téléversement');
    } finally {
      setUploading(false);
    }
  }, [leaveRequestId, leaveType, collaboratorId, agencyId, user?.id, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpg', '.jpeg', '.png'],
    },
    maxFiles: 1,
    disabled: uploading || !!uploadedFile,
  });

  const removeFile = async () => {
    if (!uploadedFile) return;
    
    try {
      await supabase
        .from('collaborator_documents')
        .delete()
        .eq('id', uploadedFile.id);
      
      setUploadedFile(null);
      successToast('Fichier supprimé');
    } catch (error) {
      errorToast('Erreur lors de la suppression');
    }
  };

  if (uploadedFile) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">Justificatif ajouté</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed transition-colors cursor-pointer ${
        isDragActive 
          ? 'border-helpconfort-blue bg-helpconfort-blue/5' 
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <CardContent className="p-6 text-center">
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Téléversement en cours...</p>
          </>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              {isDragActive ? (
                <FileText className="h-6 w-6 text-helpconfort-blue" />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Déposez le fichier ici' : 'Ajouter un justificatif'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF ou image (max 10 Mo)
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
