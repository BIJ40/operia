import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, Message, ConversationMember, TypingStatus } from '@/types/messaging';
import { useEffect, useState, useCallback } from 'react';

const MESSAGES_LIMIT = 100; // P1-03: Limite des messages

export function useConversation(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);

  // Fetch conversation details
  const conversationQuery = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<Conversation | null> => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single() as { data: Conversation | null; error: any };

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  // Fetch messages with pagination (P1-03: limit 100)
  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, first_name, last_name, email)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_LIMIT);

      if (error) throw error;
      // Reverse to show oldest first
      return (data || []).reverse();
    },
    enabled: !!conversationId,
  });

  // Fetch members
  const membersQuery = useQuery({
    queryKey: ['conversation-members', conversationId],
    queryFn: async (): Promise<ConversationMember[]> => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('conversation_members')
        .select(`
          *,
          user:profiles(id, first_name, last_name, email)
        `)
        .eq('conversation_id', conversationId) as { data: ConversationMember[] | null; error: any };

      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  // Mark as read when viewing
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user?.id) return;

    await supabase
      .from('conversation_members')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);
  }, [conversationId, user?.id]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          // Also invalidate conversations list for unread count
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_status',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          // Fetch typing users
          const { data } = await supabase
            .from('typing_status')
            .select(`
              *,
              user:profiles(id, first_name, last_name, email)
            `)
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .neq('user_id', user?.id) as { data: TypingStatus[] | null };

          setTypingUsers(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, queryClient]);

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (conversationId && messagesQuery.data?.length) {
      markAsRead();
    }
  }, [conversationId, messagesQuery.data?.length, markAsRead]);

  // Get current user's membership
  const currentMembership = membersQuery.data?.find(m => m.user_id === user?.id);

  // Get other user for DM
  const otherUser = conversationQuery.data?.type === 'dm'
    ? membersQuery.data?.find(m => m.user_id !== user?.id)?.user
    : null;

  return {
    conversation: conversationQuery.data,
    messages: messagesQuery.data || [],
    members: membersQuery.data || [],
    typingUsers,
    currentMembership,
    otherUser,
    isLoading: conversationQuery.isLoading || messagesQuery.isLoading,
    isError: conversationQuery.isError || messagesQuery.isError,
    markAsRead,
    refetch: () => {
      conversationQuery.refetch();
      messagesQuery.refetch();
      membersQuery.refetch();
    },
  };
}
