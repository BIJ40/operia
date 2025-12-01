import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logError, logWarn } from '@/lib/logger';
import { safeQuery, safeMutation } from '@/lib/safeQuery';
import { errorToast, successToast } from '@/lib/toastHelpers';
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
  priority: string; // Legacy field - prefer heat_priority
  heat_priority: number; // 0-12 unified priority
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
  escalation_history?: any;
  // P3#1 SLA fields
  due_at?: string | null;
  sla_status?: string | null;
  // P3#2 AI Classification fields
  ai_category?: string | null;
  ai_priority?: string | null;
  ai_confidence?: number | null;
  ai_suggested_answer?: string | null;
  ai_is_incomplete?: boolean;
  ai_tags?: string[] | null;
  auto_classified?: boolean;
  ai_classified_at?: string | null;
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
  
  const [heatPriorityMin, setHeatPriorityMin] = useState<number>(0);
  const [heatPriorityMax, setHeatPriorityMax] = useState<number>(12);
  const [serviceFilter, setServiceFilter] = useState<TicketService | 'all'>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTickets = async () => {
    // Admins voient tous les tickets
    // Support users voient seulement: non-assignés OU assignés à eux-mêmes
    let query = supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    
    if (!isAdmin && user) {
      // Filtrer: assigned_to IS NULL OR assigned_to = user.id
      query = query.or(`assigned_to.is.null,assigned_to.eq.${user.id}`);
    }
    
    const result = await safeQuery<SupportTicket[]>(query, 'ADMIN_SUPPORT_LOAD_TICKETS');

    if (!result.success || !result.data) {
      errorToast('Erreur lors du chargement des tickets');
      return;
    }
    
    // Pour chaque ticket, vérifier s'il y a des réponses support non lues
    const ticketsWithUnreadStatus = await Promise.all(
      result.data.map(async (ticket) => {
        const msgResult = await safeQuery<{ is_from_support: boolean; read_at: string | null }[]>(
          supabase.from('support_messages')
            .select('is_from_support, read_at')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false })
            .limit(5),
          'ADMIN_SUPPORT_CHECK_UNREAD'
        );
        
        const hasUnreadSupportResponse = msgResult.data?.some(
          msg => msg.is_from_support && !msg.read_at
        ) || false;
        
        return {
          ...ticket,
          has_unread_support_response: hasUnreadSupportResponse
        };
      })
    );
    
    setTickets(ticketsWithUnreadStatus);
  };

  const selectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadMessages(ticket.id);

    if (!ticket.assigned_to && user) {
      await assignTicket(ticket.id);
    }
  };

  const loadMessages = async (ticketId: string) => {
    const result = await safeQuery<SupportMessage[]>(
      supabase.from('support_messages').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true }),
      'ADMIN_SUPPORT_LOAD_MESSAGES'
    );

    if (!result.success) {
      errorToast('Erreur lors du chargement des messages');
      return;
    }
    
    setMessages(result.data || []);

    const unreadMessages = result.data?.filter(msg => !msg.is_from_support && !msg.read_at) || [];

    for (const msg of unreadMessages) {
      await safeMutation(
        supabase.from('support_messages').update({ read_at: new Date().toISOString() }).eq('id', msg.id),
        'ADMIN_SUPPORT_MARK_READ'
      );
    }
  };

  const assignTicket = async (ticketId: string) => {
    if (!user) return;

    const result = await safeMutation(
      supabase.from('support_tickets').update({ assigned_to: user.id, status: 'in_progress' }).eq('id', ticketId),
      'ADMIN_SUPPORT_ASSIGN_TICKET'
    );

    if (!result.success) {
      logWarn('[ADMIN-SUPPORT] Error assigning ticket', result.error);
      return;
    }
    
    await loadTickets();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !user) return;

    try {
      const result = await sendTicketMessage(
        selectedTicket.id,
        user.id,
        newMessage,
        true,
        isInternalNote
      );

      if (!result.success) throw new Error(result.error);

      // Mettre à jour le statut et l'assignation automatiquement après une réponse support (pas une note interne)
      if (!isInternalNote) {
        const currentStatus = selectedTicket.status;
        // Si nouveau → en cours, sinon → attente utilisateur
        const newStatus = currentStatus === TICKET_STATUSES.NEW 
          ? TICKET_STATUSES.IN_PROGRESS 
          : TICKET_STATUSES.WAITING_USER;
        
        // Auto-assigner au premier agent qui répond si pas encore assigné
        const updateData: any = { status: newStatus };
        if (!selectedTicket.assigned_to) {
          updateData.assigned_to = user.id;
          updateData.viewed_by_support_at = new Date().toISOString();
        }
        
        await safeMutation(
          supabase.from('support_tickets').update(updateData).eq('id', selectedTicket.id),
          'ADMIN_SUPPORT_AUTO_STATUS_UPDATE'
        );
        
        setSelectedTicket(prev => prev ? { 
          ...prev, 
          status: newStatus,
          assigned_to: updateData.assigned_to || prev.assigned_to 
        } : null);
      }

      setNewMessage('');
      setIsInternalNote(false);
      await loadMessages(selectedTicket.id);
      await loadTickets();
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error sending message', error);
      errorToast('Erreur lors de l\'envoi du message');
    }
  };

  const updateStatus = async (ticketId: string, newStatus: TicketStatus) => {
    const updateData: any = { status: newStatus };
    
    if (newStatus === TICKET_STATUSES.RESOLVED || newStatus === TICKET_STATUSES.CLOSED) {
      updateData.resolved_at = new Date().toISOString();
    }

    const result = await safeMutation(
      supabase.from('support_tickets').update(updateData).eq('id', ticketId),
      'ADMIN_SUPPORT_UPDATE_STATUS'
    );

    if (!result.success) {
      errorToast('Erreur lors de la mise à jour du statut');
      return;
    }

    successToast(`Statut mis à jour: ${newStatus}`);
    await loadTickets();
    
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const updatePriority = async (ticketId: string, newPriority: number) => {
    const result = await safeMutation(
      supabase.from('support_tickets').update({ heat_priority: newPriority }).eq('id', ticketId),
      'ADMIN_SUPPORT_UPDATE_PRIORITY'
    );

    if (!result.success) {
      errorToast('Erreur lors de la mise à jour de la priorité');
      return;
    }

    successToast(`Priorité mise à jour: ${newPriority}`);
    await loadTickets();
    
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, heat_priority: newPriority } : null);
    }
  };

  const clearFilters = () => {
    setFilter('all');
    setHeatPriorityMin(0);
    setHeatPriorityMax(12);
    setServiceFilter('all');
    setAssignmentFilter('all');
  };

  const resolveTicket = async () => {
    if (!selectedTicket) return;

    const result = await safeMutation(
      supabase.from('support_tickets').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', selectedTicket.id),
      'ADMIN_SUPPORT_RESOLVE_TICKET'
    );

    if (!result.success) {
      errorToast('Erreur lors de la résolution du ticket');
      return;
    }

    successToast('Ticket résolu');
    setSelectedTicket(null);
    await loadTickets();
  };

  const reopenTicket = async () => {
    if (!selectedTicket) return;

    const result = await safeMutation(
      supabase.from('support_tickets').update({ status: 'in_progress', resolved_at: null }).eq('id', selectedTicket.id),
      'ADMIN_SUPPORT_REOPEN_TICKET'
    );

    if (!result.success) {
      errorToast('Erreur lors de la réouverture du ticket');
      return;
    }

    successToast('Ticket réouvert');
    await loadTickets();
  };

  const escalateTicketToNextLevel = async () => {
    if (!selectedTicket) return;

    try {
      const currentLevel = selectedTicket.support_level || 1;
      const newLevel = Math.min(currentLevel + 1, 3);

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

      const result = await safeMutation(
        supabase.from('support_tickets').update({
          support_level: newLevel,
          assigned_to: null,
          escalation_history: [...existingHistory, newHistoryEntry],
          status: TICKET_STATUSES.IN_PROGRESS,
        }).eq('id', selectedTicket.id),
        'ADMIN_SUPPORT_ESCALATE_TICKET'
      );

      if (!result.success) {
        errorToast("Erreur lors de l'escalade du ticket");
        return;
      }

      // Ajouter un message système
      await safeMutation(
        supabase.from('support_messages').insert({
          ticket_id: selectedTicket.id,
          sender_id: user!.id,
          message: `🔺 Ticket escaladé de N${currentLevel} vers N${newLevel}`,
          is_from_support: true,
          is_internal_note: true,
        }),
        'ADMIN_SUPPORT_ESCALATE_MESSAGE'
      );

      successToast(`Ticket escaladé vers le niveau ${newLevel}`);
      await loadTickets();
      
      if (selectedTicket) {
        setSelectedTicket(prev => prev ? { 
          ...prev, 
          support_level: newLevel,
          escalation_history: [...existingHistory, newHistoryEntry],
        } : null);
      }
    } catch (error) {
      logError('[ADMIN-SUPPORT] Error escalating ticket', error);
      errorToast("Erreur lors de l'escalade du ticket");
    }
  };

  // Setup realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, () => loadTickets())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets' }, () => loadTickets())
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${selectedTicket.id}` }, () => loadMessages(selectedTicket.id))
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
        const userIsTyping = typingUsers.some((u: any) => u.user_id !== user?.id && u.status === 'typing');
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
    if (filter !== 'all' && ticket.status !== filter) return false;
    const heat = ticket.heat_priority ?? 6;
    if (heat < heatPriorityMin || heat > heatPriorityMax) return false;
    if (serviceFilter !== 'all' && ticket.service !== serviceFilter) return false;
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
    heatPriorityMin,
    heatPriorityMax,
    serviceFilter,
    assignmentFilter,
    isUserTyping,
    isInternalNote,
    messagesEndRef,
    setNewMessage,
    setFilter,
    setHeatPriorityMin,
    setHeatPriorityMax,
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
