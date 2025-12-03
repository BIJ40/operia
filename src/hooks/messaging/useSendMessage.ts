import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRef, useCallback } from 'react';

export function useSendMessage(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId || !user?.id) throw new Error('Invalid state');
      if (!content.trim()) throw new Error('Message vide');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Clear typing status
      await supabase
        .from('typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: false,
          updated_at: new Date().toISOString(),
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user?.id) return;

    try {
      await supabase
        .from('typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        });
    } catch (error) {
      // Ignore typing errors
    }
  }, [conversationId, user?.id]);

  const handleTyping = useCallback(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to true
    setTyping(true);

    // Set timeout to clear typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  }, [setTyping]);

  return {
    sendMessage: sendMutation.mutate,
    sendMessageAsync: sendMutation.mutateAsync,
    isLoading: sendMutation.isPending,
    error: sendMutation.error,
    handleTyping,
  };
}
