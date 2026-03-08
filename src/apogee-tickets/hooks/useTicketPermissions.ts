import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

export type TicketRole = 'developer' | 'tester' | 'franchiseur';

// Type unifié pour le rôle ticketing utilisateur
export interface TicketRoleInfo {
  canUseTicketing: boolean;
  isPlatformAdmin: boolean;
  isSupport: boolean;
  ticketRole: TicketRole | null;
  scope: 'none' | 'agency' | 'network';
  reason?: string;
  // Granular permissions from module options
  canViewKanban: boolean;  // View kanban board
  canCreate: boolean;      // Create new tickets
  canImport: boolean;      // Import from Excel
  canManage: boolean;      // Edit existing ticket fields (not comments/attachments)
}

// Objet par défaut pour les cas d'erreur ou non-authentifié
const DEFAULT_TICKET_ROLE_INFO: TicketRoleInfo = {
  canUseTicketing: false,
  isPlatformAdmin: false,
  isSupport: false,
  ticketRole: null,
  scope: 'none',
  reason: 'not_authenticated',
  canViewKanban: false,
  canCreate: false,
  canImport: false,
  canManage: false,
};

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

// Hook to get current user's ticket role - NEVER returns undefined
export function useMyTicketRole() {
  const { user } = useAuthCore();
  const { globalRole } = usePermissions();
  
  return useQuery<TicketRoleInfo>({
    queryKey: ['my-ticket-role', user?.id],
    queryFn: async (): Promise<TicketRoleInfo> => {
      // Cas 1: Pas d'utilisateur connecté
      if (!user?.id) {
        console.warn('[MY-TICKET-ROLE] ❌ No user.id — returning not_authenticated');
        return { ...DEFAULT_TICKET_ROLE_INFO, reason: 'not_authenticated' };
      }
      
      console.log('[MY-TICKET-ROLE] 🔍 Checking access for user:', user.id, 'email:', user.email);
      
      try {
        // Vérification robuste d'accès Ticketing:
        // - RPC canonique (source de vérité backend)
        // - + récupération options via user_modules/profile pour les droits granulaires
        const [profileResult, userModulesResult, rpcAccessResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('global_role')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_modules')
            .select('module_key, options')
            .eq('user_id', user.id)
            .eq('module_key', 'ticketing'),
          supabase
            .rpc('has_apogee_tickets_access', { _user_id: user.id })
        ]);

        if (profileResult.error) {
          logError('[MY-TICKET-ROLE] Error fetching profile', profileResult.error);
        }

        if (userModulesResult.error) {
          logError('[MY-TICKET-ROLE] Error fetching user_modules for ticketing', userModulesResult.error);
        }

        if (rpcAccessResult.error) {
          logError('[MY-TICKET-ROLE] Error calling has_apogee_tickets_access', rpcAccessResult.error);
        }

        const profile = profileResult.data;

        // Vérifier le niveau de rôle global (N5+ = admin)
        const effectiveGlobalRole = profile?.global_role || globalRole || null;
        const isN5Plus = ['platform_admin', 'superadmin'].includes(effectiveGlobalRole || '');

        // Vérifier si le module Ticketing est activé via backend (canonique)
        const hasRpcTicketingAccess = rpcAccessResult.data === true;

        // Extraire les sous-options depuis user_modules
        const userModuleRows = (userModulesResult.data || []) as Array<{ module_key: string; options: Record<string, boolean> | null }>;
        const isModuleEnabledViaUserModules = userModuleRows.length > 0;
        const hasLocalTicketingAccess = isModuleEnabledViaUserModules;

        const userModuleOptions = userModuleRows.reduce<Record<string, boolean>>((acc, row) => {
          if (row?.options && typeof row.options === 'object') {
            Object.assign(acc, row.options);
          }
          return acc;
        }, {});
        const moduleOptions = { ...userModuleOptions };

        const canViewKanban = moduleOptions.kanban !== false;
        const canCreate = moduleOptions.create !== false;
        const canImport = moduleOptions.import === true;
        const canManage = moduleOptions.manage !== false;

        // Accès effectif: RPC + fallback local
        const hasEffectiveTicketingAccess = hasRpcTicketingAccess || hasLocalTicketingAccess;

        // Cas 2: Module non activé et pas admin
        if (!hasEffectiveTicketingAccess && !isN5Plus) {
          console.warn('[MY-TICKET-ROLE] ❌ ACCESS DENIED — module_disabled', {
            userId: user.id,
            email: user.email,
            hasRpcTicketingAccess,
            hasLocalTicketingAccess,
            isN5Plus,
          });
          return { ...DEFAULT_TICKET_ROLE_INFO, reason: 'module_disabled' };
        }
        
        // Récupérer le rôle ticket spécifique de l'utilisateur
        const { data: roleData, error: roleError } = await supabase
          .from('apogee_ticket_user_roles')
          .select('ticket_role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleError) {
          logError('[MY-TICKET-ROLE] Error fetching ticket role', roleError);
          return { ...DEFAULT_TICKET_ROLE_INFO, reason: 'fetch_error' };
        }
        
        const ticketRole = (roleData?.ticket_role as TicketRole) || null;
        
        // Cas 3: Admin (N5+) - tous droits
        if (isN5Plus) {
          return {
            canUseTicketing: true,
            isPlatformAdmin: true,
            isSupport: true,
            ticketRole,
            scope: 'network',
            canViewKanban: true,
            canCreate: true,
            canImport: true,
            canManage: true,
          };
        }
        
        // Cas 4: Module activé, utilisateur standard - appliquer les options
        const result: TicketRoleInfo = {
          canUseTicketing: true,
          isPlatformAdmin: false,
          isSupport: ticketRole === 'franchiseur',
          ticketRole,
          scope: 'agency',
          canViewKanban,
          canCreate,
          canImport,
          canManage,
        };
        console.log('[MY-TICKET-ROLE] ✅ ACCESS GRANTED for', user.email, result);
        return result;
        
      } catch (error) {
        logError('[MY-TICKET-ROLE] Unexpected error', error);
        return { ...DEFAULT_TICKET_ROLE_INFO, reason: 'fetch_error' };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
        .order('created_at', { ascending: false })
        .limit(500);
      
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
// SIMPLIFIED: Everyone can transition to any status (history is logged)
export function useAllowedTransitions(fromStatus: string) {
  const { user } = useAuthCore();
  const { data: roleInfo } = useMyTicketRole();
  
  return useQuery({
    queryKey: ['allowed-transitions', fromStatus, user?.id],
    queryFn: async () => {
      // Anyone with ticketing access can transition to any status
      const { data } = await supabase
        .from('apogee_ticket_statuses')
        .select('id')
        .neq('id', fromStatus)
        .order('display_order');
      return data?.map(s => s.id) || [];
    },
    enabled: !!fromStatus && !!user && roleInfo?.canUseTicketing,
  });
}

// Check if user can transition (client-side helper)
// SIMPLIFIED: Everyone with ticketing access can transition anywhere
export function useCanTransition() {
  const { data: roleInfo } = useMyTicketRole();
  
  return (_fromStatus: string, _toStatus: string): boolean => {
    // Anyone with ticketing access can transition
    return roleInfo?.canUseTicketing === true;
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
      toast.success('Rôle assigné.');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
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
      toast.success('Rôle retiré.');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
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
      toast.success('Transition ajoutée.');
    },
    onError: (error: Error) => {
      toast.error(`Erreur : ${error.message}`);
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
      if (!ticketId) return [];
      
      // Fetch ticket info for creation date
      const [historyResult, ticketResult] = await Promise.all([
        supabase
          .from('apogee_ticket_history')
          .select('*')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('apogee_tickets')
          .select('created_at, created_by_user_id')
          .eq('id', ticketId)
          .maybeSingle()
      ]);
      
      if (historyResult.error) throw historyResult.error;
      
      const history = historyResult.data || [];
      const ticket = ticketResult.data;
      
      // Get unique user ids (including ticket creator)
      const userIds = [...new Set([
        ...history.map(h => h.user_id),
        ...(ticket?.created_by_user_id ? [ticket.created_by_user_id] : [])
      ])];
      
      let profilesMap = new Map<string, { id: string; email: string | null; first_name: string | null; last_name: string | null }>();
      
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);
        
        if (profilesError) throw profilesError;
        profilesMap = new Map((profiles || []).map(p => [p.id, p]));
      }
      
      // Map history entries with user info
      const historyWithUsers = history.map((item) => {
        const profile = profilesMap.get(item.user_id);
        return {
          ...item,
          user_email: profile?.email,
          user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '',
        };
      }) as TicketHistoryEntry[];
      
      // Add synthetic "created" event if ticket exists and not already in history
      if (ticket?.created_at) {
        const hasCreatedEvent = historyWithUsers.some(h => h.action_type === 'created');
        if (!hasCreatedEvent) {
          const creatorProfile = ticket.created_by_user_id 
            ? profilesMap.get(ticket.created_by_user_id) 
            : null;
          
          historyWithUsers.push({
            id: `created-${ticketId}`,
            ticket_id: ticketId,
            user_id: ticket.created_by_user_id || 'system',
            action_type: 'created',
            old_value: null,
            new_value: null,
            metadata: {},
            created_at: ticket.created_at,
            user_email: creatorProfile?.email,
            user_name: creatorProfile 
              ? `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim() 
              : 'Système',
          });
          
          // Re-sort by date descending
          historyWithUsers.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
      }
      
      return historyWithUsers;
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
