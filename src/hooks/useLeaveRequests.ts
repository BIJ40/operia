import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LeaveRequest, LeaveType, EventSubtype, LeaveStatus } from '@/types/leaveRequest';
import { errorToast, successToast } from '@/lib/toastHelpers';

interface CreateLeaveRequestParams {
  type: LeaveType;
  event_subtype?: EventSubtype | null;
  start_date: string;
  end_date?: string | null;
  days_count?: number | null;
  requires_justification?: boolean;
}

interface UpdateLeaveRequestParams {
  id: string;
  status?: LeaveStatus;
  end_date?: string | null;
  days_count?: number | null;
  manager_comment?: string | null;
  refusal_reason?: string | null;
  justification_document_id?: string | null;
}

export function useMyLeaveRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-leave-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get collaborator_id from profile
      const { data: collaborator, error: collabError } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (collabError) throw collabError;
      if (!collaborator) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('collaborator_id', collaborator.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeaveRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useAgencyLeaveRequests() {
  const { agence } = useAuth();

  return useQuery({
    queryKey: ['agency-leave-requests', agence],
    queryFn: async () => {
      if (!agence) return [];
      
      // Get agency_id
      const { data: agency, error: agencyError } = await supabase
        .from('apogee_agencies')
        .select('id')
        .eq('slug', agence)
        .maybeSingle();

      if (agencyError) throw agencyError;
      if (!agency) return [];

      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          collaborator:collaborators(id, first_name, last_name, role)
        `)
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!agence,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateLeaveRequestParams) => {
      if (!user?.id) throw new Error('Utilisateur non authentifié');
      
      // Get collaborator and agency
      const { data: collaborator, error: collabError } = await supabase
        .from('collaborators')
        .select('id, agency_id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (collabError) throw collabError;

      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          ...params,
          collaborator_id: collaborator.id,
          agency_id: collaborator.agency_id,
          status: 'PENDING_MANAGER',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Notify N2 managers (RH roles + dirigeants) of the agency
      const { data: rhManagers } = await supabase
        .from('profiles')
        .select('id')
        .eq('agency_id', collaborator.agency_id)
        .or('global_role.eq.franchisee_admin,global_role.eq.franchisor_user,global_role.eq.franchisor_admin,global_role.eq.platform_admin,global_role.eq.superadmin');

      if (rhManagers?.length) {
        const employeeName = `${collaborator.first_name} ${collaborator.last_name}`;
        const notifications = rhManagers
          .filter(m => m.id !== user.id)
          .map(manager => ({
            collaborator_id: collaborator.id,
            recipient_id: manager.id,
            sender_id: user.id,
            agency_id: collaborator.agency_id,
            notification_type: 'REQUEST_CREATED',
            title: 'Nouvelle demande de congé',
            message: `${employeeName} a soumis une demande de congé`,
            related_request_id: data.id,
          }));

        if (notifications.length) {
          await supabase.from('rh_notifications').insert(notifications);
        }
      }

      return data as LeaveRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
      successToast('Demande envoyée');
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });
}

export function useUpdateLeaveRequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: UpdateLeaveRequestParams) => {
      const { id, ...updates } = params;
      
      const updatePayload: Record<string, unknown> = { ...updates };
      
      // If status changes to APPROVED/REFUSED, set validator info
      if (updates.status === 'APPROVED' || updates.status === 'REFUSED' || updates.status === 'ACKNOWLEDGED') {
        updatePayload.validated_by = user?.id;
        updatePayload.validated_at = new Date().toISOString();
      }

      // Get request details before update for notification
      const { data: existingRequest, error: fetchError } = await supabase
        .from('leave_requests')
        .select('collaborator_id, agency_id, created_by')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('leave_requests')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify employee if status changed to APPROVED or REFUSED
      if (updates.status === 'APPROVED' || updates.status === 'REFUSED') {
        // Get the user_id from collaborator
        const { data: collaborator } = await supabase
          .from('collaborators')
          .select('user_id')
          .eq('id', existingRequest.collaborator_id)
          .maybeSingle();

        if (collaborator?.user_id) {
          const isApproved = updates.status === 'APPROVED';
          await supabase.from('rh_notifications').insert({
            collaborator_id: existingRequest.collaborator_id,
            recipient_id: collaborator.user_id,
            sender_id: user?.id,
            agency_id: existingRequest.agency_id,
            notification_type: isApproved ? 'REQUEST_COMPLETED' : 'REQUEST_REJECTED',
            title: isApproved ? 'Demande de congé approuvée' : 'Demande de congé refusée',
            message: isApproved 
              ? 'Votre demande de congé a été acceptée' 
              : `Votre demande de congé a été refusée${updates.refusal_reason ? `. Motif : ${updates.refusal_reason}` : ''}`,
            related_request_id: id,
          });
        }
      }

      return data as LeaveRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['rh-notifications-count'] });
      
      if (data.status === 'APPROVED') {
        successToast('Demande acceptée');
      } else if (data.status === 'REFUSED') {
        successToast('Demande refusée');
      } else if (data.status === 'ACKNOWLEDGED') {
        successToast('Pris en connaissance');
      }
    },
    onError: (error: Error) => {
      errorToast(error.message);
    },
  });
}

export function useFrenchHolidays(year: number) {
  return useQuery({
    queryKey: ['french-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('french_holidays')
        .select('date, name')
        .eq('year', year);

      if (error) throw error;
      return (data || []).map(h => h.date);
    },
  });
}

// Fonction utilitaire pour calculer les jours côté client
export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  type: LeaveType,
  holidays: string[]
): number {
  let days = 0;
  const current = new Date(startDate);
  let prevWasFriday = false;

  while (current <= endDate) {
    const dateStr = current.toISOString().split('T')[0];
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    // Skip holidays
    if (!holidays.includes(dateStr)) {
      if (type === 'CP') {
        // CP: Mon-Fri + Saturday if Friday was taken
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          days++;
          prevWasFriday = dayOfWeek === 5;
        } else if (dayOfWeek === 6 && prevWasFriday) {
          days++;
          prevWasFriday = false;
        } else {
          prevWasFriday = false;
        }
      } else {
        // Other types: Mon-Sat calendar days
        if (dayOfWeek >= 1 && dayOfWeek <= 6) {
          days++;
        }
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return days;
}
