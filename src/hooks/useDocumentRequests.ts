import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type {
  DocumentRequest,
  DocumentRequestWithDoc,
  DocumentRequestType,
  DocumentRequestStatus,
} from '@/types/documentRequest';

interface CreateDocumentRequestPayload {
  request_type: DocumentRequestType;
  description?: string;
}

interface UpdateDocumentRequestPayload {
  id: string;
  status: DocumentRequestStatus;
  response_note?: string;
  response_document_id?: string | null;
}

/**
 * Vue salarié – mes demandes de documents
 */
export function useMyDocumentRequests() {
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-document-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          response_document:response_document_id (*)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as DocumentRequestWithDoc[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (payload: CreateDocumentRequestPayload) => {
      // Get current user's collaborator and agency info
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .single();

      const { data: collaborator } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .single();

      if (!collaborator?.id || !profile?.agency_id) {
        throw new Error('Impossible de créer la demande : profil collaborateur non trouvé');
      }

      const { data, error } = await supabase
        .from('document_requests')
        .insert({
          request_type: payload.request_type,
          description: payload.description || null,
          collaborator_id: collaborator.id,
          agency_id: profile.agency_id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as DocumentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
      toast({
        title: 'Demande envoyée',
        description: 'Votre demande a été transmise au service RH',
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

  return {
    requests,
    isLoading,
    error,
    createRequest,
  };
}

/**
 * Vue agence – traitement des demandes RH
 */
export function useAgencyDocumentRequests() {
  const queryClient = useQueryClient();

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['agency-document-requests'],
    queryFn: async () => {
      // RLS filtrera automatiquement par agency_id
      const { data, error } = await supabase
        .from('document_requests')
        .select(`
          *,
          response_document:response_document_id (*)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as DocumentRequestWithDoc[];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async (payload: UpdateDocumentRequestPayload) => {
      const updateData: Record<string, unknown> = {
        status: payload.status,
        response_note: payload.response_note || null,
        response_document_id: payload.response_document_id ?? null,
      };

      if (payload.status === 'COMPLETED' || payload.status === 'REJECTED') {
        updateData.processed_at = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        updateData.processed_by = user?.id || null;
      }

      const { data, error } = await supabase
        .from('document_requests')
        .update(updateData)
        .eq('id', payload.id)
        .select('*')
        .single();

      if (error) throw error;
      return data as DocumentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
      toast({
        title: 'Demande mise à jour',
        description: 'Le statut de la demande a été enregistré',
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

  return {
    requests,
    isLoading,
    error,
    updateRequest,
  };
}
