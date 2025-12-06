/**
 * Hook pour générer le document de décision de congé et envoyer les notifications
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { logError } from '@/lib/logger';
import type { LeaveStatus } from '@/types/leaveRequest';

interface GenerateDecisionParams {
  leaveRequestId: string;
}

interface SendNotificationParams {
  leaveRequestId: string;
  collaboratorId: string;
  status: LeaveStatus;
  message?: string;
}

export function useGenerateLeaveDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leaveRequestId }: GenerateDecisionParams) => {
      const { data, error } = await supabase.functions.invoke('generate-leave-decision', {
        body: { leaveRequestId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-leave-requests'] });
      successToast('Document de décision généré');
    },
    onError: (error: Error) => {
      errorToast('Erreur lors de la génération du document');
      logError('[useLeaveDecision] Generate error:', error);
    },
  });
}

export function useSendLeaveNotification() {
  return useMutation({
    mutationFn: async ({ 
      leaveRequestId, 
      collaboratorId, 
      status, 
      message 
    }: SendNotificationParams) => {
      // Get the collaborator's user_id
      const { data: collaborator, error: collabError } = await supabase
        .from('collaborators')
        .select('user_id, first_name, last_name')
        .eq('id', collaboratorId)
        .single();

      if (collabError) throw collabError;
      if (!collaborator.user_id) {
        console.warn('Collaborator has no linked user account');
        return null;
      }

      // Create RH notification
      const STATUS_MESSAGES: Record<string, string> = {
        'APPROVED': 'Votre demande de congé a été acceptée',
        'REFUSED': 'Votre demande de congé a été refusée',
        'ACKNOWLEDGED': 'Votre arrêt maladie a été pris en connaissance',
        'PENDING_JUSTIFICATIVE': 'Un justificatif est requis pour votre demande',
        'CLOSED': 'Votre demande de congé a été clôturée',
      };

      const notificationMessage = message || STATUS_MESSAGES[status] || 'Mise à jour de votre demande de congé';

      // Create RH notification using the correct table structure
      const { error: notifError } = await supabase
        .from('rh_notifications')
        .insert({
          collaborator_id: collaboratorId,
          agency_id: (await supabase.from('collaborators').select('agency_id').eq('id', collaboratorId).single()).data?.agency_id || '',
          notification_type: 'LEAVE_STATUS_UPDATE',
          title: 'Demande de congé',
          message: notificationMessage,
          related_request_id: leaveRequestId,
        });

      if (notifError) {
        logError('[useLeaveDecision] Notification error:', notifError);
        // Don't throw, notification failure shouldn't block the flow
      }

      return { success: true };
    },
    onError: (error: Error) => {
      logError('[useLeaveDecision] Send notification error:', error);
    },
  });
}

/**
 * Hook combiné pour valider une demande avec génération de document et notification
 */
export function useProcessLeaveRequest() {
  const generateDecision = useGenerateLeaveDecision();
  const sendNotification = useSendLeaveNotification();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      leaveRequestId, 
      collaboratorId,
      status,
      message,
    }: {
      leaveRequestId: string;
      collaboratorId: string;
      status: LeaveStatus;
      message?: string;
    }) => {
      // Generate decision document for final statuses
      if (['APPROVED', 'REFUSED', 'CLOSED'].includes(status)) {
        await generateDecision.mutateAsync({ leaveRequestId });
      }

      // Send notification
      await sendNotification.mutateAsync({
        leaveRequestId,
        collaboratorId,
        status,
        message,
      });

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['agency-leave-requests'] });
    },
  });
}
