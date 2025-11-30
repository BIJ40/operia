import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logError, logWarn } from '@/lib/logger';
import {
  TICKET_STATUSES,
  type TicketStatus,
  type TicketPriority,
  type TicketService,
  sendTicketMessage,
} from '@/services/supportService';

export interface SupportTicket {
  id: string;
  user_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  service: string | null;
  subject: string;
  chatbot_conversation: any;
  created_at: string;
  resolved_at: string | null;
  rating: number | null;
  rating_comment: string | null;
  viewed_by_support_at: string | null;
  has_unread_support_response?: boolean;
  support_level?: number;
  category?: string | null;
  escalation_history?: any; // Json type from Supabase
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  is_from_support: boolean;
  created_at: string;
  read_at: string | null;
  is_internal_note?: boolean;
}

export const useAdminSupport = () => {
  const { isAdmin, user } = useAuth();
  const [searchParams] = useSearchParams();
  const ticketIdFromUrl = searchParams.get('ticket');

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);
  
  // Nouveaux filtres Phase 3
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [serviceFilter, setServiceFilter] = useState<TicketService | 'all'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Pour chaque ticket, vérifier s'il y a des réponses support non lues
      const ticketsWithUnreadStatus = await Promise.all(
        (data || []).map(async (ticket) => {
          // Récupérer les messages du ticket
          const { data: messages } = await supabase
            .from('support_messages')
            .select('is_from_support, read_at')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          // Vérifier s'il y a un message du support non lu par l'utilisateur
          const hasUnreadSupportResponse = messages?.some(
            msg => msg.is_from_support && !msg.read_at
          ) || false;
          
          return {
            ...ticket,
            has_unread_support_response: hasUnreadSupportResponse
          };
        })
      );
      
      setTickets(ticketsWithUnreadStatus);
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error loading tickets', error);
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
      logError('[ADMIN-SUPPORT] Error loading messages', error);
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
      logWarn('[ADMIN-SUPPORT] Error assigning ticket', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    try {
      // Utiliser le service pour envoyer avec support des notes internes
      const result = await sendTicketMessage(
        selectedTicket.id,
        user.id,
        newMessage,
        true, // is_from_support
        isInternalNote
      );

      if (!result.success) throw new Error(result.error);

      setNewMessage('');
      setIsInternalNote(false); // Reset après envoi
      await loadMessages(selectedTicket.id);
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error sending message', error);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  // Mise à jour du statut d'un ticket
  const updateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === TICKET_STATUSES.RESOLVED || newStatus === TICKET_STATUSES.CLOSED) {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Statut mis à jour: ${newStatus}`);
      await loadTickets();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error updating status', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  // Mise à jour de la priorité d'un ticket
  const updatePriority = async (ticketId: string, newPriority: TicketPriority) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ priority: newPriority })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success(`Priorité mise à jour: ${newPriority}`);
      await loadTickets();
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, priority: newPriority } : null);
      }
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error updating priority', error);
      toast.error('Erreur lors de la mise à jour de la priorité');
    }
  };

  // Effacer tous les filtres
  const clearFilters = () => {
    setFilter('all');
    setPriorityFilter('all');
    setServiceFilter('all');
    setAssignmentFilter('all');
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
      logError('[ADMIN-SUPPORT] Error resolving ticket', error);
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
      logError('[ADMIN-SUPPORT] Error reopening ticket', error);
      toast.error('Erreur lors de la réouverture du ticket');
    }
  };

  // Escalade d'un ticket vers le niveau supérieur
  const escalateTicketToNextLevel = async () => {
    if (!selectedTicket) return;

    try {
      const currentLevel = selectedTicket.support_level || 1;
      const newLevel = Math.min(currentLevel + 1, 3);

      // Récupérer l'historique d'escalade existant
      const existingHistory = Array.isArray(selectedTicket.escalation_history) 
        ? selectedTicket.escalation_history 
        : [];
      
      const newHistoryEntry = {
        from_level: currentLevel,
        to_level: newLevel,
        assigned_to: null,
        reason: 'Escalade manuelle par le support',
        timestamp: new Date().toISOString(),
        escalated_by: user?.id,
      };

      const { error } = await supabase
        .from('support_tickets')
        .update({
          support_level: newLevel,
          assigned_to: null, // Désassigner pour réassignation
          escalation_history: [...existingHistory, newHistoryEntry],
          status: TICKET_STATUSES.IN_PROGRESS,
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      // Ajouter un message système
      await supabase.from('support_messages').insert({
        ticket_id: selectedTicket.id,
        sender_id: user!.id,
        message: `🔺 Ticket escaladé de N${currentLevel} vers N${newLevel}`,
        is_from_support: true,
        is_internal_note: true,
      });

      toast.success(`Ticket escaladé vers le niveau ${newLevel}`);
      await loadTickets();
      
      // Recharger le ticket sélectionné
      if (selectedTicket) {
        setSelectedTicket(prev => prev ? { 
          ...prev, 
          support_level: newLevel,
          escalation_history: [...existingHistory, newHistoryEntry],
        } : null);
      }
    } catch (error) {
      console.error('Error escalating ticket:', error);
      toast.error("Erreur lors de l'escalade du ticket");
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

  // Filtrer les tickets côté client selon les filtres actifs
  const filteredTickets = tickets.filter(ticket => {
    // Filtre par statut
    if (filter !== 'all' && ticket.status !== filter) return false;
    
    // Filtre par priorité
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    
    // Filtre par service
    if (serviceFilter !== 'all' && ticket.service !== serviceFilter) return false;
    
    // Filtre par assignation
    if (assignmentFilter === 'mine' && ticket.assigned_to !== user?.id) return false;
    if (assignmentFilter === 'unassigned' && ticket.assigned_to !== null) return false;
    
    return true;
  });

  return {
    isAdmin,
    user,
    tickets,
    filteredTickets,
    selectedTicket,
    messages,
    newMessage,
    filter,
    priorityFilter,
    serviceFilter,
    assignmentFilter,
    isUserTyping,
    isInternalNote,
    messagesEndRef,
    setNewMessage,
    setFilter,
    setPriorityFilter,
    setServiceFilter,
    setAssignmentFilter,
    setIsInternalNote,
    loadTickets,
    selectTicket,
    sendMessage,
    resolveTicket,
    reopenTicket,
    updateStatus,
    updatePriority,
    clearFilters,
    escalateTicketToNextLevel,
  };
};
