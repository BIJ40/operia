import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
      console.error('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    // Le hook fonctionne pour les admins ET les support
    if ((!isSupport && !isAdmin) || !user) return;

    // Charger le nombre de tickets en attente et assignés
    const loadTickets = async () => {
      // Tickets en attente
      const { count: waitingCount, error: waitingError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting');

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

      if (!assignedError) {
        setAssignedToMeCount(assignedCount ?? 0);
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
        () => {
          loadTickets();
          playNotificationSound();
          toast.success('Nouveau ticket créé', {
            description: 'Un utilisateur vient de créer un nouveau ticket',
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
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
          playNotificationSound();

          // Récupérer les infos du ticket
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, user_pseudo')
            .eq('id', (payload.new as any).ticket_id)
            .single();

          toast.info('Nouvelle réponse utilisateur', {
            description: ticket 
              ? `${ticket.user_pseudo} a répondu sur: ${ticket.subject}`
              : 'Un utilisateur a répondu à un ticket',
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

          // Récupérer les infos du ticket
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('subject, user_pseudo')
            .eq('id', (payload.new as any).ticket_id)
            .single();

          toast.info('Nouveau document ajouté', {
            description: ticket 
              ? `${ticket.user_pseudo} a ajouté un document à: ${ticket.subject}`
              : 'Un document a été ajouté à un ticket',
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
    };
  }, [isSupport, isAdmin, user]);

  return { hasNewTickets, newTicketsCount, assignedToMeCount, unreadMessagesCount };
}
