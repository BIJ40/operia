import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logError } from '@/lib/logger';

/**
 * Hook simplifié V3 pour les notifications support
 * Suppression du live chat - uniquement tickets
 */
export function useSupportNotifications() {
  const { isSupport, isAdmin, user } = useAuth();
  const [hasNewTickets, setHasNewTickets] = useState(false);
  const [newTicketsCount, setNewTicketsCount] = useState(0);
  const [assignedToMeCount, setAssignedToMeCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

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
    if ((!isSupport && !isAdmin) || !user) return;

    const loadTickets = async () => {
      // Tickets nouveaux ou en attente
      const { count: waitingCount, error: waitingError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'waiting', 'waiting_user'])
        .or('viewed_by_support_at.is.null,assigned_to.is.null');

      // Tickets assignés à moi
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

      if (!assignedError) {
        setAssignedToMeCount(assignedCount ?? 0);
      }
    };

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

    // Écouter les changements de tickets en temps réel
    const ticketsChannel = supabase
      .channel('support-tickets-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        async (payload) => {
          loadTickets();
          playNotificationSound();
          const newTicket = payload.new as any;
          toast.success('Nouveau ticket créé', {
            description: newTicket.subject || 'Un utilisateur vient de créer un nouveau ticket',
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets' },
        () => loadTickets()
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'support_tickets' },
        () => loadTickets()
      )
      .subscribe();

    // Écouter les nouveaux messages
    const messagesChannel = supabase
      .channel('support-messages-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages', filter: 'is_from_support=eq.false' },
        async (payload) => {
          loadUnreadMessages();
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, created_at')
            .eq('id', (payload.new as any).ticket_id)
            .single();

          if (!ticket) return;
          const ticketCreatedAt = new Date(ticket.created_at).getTime();
          if (Date.now() - ticketCreatedAt >= 5000) {
            playNotificationSound();
            toast.info('Nouvelle réponse utilisateur', {
              description: `Nouvelle réponse sur: ${ticket.subject}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [isSupport, isAdmin, user]);

  return { 
    hasNewTickets, 
    newTicketsCount, 
    assignedToMeCount, 
    unreadMessagesCount,
  };
}
