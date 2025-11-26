import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Ticket {
  id: string;
  user_id: string;
  user_pseudo: string;
  subject: string;
  service: string | null;
  category: string | null;
  status: string;
  priority: string;
  source: 'chat' | 'portal' | 'system';
  agency_slug: string | null;
  has_attachments: boolean;
  chatbot_conversation: any;
  created_at: string;
  resolved_at: string | null;
  rating: number | null;
  rating_comment: string | null;
  unreadCount?: number;
  is_live_chat: boolean;
  escalated_from_chat: boolean;
  assigned_to: string | null;
  viewed_by_support_at: string | null;
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
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const loadTickets = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Load unread counts for each ticket
      const ticketsWithUnread = await Promise.all(
        (data || []).map(async (ticket) => {
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
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les tickets',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketDetails = async (ticketId: string) => {
    try {
      // Load messages
      const { data: msgs, error: msgsError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (msgsError) throw msgsError;
      setMessages(msgs || []);

      // Mark support messages as read
      await supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .eq('is_from_support', true)
        .is('read_at', null);

      // Load attachments
      const { data: atts, error: attsError } = await supabase
        .from('support_attachments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (attsError) throw attsError;
      setAttachments(atts || []);

      // Reload tickets to update unread count
      loadTickets();
    } catch (error) {
      console.error('Error loading ticket details:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails du ticket',
        variant: 'destructive',
        duration: 3000,
      });
    }
  };

  const createTicket = async (
    subject: string,
    service: string,
    category: string,
    description: string,
    files: File[],
    priority: string = 'normal'
  ) => {
    if (!user) return null;

    setIsCreating(true);
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, agence')
        .eq('id', user.id)
        .single();

      const userName = profile?.first_name
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : 'Utilisateur';

      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          user_pseudo: userName,
          subject,
          service,
          category,
          status: 'waiting',
          priority,
          source: 'portal',
          agency_slug: profile?.agence || null,
          has_attachments: files.length > 0,
        } as any)
        .select()
        .single();

      if (ticketError) throw ticketError;

      // Create initial message with description
      const { error: msgError } = await supabase.from('support_messages').insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        message: description,
        is_from_support: false,
      } as any);

      if (msgError) throw msgError;

      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const filePath = `${ticket.id}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('support-attachments')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { error: attError } = await supabase
            .from('support_attachments')
            .insert({
              ticket_id: ticket.id,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            } as any);

          if (attError) throw attError;
        }
      }

      // Notify support (non bloquant pour la création du ticket)
      try {
        await supabase.functions.invoke('notify-support-ticket', {
          body: {
            ticketId: ticket.id,
            userName,
            lastQuestion: subject,
            appUrl: window.location.origin,
            service,
          },
        });
      } catch (notifyError) {
        console.error('Error notifying support about new ticket:', notifyError);
        // On ne bloque pas l'utilisateur si la notif email échoue
      }

      toast({
        title: 'Succès',
        description: 'Ticket créé avec succès',
        duration: 3000,
      });

      loadTickets();
      return ticket;
    } catch (error) {
      console.error('Error creating ticket:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de créer le ticket',
        variant: 'destructive',
        duration: 5000,
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const addMessage = async (ticketId: string, message: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message,
        is_from_support: false,
      } as any);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding message:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'envoyer le message",
        variant: 'destructive',
        duration: 3000,
      });
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
      console.error('Error downloading attachment:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le fichier',
        variant: 'destructive',
        duration: 3000,
      });
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
          loadTickets(); // Reload tickets to update unread counts
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
    loadTickets,
  };
};
