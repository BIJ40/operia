import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logError, logWarn } from '@/lib/logger';
import { safeMutation, safeQuery, safeInvoke } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';


export interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  service: string | null;
  category: string | null;
  status: string;
  priority: string; // Legacy - prefer heat_priority
  heat_priority: number; // 0-12 unified priority
  source: 'chat' | 'portal' | 'system';
  agency_slug: string | null;
  has_attachments: boolean;
  chatbot_conversation: any;
  created_at: string;
  resolved_at: string | null;
  rating: number | null;
  rating_comment: string | null;
  unreadCount?: number;
  // V2.5: type unique remplace is_live_chat + escalated_from_chat
  type: 'chat_ai' | 'chat_human' | 'ticket';
  assigned_to: string | null;
  viewed_by_support_at: string | null;
  support_level: number;
  escalation_history: any[];
  // P3#1 SLA fields
  due_at?: string | null;
  sla_status?: string | null;
}

export interface Attachment {
  id: string;
  ticket_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export const useUserTickets = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadTickets = async () => {
    if (!user) return;

    setIsLoading(true);
    
    const result = await safeQuery<Ticket[]>(
      supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      'USER_TICKETS_LOAD'
    );

    if (!result.success) {
      errorToast(result.error!);
      setIsLoading(false);
      return;
    }

    // Load unread counts for each ticket
    const ticketsWithUnread = await Promise.all(
      (result.data || []).map(async (ticket) => {
        const { count } = await supabase
          .from('support_messages')
          .select('*', { count: 'exact', head: true })
          .eq('ticket_id', ticket.id)
          .eq('is_from_support', true)
          .is('read_at', null);

        return {
          ...ticket,
          unreadCount: count || 0,
        } as Ticket;
      })
    );

    setTickets(ticketsWithUnread);
    setIsLoading(false);
  };

  const loadTicketDetails = async (ticketId: string) => {
    // Load messages - FILTRER les notes internes (is_internal_note = false)
    const msgsResult = await safeQuery<any[]>(
      supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .or('is_internal_note.is.null,is_internal_note.eq.false')
        .order('created_at', { ascending: true }),
      'USER_TICKET_MESSAGES_LOAD'
    );

    if (!msgsResult.success) {
      errorToast(msgsResult.error!);
      return;
    }
    setMessages(msgsResult.data || []);

    // Mark support messages as read (non-blocking)
    await safeMutation(
      supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .eq('is_from_support', true)
        .is('read_at', null),
      'USER_TICKET_MARK_READ'
    );

    // Load attachments
    const attsResult = await safeQuery<Attachment[]>(
      supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'USER_TICKET_ATTACHMENTS_LOAD'
    );

    if (!attsResult.success) {
      errorToast(attsResult.error!);
      return;
    }
    setAttachments(attsResult.data || []);

    // Reload tickets to update unread count
    loadTickets();
  };

