/**
 * Hook pour gérer les demandes de création d'utilisateur
 * 
 * @deprecated LEGACY SYSTEM - No longer used in V2 permissions.
 * All user creation is now direct based on getUserManagementCapabilities.
 * This hook and user_creation_requests table are kept for historical data only.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { GlobalRole } from '@/types/globalRoles';
import type { EnabledModules } from '@/types/modules';
import type { Json } from '@/integrations/supabase/types';
import { ALL_USER_QUERY_PATTERNS } from '@/lib/queryKeys';

// ✅ SYNCHRONISATION COMPLÈTE: fonction centralisée pour invalider TOUTES les query keys utilisateurs
function invalidateAllUserQueries(queryClient: ReturnType<typeof useQueryClient>) {
  ALL_USER_QUERY_PATTERNS.forEach(pattern => {
    queryClient.invalidateQueries({ queryKey: [pattern] });
  });
  queryClient.invalidateQueries({ predicate: (query) => 
    query.queryKey[0] === 'agency-users' || 
    query.queryKey[0] === 'user-profile'
  });
}

export interface UserCreationRequest {
  id: string;
  requested_by: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_agence: string;
  target_global_role: GlobalRole;
  enabled_modules: EnabledModules | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string | null;
  // Joined data
  requester_email?: string;
  requester_name?: string;
  agency_label?: string;
  agency_slug?: string;
}

export interface CreateRequestInput {
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_agence: string;
  target_global_role: GlobalRole;
  enabled_modules?: EnabledModules;
  notes?: string;
}

export function useUserCreationRequests() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all requests visible to current user
  const requestsQuery = useQuery({
    queryKey: ['user-creation-requests'],
    queryFn: async () => {
      // First get the requests
      const { data: requests, error } = await supabase
        .from('user_creation_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      // Get requester profiles
      const requesterIds = [...new Set(requests.map(r => r.requested_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', requesterIds);

      // Get agencies
      const agencyIds = [...new Set(requests.map(r => r.agency_id))];
      const { data: agencies } = await supabase
        .from('apogee_agencies')
        .select('id, label, slug')
        .in('id', agencyIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const agencyMap = new Map((agencies || []).map(a => [a.id, a]));

      return requests.map((req) => {
        const requester = profileMap.get(req.requested_by);
        const agency = agencyMap.get(req.agency_id);
        return {
          ...req,
          requester_email: requester?.email,
          requester_name: requester ? `${requester.first_name || ''} ${requester.last_name || ''}`.trim() : null,
          agency_label: agency?.label,
          agency_slug: agency?.slug,
        };
      }) as UserCreationRequest[];
    },
  });

  // Create a new request
  const createRequestMutation = useMutation({
    mutationFn: async (input: CreateRequestInput) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { data, error } = await supabase
        .from('user_creation_requests')
        .insert({
          requested_by: user.id,
          agency_id: input.agency_id,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          role_agence: input.role_agence,
          target_global_role: input.target_global_role,
          enabled_modules: (input.enabled_modules || {}) as Json,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Demande de création envoyée.');
      queryClient.invalidateQueries({ queryKey: ['user-creation-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  // Approve a request (admin only)
  const approveRequestMutation = useMutation({
    mutationFn: async ({ requestId, password }: { requestId: string; password: string }) => {
      // 1. Get the request details
      const { data: request, error: fetchError } = await supabase
        .from('user_creation_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Demande non trouvée');

      // 2. Get agency slug for the user
      const { data: agency, error: agencyError } = await supabase
        .from('apogee_agencies')
        .select('slug')
        .eq('id', request.agency_id)
        .single();

      if (agencyError) throw agencyError;

      // 3. Create the user via edge function
      const { data: createData, error: createError } = await supabase.functions.invoke('create-user', {
        body: {
          email: request.email,
          password,
          firstName: request.first_name,
          lastName: request.last_name,
          agence: agency?.slug || '',
          globalRole: request.target_global_role,
          roleAgence: request.role_agence,
          enabledModules: request.enabled_modules,
          sendEmail: true,
        },
      });

      if (createError) throw createError;
      if (createData?.error) throw new Error(createData.error);

      // 4. Mark request as approved
      const { error: updateError } = await supabase
        .from('user_creation_requests')
        .update({
          status: 'approved',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      return { request, user: createData };
    },
    onSuccess: () => {
      toast.success('Utilisateur créé avec succès.');
      queryClient.invalidateQueries({ queryKey: ['user-creation-requests'] });
      invalidateAllUserQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  // Reject a request (admin only)
  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('user_creation_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande rejetée.');
      queryClient.invalidateQueries({ queryKey: ['user-creation-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  // Delete a request
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('user_creation_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Demande supprimée.');
      queryClient.invalidateQueries({ queryKey: ['user-creation-requests'] });
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
    },
  });

  return {
    requests: requestsQuery.data || [],
    isLoading: requestsQuery.isLoading,
    pendingRequests: (requestsQuery.data || []).filter(r => r.status === 'pending'),
    createRequest: createRequestMutation.mutate,
    isCreating: createRequestMutation.isPending,
    approveRequest: approveRequestMutation.mutate,
    isApproving: approveRequestMutation.isPending,
    rejectRequest: rejectRequestMutation.mutate,
    isRejecting: rejectRequestMutation.isPending,
    deleteRequest: deleteRequestMutation.mutate,
    isDeleting: deleteRequestMutation.isPending,
  };
}
