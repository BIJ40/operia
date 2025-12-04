import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { 
  GenerateDocumentPayload, 
  GenerateDocumentResponse,
  AgencyStamp,
  StampType 
} from '@/types/hrGenerated';

/**
 * Hook pour générer un document RH tamponné via Edge Function
 */
export function useGenerateHRDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: GenerateDocumentPayload): Promise<GenerateDocumentResponse> => {
      const { data, error } = await supabase.functions.invoke('generate-hr-document', {
        body: payload,
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la génération du document');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la génération du document');
      }

      return data as GenerateDocumentResponse;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['collaborator-documents'] });
      queryClient.invalidateQueries({ queryKey: ['my-documents'] });
      queryClient.invalidateQueries({ queryKey: ['hr-generated-documents'] });
      
      toast({
        title: 'Document généré',
        description: 'Le document PDF a été créé et ajouté au coffre-fort du salarié',
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

/**
 * Hook pour récupérer les tampons d'une agence
 */
export function useAgencyStamps() {
  return useQuery({
    queryKey: ['agency-stamps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agency_stamps')
        .select('*')
        .eq('is_active', true)
        .order('stamp_type');

      if (error) throw error;
      return data as AgencyStamp[];
    },
  });
}

/**
 * Hook pour uploader un tampon d'agence
 */
export function useUploadAgencyStamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      file, 
      stampType 
    }: { 
      file: File; 
      stampType: StampType;
    }) => {
      // Get user's agency
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();

      if (!profile?.agency_id) throw new Error('Agence non trouvée');

      // Upload file
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const filePath = `${profile.agency_id}/stamps/${stampType}_${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('rh-documents')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Upsert stamp record (replace existing of same type)
      const { data, error } = await supabase
        .from('agency_stamps')
        .upsert({
          agency_id: profile.agency_id,
          stamp_type: stampType,
          file_path: filePath,
          file_name: file.name,
          is_active: true,
          uploaded_by: user.id,
        }, {
          onConflict: 'agency_id,stamp_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgencyStamp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-stamps'] });
      toast({
        title: 'Tampon enregistré',
        description: 'Le tampon de l\'agence a été mis à jour',
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

/**
 * Hook pour supprimer un tampon d'agence
 */
export function useDeleteAgencyStamp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stampId: string) => {
      const { error } = await supabase
        .from('agency_stamps')
        .delete()
        .eq('id', stampId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-stamps'] });
      toast({
        title: 'Tampon supprimé',
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

/**
 * Hook pour récupérer les documents générés
 */
export function useHRGeneratedDocuments(collaboratorId?: string) {
  return useQuery({
    queryKey: ['hr-generated-documents', collaboratorId],
    queryFn: async () => {
      let query = supabase
        .from('hr_generated_documents')
        .select('*')
        .order('generated_at', { ascending: false });

      if (collaboratorId) {
        query = query.eq('collaborator_id', collaboratorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: true,
  });
}
