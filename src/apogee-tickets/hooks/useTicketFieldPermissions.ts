import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TicketRole } from './useTicketPermissions';

export interface TicketFieldPermissions {
  id: string;
  can_delete_ticket: TicketRole[];
  can_edit_estimation: TicketRole[];
  can_edit_owner_side: TicketRole[];
  can_edit_priority: TicketRole[];
  can_edit_module: TicketRole[];
  can_qualify_ticket: TicketRole[];
  can_merge_tickets: TicketRole[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_PERMISSIONS: TicketFieldPermissions = {
  id: 'default',
  can_delete_ticket: ['franchiseur'],
  can_edit_estimation: ['developer'],
  can_edit_owner_side: ['developer', 'franchiseur'],
  can_edit_priority: ['developer', 'tester', 'franchiseur'],
  can_edit_module: ['developer', 'franchiseur'],
  can_qualify_ticket: ['developer', 'franchiseur'],
  can_merge_tickets: ['developer', 'franchiseur'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const PERMISSION_LABELS: Record<keyof Omit<TicketFieldPermissions, 'id' | 'created_at' | 'updated_at'>, string> = {
  can_delete_ticket: 'Supprimer un ticket',
  can_edit_estimation: 'Éditer H min / H max (estimation)',
  can_edit_owner_side: 'Éditer la PEC (owner_side)',
  can_edit_priority: 'Éditer la priorité',
  can_edit_module: 'Éditer le module',
  can_qualify_ticket: 'Qualifier un ticket (IA)',
  can_merge_tickets: 'Fusionner des tickets',
};

export function useTicketFieldPermissions() {
  return useQuery({
    queryKey: ['ticket-field-permissions'],
    queryFn: async (): Promise<TicketFieldPermissions> => {
      const { data, error } = await supabase
        .from('apogee_ticket_field_permissions')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching ticket field permissions:', error);
        return DEFAULT_PERMISSIONS;
      }
      
      if (!data) return DEFAULT_PERMISSIONS;
      
      return {
        id: data.id,
        can_delete_ticket: (data.can_delete_ticket || []) as TicketRole[],
        can_edit_estimation: (data.can_edit_estimation || []) as TicketRole[],
        can_edit_owner_side: (data.can_edit_owner_side || []) as TicketRole[],
        can_edit_priority: (data.can_edit_priority || []) as TicketRole[],
        can_edit_module: (data.can_edit_module || []) as TicketRole[],
        can_qualify_ticket: (data.can_qualify_ticket || []) as TicketRole[],
        can_merge_tickets: (data.can_merge_tickets || []) as TicketRole[],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateTicketFieldPermissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Omit<TicketFieldPermissions, 'id' | 'created_at' | 'updated_at'>>) => {
      const { error } = await supabase
        .from('apogee_ticket_field_permissions')
        .update(updates)
        .eq('id', 'default');
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-field-permissions'] });
      toast.success('Permissions mises à jour');
    },
    onError: (error) => {
      console.error('Error updating permissions:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Vérifie si un rôle a la permission pour une action donnée
 */
export function hasFieldPermission(
  permissions: TicketFieldPermissions | undefined,
  field: keyof Omit<TicketFieldPermissions, 'id' | 'created_at' | 'updated_at'>,
  userRole: TicketRole | null
): boolean {
  if (!permissions || !userRole) return false;
  const allowedRoles = permissions[field] as TicketRole[];
  return allowedRoles.includes(userRole);
}
