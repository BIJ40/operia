import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportTicket {
  id: string;
  user_pseudo: string;
  user_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  chatbot_conversation: any;
  created_at: string;
  resolved_at: string | null;
  rating: number | null;
  rating_comment: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
  read_at: string | null;
}

export const useAdminSupport = () => {
  const { isAdmin, user } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<'waiting' | 'in_progress' | 'resolved'>('waiting');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erreur lors du chargement des tickets');
    }
  };

  const selectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);

    if (!ticket.assigned_to && user) {
      await assignTicket(ticket.id);
    }
  };

  const loadMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      const unreadMessages = data?.filter(
        (msg) => !msg.is_from_support && !msg.read_at
      ) || [];

      for (const msg of unreadMessages) {
        await supabase
          .from('support_messages')
          .update({ read_at: new Date().toISOString() })
          .eq('id', msg.id);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Erreur lors du chargement des messages');
    }
  };

  const assignTicket = async (ticketId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: user.id,
          status: 'in_progress',
        })
        .eq('id', ticketId);

      if (error) throw error;
      await loadTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    try {
      const { error } = await supabase.from('support_messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: user.id,
        message: newMessage,
        is_from_support: true,
      });

      if (error) throw error;

      setNewMessage('');
      await loadMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const resolveTicket = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Ticket résolu');
      setSelectedTicket(null);
      await loadTickets();
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast.error('Erreur lors de la résolution du ticket');
    }
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: 'in_progress',
          resolved_at: null,
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast.success('Ticket réouvert');
      await loadTickets();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error('Erreur lors de la réouverture du ticket');
    }
  };

  // Setup realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => loadTickets()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        () => loadTickets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Setup message realtime for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase
      .channel(`support-messages-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        () => loadMessages(selectedTicket.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  // Setup typing indicator
  useEffect(() => {
    if (!selectedTicket) return;

    const channel = supabase.channel(`typing:${selectedTicket.id}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.values(state).flat();
        const userIsTyping = typingUsers.some(
          (u: any) => u.user_id !== user?.id && u.status === 'typing'
        );
        setIsUserTyping(userIsTyping);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket, user]);

  // Auto-select ticket from URL
  useEffect(() => {
    if (ticketIdFromUrl && tickets.length > 0) {
      const ticket = tickets.find((t) => t.id === ticketIdFromUrl);
      if (ticket) {
        selectTicket(ticket);
      }
    }
  }, [ticketIdFromUrl, tickets]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return {
    isAdmin,
    user,
    tickets,
    selectedTicket,
    messages,
    newMessage,
    filter,
    isUserTyping,
    messagesEndRef,
    setNewMessage,
    setFilter,
    loadTickets,
    selectTicket,
    sendMessage,
    resolveTicket,
    reopenTicket,
  };
};