  const createTicket = async (
    subject: string,
    service: string,
    category: string,
    description: string,
    files: File[],
    heatPriority: number = 6
  ) => {
    if (!user) return null;

    setIsCreating(true);
    
    // Get user profile
    const profileResult = await safeQuery<{ first_name: string | null; last_name: string | null; agence: string | null }>(
      supabase
        .from('profiles')
        .select('first_name, last_name, agence')
        .eq('id', user.id)
        .single(),
      'USER_PROFILE_LOAD'
    );

    const profile = profileResult.data;
    const userName = profile?.first_name
      ? `${profile.first_name} ${profile.last_name || ''}`.trim()
      : 'Utilisateur';

    // Create ticket
    const ticketResult = await safeMutation<Ticket>(
      supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject,
          service,
          category,
          status: 'new',
          heat_priority: heatPriority,
          source: 'portal',
          agency_slug: profile?.agence || null,
          has_attachments: files.length > 0,
          support_level: 1,
        } as any)
        .select()
        .single(),
      'USER_TICKET_CREATE'
    );

    if (!ticketResult.success) {
      errorToast(ticketResult.error!);
      setIsCreating(false);
      return null;
    }

    const ticket = ticketResult.data!;

    // Create initial message with description
    const msgResult = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: description,
        is_from_support: false,
      } as any),
      'USER_TICKET_INITIAL_MESSAGE'
    );

    if (!msgResult.success) {
      logError('[USER-TICKETS] Error creating initial message', msgResult.error);
    }

    // Upload files if any
    if (files.length > 0) {
      for (const file of files) {
        const filePath = `${ticket.id}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('support-attachments')
          .upload(filePath, file);

        if (uploadError) {
          logError('[USER-TICKETS] Error uploading file', uploadError);
          continue;
        }

        await safeMutation(
          supabase
            .from('support_attachments')
            .insert({
              ticket_id: ticket.id,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            } as any),
          'USER_TICKET_ATTACHMENT_CREATE'
        );
      }
    }

    // Notify support (non bloquant)
    const notifyResult = await safeInvoke(
      supabase.functions.invoke('notify-support-ticket', {
        body: {
          ticketId: ticket.id,
          userName,
          lastQuestion: subject,
          appUrl: window.location.origin,
          service,
        },
      }),
      'NOTIFY_SUPPORT_TICKET'
    );

    if (!notifyResult.success) {
      logWarn('[USER-TICKETS] Error notifying support (non-blocking)', notifyResult.error);
    }

    successToast('Ticket créé avec succès');
    loadTickets();
    setIsCreating(false);
    return ticket;
  };

  const addMessage = async (ticketId: string, message: string) => {
    if (!user) return;

    const result = await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_from_support: false,
      } as any),
      'USER_MESSAGE_CREATE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return;
    }
    
    // Transition automatique : si le ticket était en 'waiting_user', le passer en 'in_progress'
    const currentResult = await safeQuery<{ status: string }>(
      supabase
        .from('support_tickets')
        .select('status')
        .eq('id', ticketId)
        .single(),
      'USER_TICKET_STATUS_CHECK'
    );
    
    if (currentResult.success && currentResult.data?.status === 'waiting_user') {
      await safeMutation(
        supabase
          .from('support_tickets')
          .update({ status: 'in_progress' })
          .eq('id', ticketId),
        'USER_TICKET_STATUS_UPDATE'
      );
    }
    
    // Reload ticket details to show new message
    loadTicketDetails(ticketId);
  };

  // Close ticket with reason
  const closeTicket = async (ticketId: string, reason: string) => {
    if (!user) return false;

    const result = await safeMutation(
      supabase
        .from('support_tickets')
        .update({ 
          status: 'closed',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .eq('user_id', user.id),
      'USER_TICKET_CLOSE'
    );

    if (!result.success) {
      errorToast(result.error!);
      return false;
    }

    // Add system message with close reason
    await safeMutation(
      supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message: `Ticket fermé par l'utilisateur. Raison : ${reason}`,
        is_from_support: false,
        is_system_message: true,
      } as any),
      'USER_TICKET_CLOSE_MESSAGE'
    );

    successToast('Ticket fermé avec succès');
    loadTickets();
    setSelectedTicket(null);
    return true;
  };

  // Upload attachment to existing ticket
  const uploadAttachment = async (ticketId: string, file: File) => {
    if (!user) return false;

    const filePath = `${ticketId}/${Date.now()}-${file.name}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, file);

      if (uploadError) {
        logError('[USER-TICKETS] Error uploading file', uploadError);
        errorToast('Erreur lors de l\'upload du fichier');
        return false;
      }

      const result = await safeMutation(
        supabase
          .from('support_attachments')
          .insert({
            ticket_id: ticketId,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          } as any),
        'USER_TICKET_ATTACHMENT_ADD'
      );

      if (!result.success) {
        errorToast(result.error!);
        return false;
      }

      // Update ticket has_attachments flag
      await safeMutation(
        supabase
          .from('support_tickets')
          .update({ has_attachments: true })
          .eq('id', ticketId),
        'USER_TICKET_UPDATE_ATTACHMENTS_FLAG'
      );

      successToast('Fichier ajouté');
      loadTicketDetails(ticketId);
      return true;
    } catch (error) {
      logError('[USER-TICKETS] Error uploading attachment', error);
      errorToast('Erreur lors de l\'upload');
      return false;
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('support-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logError('[USER-TICKETS] Error downloading attachment', error);
      errorToast('Impossible de télécharger le fichier');
    }
  };

  useEffect(() => {
    loadTickets();

    // Subscribe to new messages to update unread count in real-time
    const channel = supabase
      .channel('user-ticket-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `is_from_support=eq.true`,
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (selectedTicket) {
      loadTicketDetails(selectedTicket.id);
    }
  }, [selectedTicket]);

  return {
    tickets,
    selectedTicket,
    setSelectedTicket,
    attachments,
    messages,
    isLoading,
    isCreating,
    createTicket,
    addMessage,
    downloadAttachment,
    closeTicket,
    uploadAttachment,
    loadTickets,
  };
};
