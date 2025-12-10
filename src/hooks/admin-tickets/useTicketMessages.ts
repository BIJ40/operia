/**
 * Gestion des messages de tickets
 */
import { supabase } from '@/integrations/supabase/client';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { errorToast } from '@/lib/toastHelpers';
import { logWarn, logError } from '@/lib/logger';
import { Ticket, Attachment } from '../use-user-tickets';

interface UseTicketMessagesOptions {
  onTicketsReload: () => Promise<void>;
  onTicketRefresh: (ticketId: string) => Promise<void>;
  selectedTicket: Ticket | null;
}

export function useTicketMessages({
  onTicketsReload,
  onTicketRefresh,
  selectedTicket,
}: UseTicketMessagesOptions) {

  const loadTicketDetails = async (
    ticketId: string,
    setMessages: (msgs: any[]) => void,
    setAttachments: (atts: Attachment[]) => void
  ) => {
    // Marquer le ticket comme vu
    const viewedResult = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ viewed_by_support_at: new Date().toISOString() })
        .eq('id', ticketId)
        .is('viewed_by_support_at', null),
      'ADMIN_TICKETS_MARK_VIEWED'
    );

    if (!viewedResult.success) {
      logWarn('[ADMIN-TICKETS] Error marking ticket as viewed', viewedResult.error);
    }

    // Load messages
    const msgsResult = await safeQuery<any[]>(
      supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'ADMIN_TICKETS_LOAD_MESSAGES'
    );

    if (!msgsResult.success) {
      errorToast(msgsResult.error!);
      setMessages([]);
      return;
    }
    
    const msgs = msgsResult.data || [];
    setMessages(msgs);

    // Mark unread user messages as read
    const unreadUserMessages = msgs.filter(
      (msg: any) => !msg.is_from_support && !msg.read_at
    );

    if (unreadUserMessages.length > 0) {
      const markReadResult = await safeMutation(
        supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadUserMessages.map((msg: any) => msg.id)),
        'ADMIN_TICKETS_MARK_READ'
      );

      if (!markReadResult.success) {
        logWarn('[ADMIN-TICKETS] Error marking messages as read', markReadResult.error);
      }
    }

    // Load attachments
    const attsResult = await safeQuery<Attachment[]>(
      supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'ADMIN_TICKETS_LOAD_ATTACHMENTS'
    );

    if (!attsResult.success) {
      errorToast(attsResult.error!);
      setAttachments([]);
      return;
    }
    
    setAttachments(attsResult.data || []);
  };

  const addSupportMessage = async (
    ticketId: string, 
    message: string, 
    userId: string,
    setMessages: (msgs: any[]) => void,
    setAttachments: (atts: Attachment[]) => void
  ) => {
    const result = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        message,
        is_from_support: true,
      } as any),
      'ADMIN_TICKETS_ADD_MESSAGE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }

    // Auto-assigner + mettre à jour le statut si nécessaire
    const updateData: any = { updated_at: new Date().toISOString() };
    
    if (!selectedTicket?.assigned_to) {
      updateData.assigned_to = userId;
      updateData.viewed_by_support_at = new Date().toISOString();
    }

    if (['new', 'waiting', 'waiting_user'].includes(selectedTicket?.status || '')) {
      updateData.status = 'in_progress';
    }

    if (Object.keys(updateData).length > 1) {
      await safeMutation(
        supabase.from('support_tickets').update(updateData).eq('id', ticketId),
        'ADMIN_TICKETS_AUTO_UPDATE'
      );
      
      if (selectedTicket) {
        await onTicketRefresh(ticketId);
      }
    }
    
    await onTicketsReload();
    await loadTicketDetails(ticketId, setMessages, setAttachments);
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .download(attachment.file_path);

      if (error) {
        logError('[ADMIN-TICKETS] Storage download error', error);
        errorToast('Impossible de télécharger le fichier');
        return;
      }

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError('[ADMIN-TICKETS] Error downloading attachment', error);
      errorToast('Impossible de télécharger le fichier');
    }
  };

  return {
    loadTicketDetails,
    addSupportMessage,
    downloadAttachment,
  };
}
