import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type TicketRole = 'developer' | 'tester' | 'franchiseur';

export interface TicketUserRole {
  id: string;
  user_id: string;
  ticket_role: TicketRole;
  created_at: string;
  created_by: string | null;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface TicketTransition {
  id: string;
  from_status: string;
  to_status: string;
  allowed_role: TicketRole;
  created_at: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  // Joined
  user_email?: string;
  user_name?: string;
}

export const TICKET_ROLE_LABELS: Record<TicketRole, string> = {
  developer: 'Développeur',
  tester: 'Testeur',
  franchiseur: 'Franchiseur',
};

// Hook to get current user's ticket role
export function useMyTicketRole() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['my-ticket-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('apogee_ticket_user_roles')
        .select('ticket_role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.ticket_role as TicketRole | null;
    },
    enabled: !!user?.id,
  });
}

// Hook to get all user roles (admin)
export function useTicketUserRoles() {
  return useQuery({
    queryKey: ['ticket-user-roles'],
    queryFn: async () => {
      // First get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('apogee_ticket_user_roles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [];
      
      // Then get profiles for those users
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      // Map profiles by id for quick lookup
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return roles.map((item) => {
        const profile = profilesMap.get(item.user_id);
        return {
          ...item,
          user_email: profile?.email,
          user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
        };
      }) as TicketUserRole[];
    },
  });
}

// Hook to get all transitions (admin)
export function useTicketTransitions() {
  return useQuery({
    queryKey: ['ticket-transitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('apogee_ticket_transitions')
        .select('*')
        .order('from_status');
      
      if (error) throw error;
      return data as TicketTransition[];
    },
  });
}

// Hook to get allowed transitions for current user
export function useAllowedTransitions(fromStatus: string) {
  const { user, isAdmin } = useAuth();
  const { data: myRole } = useMyTicketRole();
  
  return useQuery({
    queryKey: ['allowed-transitions', fromStatus, myRole, isAdmin],
    queryFn: async () => {
      // Admin can do everything
      if (isAdmin) {
        const { data } = await supabase
          .from('apogee_ticket_statuses')
          .select('id')
          .neq('id', fromStatus);
        return data?.map(s => s.id) || [];
      }
      
      if (!myRole) return [];
      
      const { data, error } = await supabase
        .from('apogee_ticket_transitions')
        .select('to_status')
        .eq('from_status', fromStatus)
        .eq('allowed_role', myRole);
      
      if (error) throw error;
      return data?.map(t => t.to_status) || [];
    },
    enabled: !!fromStatus && (isAdmin || !!myRole),
  });
}

// Check if user can transition (client-side helper)
export function useCanTransition() {
  const { isAdmin } = useAuth();
  const { data: transitions } = useTicketTransitions();
  const { data: myRole } = useMyTicketRole();
  
  return (fromStatus: string, toStatus: string): boolean => {
    if (isAdmin) return true;
    if (!myRole || !transitions) return false;
    
    return transitions.some(
      t => t.from_status === fromStatus && 
           t.to_status === toStatus && 
           t.allowed_role === myRole
    );
  };
}

// Mutations
export function useAssignTicketRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: TicketRole }) => {
      // Upsert - update if exists, insert if not
      const { error } = await supabase
        .from('apogee_ticket_user_roles')
        .upsert({
          user_id: userId,
          ticket_role: role,
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-user-roles'] });
      toast.success('Rôle assigné');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useRemoveTicketRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('apogee_ticket_user_roles')
        .delete()
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-user-roles'] });
      toast.success('Rôle retiré');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useAddTransition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transition: Omit<TicketTransition, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('apogee_ticket_transitions')
        .insert(transition);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-transitions'] });
      toast.success('Transition ajoutée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useRemoveTransition() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apogee_ticket_transitions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-transitions'] });
      toast.success('Transition supprimée');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

// Hook for ticket history
export function useTicketHistory(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-history', ticketId],
    queryFn: async () => {
      let query = supabase
        .from('apogee_ticket_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }
      
      const { data: history, error: historyError } = await query.limit(100);
      
      if (historyError) throw historyError;
      if (!history || history.length === 0) return [];
      
      // Get unique user ids and fetch profiles
      const userIds = [...new Set(history.map(h => h.user_id))];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;
      
      const profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      
      return history.map((item) => {
        const profile = profilesMap.get(item.user_id);
        return {
          ...item,
          user_email: profile?.email,
          user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
        };
      }) as TicketHistoryEntry[];
    },
    enabled: ticketId !== undefined,
  });
}

// Log an action to history
export function useLogTicketAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      ticketId,
      actionType,
      oldValue,
      newValue,
      metadata = {},
    }: {
      ticketId: string;
      actionType: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('apogee_ticket_history')
        .insert({
          ticket_id: ticketId,
          user_id: user.id,
          action_type: actionType,
          old_value: oldValue || null,
          new_value: newValue || null,
          metadata: metadata as unknown as Record<string, never>,
        });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-history', variables.ticketId] });
    },
  });
}
