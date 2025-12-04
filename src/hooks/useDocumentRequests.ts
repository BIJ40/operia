import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type {
  DocumentRequest,
  DocumentRequestWithDoc,
  DocumentRequestWithUnread,
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
      
      // Add computed is_unread field
      return (data as DocumentRequestWithDoc[]).map((req): DocumentRequestWithUnread => ({
        ...req,
        is_unread: (req.status === 'COMPLETED' || req.status === 'REJECTED') && !req.employee_seen_at,
      }));
    },
  });

  const createRequest = useMutation({
    mutationFn: async (payload: CreateDocumentRequestPayload) => {
      // Utilise la RPC qui gère collaborator_id et agency_id côté DB
      const { data, error } = await supabase
        .rpc('request_document', {
          p_request_type: payload.request_type,
          p_description: payload.description ?? null,
        });

      if (error) throw error;
      if (!data) throw new Error('Aucune donnée retournée par request_document');
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

  const markAsSeen = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .rpc('mark_document_request_seen', {
          p_request_id: requestId,
        });

      if (error) throw error;
      return data as DocumentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
    },
    onError: (error: Error) => {
      console.error('Error marking request as seen:', error.message);
    },
  });

  // Computed: unread count
  const unreadCount = requests.filter(r => r.is_unread).length;

  return {
    requests,
    isLoading,
    error,
    createRequest,
    markAsSeen,
    unreadCount,
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
      return data as (DocumentRequestWithDoc & { 
        locked_by: string | null;
        locked_at: string | null;
      })[];
    },
  });

  const updateRequest = useMutation({
    mutationFn: async (payload: UpdateDocumentRequestPayload) => {
      // Use the new RPC for proper validation
      const { data, error } = await supabase
        .rpc('handle_document_request', {
          p_request_id: payload.id,
          p_status: payload.status,
          p_response_note: payload.response_note ?? null,
          p_response_document_id: payload.response_document_id ?? null,
        });

      if (error) throw error;
      return data as DocumentRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-document-requests-count'] });
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

  // Nombre de demandes en attente pour le badge
  const pendingCount = requests.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;

  return {
    requests,
    isLoading,
    error,
    updateRequest,
    pendingCount,
  };
}

/**
 * Hook léger pour récupérer uniquement le compteur de demandes en attente
 * (pour afficher un badge sur la tuile sans charger toutes les données)
 */
export function usePendingDocumentRequestsCount() {
  const { data: count = 0, isLoading } = useQuery({
    queryKey: ['agency-document-requests-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('document_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'IN_PROGRESS']);

      if (error) throw error;
      return count ?? 0;
    },
  });

  return { count, isLoading };
}
