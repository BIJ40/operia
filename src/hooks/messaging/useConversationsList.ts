import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, Message, UserInfo } from '@/types/messaging';
import { useEffect, useState } from 'react';

export function useConversationsList(searchQuery?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(searchQuery || '');

  const query = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user?.id) return [];

      // Get all conversations where user is a member
      const { data: memberships, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberships?.length) return [];

      const conversationIds = memberships.map(m => m.conversation_id);

      // Get conversations with last message
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .eq('is_archived', false)
        .order('is_pinned', { ascending: false })
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (convError) throw convError;
      if (!conversations?.length) return [];

      // Enrich each conversation with members and last message
      const enrichedConversations = await Promise.all(
        conversations.map(async (conv) => {
          // Get members with user info
          const { data: members } = await supabase
            .from('conversation_members')
            .select(`
              *,
              user:profiles(id, first_name, last_name, email)
            `)
            .eq('conversation_id', conv.id);

          // Get last message
          const { data: messages } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(id, first_name, last_name, email)
            `)
            .eq('conversation_id', conv.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(1);

          // Get unread count
          const membership = members?.find(m => m.user_id === user.id);
          const lastReadAt = membership?.last_read_at;
          
          let unreadCount = 0;
          if (lastReadAt) {
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .gt('created_at', lastReadAt);
            unreadCount = count || 0;
          }

          // For DM, get the other user
          let otherUser: UserInfo | undefined;
          if (conv.type === 'dm' && members) {
            const other = members.find(m => m.user_id !== user.id);
            otherUser = other?.user as UserInfo;
          }

          return {
            ...conv,
            members: members || [],
            last_message: messages?.[0] || null,
            unread_count: unreadCount,
            other_user: otherUser,
          } as Conversation;
        })
      );

      return enrichedConversations;
    },
    enabled: !!user?.id,
  });

  // Filter by search
  const filteredData = query.data?.filter(conv => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    
    if (conv.type === 'dm' && conv.other_user) {
      const fullName = `${conv.other_user.first_name || ''} ${conv.other_user.last_name || ''}`.toLowerCase();
      return fullName.includes(searchLower);
    }
    
    return conv.name?.toLowerCase().includes(searchLower);
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return {
    ...query,
    data: filteredData,
    search,
    setSearch,
  };
}

export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, name, member_ids }: { type: 'dm' | 'group'; name?: string; member_ids: string[] }) => {
      if (!user?.id) throw new Error('Non authentifié');

      // For DM, check if conversation already exists
      if (type === 'dm' && member_ids.length === 1) {
        const otherId = member_ids[0];
        
        // Find existing DM between these two users
        const { data: existingConvs } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (existingConvs?.length) {
          for (const conv of existingConvs) {
            const { data: convData } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', conv.conversation_id)
              .eq('type', 'dm')
              .single();

            if (convData) {
              const { data: members } = await supabase
                .from('conversation_members')
                .select('user_id')
                .eq('conversation_id', conv.conversation_id);

              if (members?.length === 2 && members.some(m => m.user_id === otherId)) {
                return convData;
              }
            }
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type,
          name: type === 'group' ? name : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add members (including creator as owner)
      const memberInserts = [
        { conversation_id: conversation.id, user_id: user.id, role: 'owner' },
        ...member_ids.map(id => ({
          conversation_id: conversation.id,
          user_id: id,
          role: 'member' as const,
        })),
      ];

      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert(memberInserts);

      if (memberError) throw memberError;

      return conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
