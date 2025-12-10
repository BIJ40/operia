/**
 * Opérations sur les tickets (update, assign, take, reopen)
 */
import { supabase } from '@/integrations/supabase/client';
import { safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
import { Ticket } from '../use-user-tickets';

interface UseTicketOperationsOptions {
  onTicketsReload: () => Promise<void>;
  onTicketRefresh: (ticketId: string) => Promise<void>;
  selectedTicket: Ticket | null;
}

export function useTicketOperations({
  onTicketsReload,
  onTicketRefresh,
  selectedTicket,
}: UseTicketOperationsOptions) {
  
  const updateTicketStatus = async (ticketId: string, status: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          resolved_at: status === 'resolved' ? new Date().toISOString() : null 
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_STATUS'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Statut mis à jour.');
    await onTicketsReload();
    if (selectedTicket?.id === ticketId) {
      await onTicketRefresh(ticketId);
    }
  };

  const updateTicketPriority = async (ticketId: string, heatPriority: number) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          heat_priority: heatPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_UPDATE_PRIORITY'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Priorité mise à jour.');
    await onTicketsReload();
    if (selectedTicket?.id === ticketId) {
      await onTicketRefresh(ticketId);
    }
  };

  const assignTicket = async (ticketId: string, userId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId || null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_ASSIGN'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast(userId ? 'Ticket assigné.' : 'Ticket désassigné.');
    await onTicketsReload();
    if (selectedTicket?.id === ticketId) {
      await onTicketRefresh(ticketId);
    }
  };

  const takeTicket = async (ticketId: string, userId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          assigned_to: userId,
          status: 'in_progress',
          viewed_by_support_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', ticketId),
      'ADMIN_TICKETS_TAKE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Vous avez pris en charge ce ticket.');
    await onTicketsReload();
    if (selectedTicket?.id === ticketId) {
      await onTicketRefresh(ticketId);
    }
  };

  const reopenTicket = async (ticketId: string) => {
    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status: 'in_progress',
          resolved_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId),
      'ADMIN_TICKETS_REOPEN'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    successToast('Ticket réouvert.');
    await onTicketsReload();
    if (selectedTicket?.id === ticketId) {
      await onTicketRefresh(ticketId);
    }
  };

  return {
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    takeTicket,
    reopenTicket,
  };
}
