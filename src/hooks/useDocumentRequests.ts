import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLogRHAction } from '@/hooks/rh/useRHAuditLog';
import { handleRHError, showRHSuccess } from '@/utils/rhErrorHandler';
import { logError } from '@/lib/logger';
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
  const logAction = useLogRHAction();

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['my-document-requests'],
    queryFn: async (): Promise<DocumentRequestWithUnread[]> => {
      // First get document requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('document_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(500);

      if (requestsError) throw requestsError;
      
      // For each request with a response_document_id, fetch the media_asset separately
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (req): Promise<DocumentRequestWithUnread> => {
          let responseDocument = null;
          
          if (req.response_document_id) {
            const { data: asset } = await supabase
              .from('media_assets')
              .select('id, file_name, storage_path')
              .eq('id', req.response_document_id)
              .maybeSingle();
            
            if (asset) {
              responseDocument = {
                id: asset.id,
                file_name: asset.file_name,
                file_path: asset.storage_path
              };
            }
          }
          
          return {
            ...req,
            request_type: req.request_type as DocumentRequestType,
            status: req.status as DocumentRequestStatus,
            response_document: responseDocument,
            is_unread: (req.status === 'COMPLETED' || req.status === 'REJECTED') && !req.employee_seen_at,
          };
        })
      );
      
      return enrichedRequests;
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
      // Log audit
      logAction.mutate({
        actionType: 'REQUEST_CREATE',
        entityType: 'request',
        collaboratorId: data.collaborator_id,
        entityId: data.id,
        newValues: { request_type: data.request_type, status: data.status },
        metadata: { request_type: data.request_type },
      });
      showRHSuccess('Demande envoyée', 'Votre demande a été transmise au service RH');
    },
    onError: (error: Error) => {
      handleRHError(error, 'CREATE_FAILED', { entity: 'document_request' });
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
      logError(error.message, 'rh-module', { action: 'markAsSeen' });
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
  const logAction = useLogRHAction();

  const {
    data: requests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['agency-document-requests'],
    queryFn: async (): Promise<(DocumentRequestWithDoc & { locked_by: string | null; locked_at: string | null })[]> => {
      // Fetch requests without the join that's failing
      const { data: requestsData, error: requestsError } = await supabase
        .from('document_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(500);

      if (requestsError) throw requestsError;
      
      // For each request with a response_document_id, fetch the media_asset separately
      const enrichedRequests = await Promise.all(
        (requestsData || []).map(async (req) => {
          let responseDocument = null;
          
          if (req.response_document_id) {
            const { data: asset } = await supabase
              .from('media_assets')
              .select('id, file_name, storage_path')
              .eq('id', req.response_document_id)
              .maybeSingle();
            
            if (asset) {
              responseDocument = {
                id: asset.id,
                file_name: asset.file_name,
                file_path: asset.storage_path
              };
            }
          }
          
          return {
            ...req,
            request_type: req.request_type as DocumentRequestType,
            status: req.status as DocumentRequestStatus,
            response_document: responseDocument,
            locked_by: req.locked_by,
            locked_at: req.locked_at,
          };
        })
      );
      
      return enrichedRequests;
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agency-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-document-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-document-requests-count'] });
      // Log audit
      logAction.mutate({
        actionType: 'REQUEST_UPDATE',
        entityType: 'request',
        collaboratorId: data.collaborator_id,
        entityId: variables.id,
        newValues: { status: variables.status, response_note: variables.response_note },
        metadata: { status: variables.status },
      });
      showRHSuccess('Demande mise à jour', 'Le statut de la demande a été enregistré');
    },
    onError: (error: Error) => {
      handleRHError(error, 'UPDATE_FAILED', { entity: 'document_request' });
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
