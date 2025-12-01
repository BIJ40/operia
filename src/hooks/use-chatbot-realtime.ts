import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { safeQuery } from '@/lib/safeQuery';
import { logError } from '@/lib/logger';

interface UseChatbotRealtimeProps {
  userId?: string;
  activeTicket: any;
  isOpen: boolean;
  setActiveTicket: (ticket: any) => void;
  setSupportMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  setShowChoiceMode: (value: boolean) => void;
  setIsOpen: (value: boolean) => void;
  playNotificationSound: () => void;
}

export function useChatbotRealtime({
  userId,
  activeTicket,
  isOpen,
  setActiveTicket,
  setSupportMessages,
  setUnreadCount,
  setShowChoiceMode,
  setIsOpen,
  playNotificationSound,
}: UseChatbotRealtimeProps) {
  // Check for active ticket on mount
  useEffect(() => {
    if (!userId) return;

    const checkActiveTicket = async () => {
      const ticketResult = await safeQuery<any[]>(
        supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', userId)
          .in('status', ['new', 'in_progress', 'waiting_user'])
          .order('created_at', { ascending: false })
          .limit(1),
        'CHATBOT_ACTIVE_TICKET_CHECK'
      );

      if (!ticketResult.success) {
        logError('chatbot-realtime', 'Error checking active ticket', ticketResult.error);
        return;
      }

      const data = ticketResult.data;

      if (data && data.length > 0) {
        setActiveTicket(data[0]);
        setShowChoiceMode(false);
        setIsOpen(true);

        const messagesResult = await safeQuery<any[]>(
          supabase
            .from('support_messages')
            .select('*')
            .eq('ticket_id', data[0].id)
            .order('created_at', { ascending: true }),
          'CHATBOT_TICKET_MESSAGES_LOAD'
        );

        if (!messagesResult.success) {
          logError('chatbot-realtime', 'Error loading ticket messages', messagesResult.error);
          return;
        }

        if (messagesResult.data) setSupportMessages(messagesResult.data);
      }
    };

    checkActiveTicket();
  }, [userId]);

  // Realtime: support messages
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('support-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          setSupportMessages((prev) => [...prev, payload.new]);
          // Only notify if message is from support AND not from current user
          if (payload.new.is_from_support && payload.new.sender_id !== userId) {
            playNotificationSound();
            if (!isOpen) setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket, isOpen]);

  // Realtime: typing indicator
  useEffect(() => {
    if (!activeTicket || !userId) return;

    const typingChannel = supabase.channel(`typing:${activeTicket.id}`);

    typingChannel
      .on('presence', { event: 'sync' }, () => {
        // Typing state is tracked but not exposed yet
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await typingChannel.track({
            user_id: userId,
            is_support: false,
            typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(typingChannel);
    };
  }, [activeTicket, userId]);

  // Realtime: ticket updates
  useEffect(() => {
    if (!activeTicket) return;

    const channel = supabase
      .channel('ticket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${activeTicket.id}`,
        },
        (payload) => {
          if (payload.new.status === 'resolved') {
            setActiveTicket(null);
            setSupportMessages([]);
            setUnreadCount(0);
            setShowChoiceMode(true);
            setIsOpen(false);
          } else {
            setActiveTicket(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTicket]);
}
