/**
 * Hook pour gérer les documents administratifs de l'agence
 * (Kbis, RC Décennale, RC Pro, etc.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from '@/hooks/use-toast';

// Types de documents administratifs prédéfinis
export const ADMIN_DOCUMENT_TYPES = [
  { id: 'kbis', label: 'Kbis (< 3 mois)', requiresExpiry: true },
  { id: 'rc_decennale', label: 'RC Décennale', requiresExpiry: true },
  { id: 'rc_pro', label: 'RC Pro', requiresExpiry: true },
  { id: 'vigilance_urssaf', label: 'Vigilance URSSAF', requiresExpiry: true },
  { id: 'regularite_fiscale', label: 'Régularité fiscale', requiresExpiry: true },
  { id: 'rib', label: 'RIB', requiresExpiry: false },
  { id: 'autre', label: 'Autre', requiresExpiry: false },
] as const;

export type AdminDocumentType = (typeof ADMIN_DOCUMENT_TYPES)[number]['id'];

export interface AgencyAdminDocument {
  id: string;
  agency_id: string;
  document_type: string;
  label: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  updated_at: string | null;
  notes: string | null;
}

export function useAgencyAdminDocuments() {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['agency-admin-documents', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      const { data, error } = await supabase
        .from('agency_admin_documents')
        .select('*')
        .eq('agency_id', agencyId)
        .order('document_type');

      if (error) throw error;
      return data as AgencyAdminDocument[];
    },
    enabled: !!agencyId,
  });
}

export function useUploadAgencyAdminDocument() {
  const queryClient = useQueryClient();
  const { agencyId, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      documentType,
      label,
      expiryDate,
      notes,
    }: {
      file: File;
      documentType: string;
      label: string;
      expiryDate?: string;
      notes?: string;
    }) => {
      if (!agencyId || !user) throw new Error('Non authentifié');

      // Upload du fichier
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filePath = `${agencyId}/admin-docs/${documentType}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('rh-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Upsert le document (remplace l'existant du même type)
      const { data, error } = await supabase
        .from('agency_admin_documents')
        .upsert(
          {
            agency_id: agencyId,
            document_type: documentType,
            label,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
            expiry_date: expiryDate || null,
            uploaded_by: user.id,
            notes: notes || null,
          },
          {
            onConflict: 'agency_id,document_type',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as AgencyAdminDocument;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-admin-documents'] });
      toast({
        title: 'Document enregistré',
        description: 'Le document a été mis à jour avec succès',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAgencyAdminDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // First get the document to delete the file
      const { data: doc, error: fetchError } = await supabase
        .from('agency_admin_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete file from storage if exists
      if (doc?.file_path) {
        await supabase.storage.from('rh-documents').remove([doc.file_path]);
      }

      // Delete the record
      const { error } = await supabase
        .from('agency_admin_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-admin-documents'] });
      toast({ title: 'Document supprimé' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDownloadAgencyAdminDocument() {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const { data, error } = await supabase.storage
        .from('rh-documents')
        .createSignedUrl(filePath, 300); // 5 minutes

      if (error) throw error;
      return data.signedUrl;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
