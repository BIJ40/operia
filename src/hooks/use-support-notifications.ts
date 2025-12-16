import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError, logDebug } from '@/lib/logger';

export function useSupportNotifications() {
  const { isSupport, isAdmin, user } = useAuth();
  const [hasNewTickets, setHasNewTickets] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [assignedToMeCount, setAssignedToMeCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // V2.5: Séparation chat humain (rouge) vs tickets (jaune)
  const [chatHumanCount, setChatHumanCount] = useState(0);
  const [ticketRequestCount, setTicketRequestCount] = useState(0);
  
  // V3: Sessions de chat live en attente d'agent
  const [liveChatCount, setLiveChatCount] = useState(0);

  // Fonction pour jouer un son de notification
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      const now = audioContext.currentTime;
      playTone(800, now, 0.15);
      playTone(1000, now + 0.15, 0.15);
      playTone(1200, now + 0.3, 0.2);
    } catch (error) {
      logError('SUPPORT', 'Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    // Le hook fonctionne pour les admins ET les support
    if ((!isSupport && !isAdmin) || !user) return;

    // Charger le nombre de tickets en attente et assignés
    const loadTickets = async () => {
      // Tickets nouveaux ou en attente (inclut 'waiting' pour données legacy en DB)
      const { count: waitingCount, error: waitingError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'waiting', 'waiting_user'])
        .or('viewed_by_support_at.is.null,assigned_to.is.null');

      // V2.5: Compter séparément les demandes de chat humain (type = 'chat_human')
      const chatHumanQuery = supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('type', 'chat_human')
        .in('status', ['new', 'waiting', 'waiting_user'])
        .or('viewed_by_support_at.is.null,assigned_to.is.null');
      
      const { count: chatHumanPending, error: chatHumanError } = await chatHumanQuery;

      // V2.5: Compter les tickets classiques (type != 'chat_human')
      const ticketQuery = supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .or('type.is.null,type.neq.chat_human')
        .in('status', ['new', 'waiting', 'waiting_user'])
        .or('viewed_by_support_at.is.null,assigned_to.is.null');
      
      const { count: ticketPending, error: ticketError } = await ticketQuery;

      // Tickets assignés à moi (en cours)
      const { count: assignedCount, error: assignedError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', user.id)
        .eq('status', 'in_progress');

      if (!waitingError) {
        const safeCount = waitingCount ?? 0;
        setNewTicketsCount(safeCount);
        setHasNewTickets(safeCount > 0);
      }

      if (!chatHumanError) {
        setChatHumanCount(chatHumanPending ?? 0);
      }

      if (!ticketError) {
        setTicketRequestCount(ticketPending ?? 0);
      }

      if (!assignedError) {
        setAssignedToMeCount(assignedCount ?? 0);
      }
    };

    // V3: Charger les sessions de chat live en attente d'agent
    const loadLiveSessions = async () => {
      const { count, error } = await supabase
        .from('live_support_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('agent_id', null);

      if (!error) {
        setLiveChatCount(count ?? 0);
      }
    };

    // Charger le nombre de messages non lus
    const loadUnreadMessages = async () => {
      const { count, error } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_from_support', false)
        .is('read_at', null);

      if (!error) {
        setUnreadMessagesCount(count ?? 0);
      }
    };

    loadTickets();
    loadUnreadMessages();
    loadLiveSessions();

    // Écouter les changements de tickets en temps réel
    const ticketsChannel = supabase
      .channel('support-tickets-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        async (payload) => {
          loadTickets();
          playNotificationSound();
          
          // Notifications popup (P1-01 réactivées)
          const newTicket = payload.new as any;
          const isLiveRequest = newTicket.type === 'chat_human';
          if (isLiveRequest) {
            toast.warning('Demande de support en direct', {
              description: newTicket.subject || 'Un utilisateur demande une assistance immédiate',
              duration: 8000,
            });
          } else {
            toast.success('Nouveau ticket créé', {
              description: newTicket.subject || 'Un utilisateur vient de créer un nouveau ticket',
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          // Recharger les tickets sur chaque UPDATE (changement de status notamment)
          loadTickets();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          loadTickets();
        }
      )
      .subscribe();

    // Écouter les nouveaux messages des utilisateurs
    const messagesChannel = supabase
      .channel('support-messages-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: 'is_from_support=eq.false',
        },
        async (payload) => {
          loadUnreadMessages();

          // Récupérer les infos du ticket pour vérifier si c'est un nouveau ticket
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, user_id, created_at')
            .eq('id', (payload.new as any).ticket_id)
            .single();

          if (!ticket) return;

          // Si le ticket a été créé il y a moins de 5 secondes, c'est le message initial
          // La notification "Nouveau ticket" sera déjà affichée, pas besoin de "Nouvelle réponse"
          const ticketCreatedAt = new Date(ticket.created_at).getTime();
          const now = Date.now();
          const isInitialMessage = (now - ticketCreatedAt) < 5000;

          if (isInitialMessage) {
            // Ne pas notifier, le ticket INSERT notification s'en charge
            return;
          }

          playNotificationSound();
          toast.info('Nouvelle réponse utilisateur', {
            description: `Nouvelle réponse sur: ${ticket.subject}`,
            duration: 5000,
          });
        }
      )
      .subscribe();

    // Écouter les nouveaux documents ajoutés
    const attachmentsChannel = supabase
      .channel('support-attachments-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_attachments',
        },
        async (payload) => {
          playNotificationSound();

          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, user_id')
            .eq('id', (payload.new as any).ticket_id)
            .single();

          toast.info('Nouveau document ajouté', {
            description: ticket 
              ? `Document ajouté à: ${ticket.subject}`
              : 'Un document a été ajouté à un ticket',
            duration: 5000,
          });
        }
      )
      .subscribe();

    // V3: Écouter les sessions de chat live (tous les événements pour mise à jour instantanée)
    const liveSessionsChannel = supabase
      .channel('live-support-sessions-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_support_sessions',
        },
        async (payload) => {
          logDebug('[Support Notifications] Live session change:', payload.eventType);
          loadLiveSessions();
          
          // Notification uniquement pour les nouvelles sessions (INSERT)
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
            const session = payload.new as { user_name?: string; agency_slug?: string };
            toast.error('🔴 Chat en direct demandé', {
              description: `${session.user_name || 'Un utilisateur'}${session.agency_slug ? ` (${session.agency_slug})` : ''} demande une assistance immédiate`,
              duration: 10000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
      supabase.removeChannel(liveSessionsChannel);
    };
  }, [isSupport, isAdmin, user]);

  return { 
    hasNewTickets, 
    newTicketsCount, 
    assignedToMeCount, 
    unreadMessagesCount,
    // V2.5: Indicateurs séparés pour le header clignotant
    chatHumanCount,
    ticketRequestCount,
    hasChatHumanRequests: chatHumanCount > 0,
    hasTicketRequests: ticketRequestCount > 0,
    // V3: Sessions de chat live
    liveChatCount,
    hasLiveChatRequests: liveChatCount > 0,
  };
}
