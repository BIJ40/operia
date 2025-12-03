import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useGroupMembers(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const addMembersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      if (!conversationId) throw new Error('No conversation');

      const inserts = userIds.map(userId => ({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member' as const,
      }));

      const { error } = await supabase
        .from('conversation_members')
        .insert(inserts);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Membres ajoutés');
      queryClient.invalidateQueries({ queryKey: ['conversation-members', conversationId] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout des membres');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!conversationId) throw new Error('No conversation');

      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Membre retiré');
      queryClient.invalidateQueries({ queryKey: ['conversation-members', conversationId] });
    },
    onError: () => {
      toast.error('Erreur lors du retrait du membre');
    },
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user?.id) throw new Error('Invalid state');

      const { error } = await supabase
        .from('conversation_members')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Vous avez quitté le groupe');
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Erreur lors de la sortie du groupe');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'member' }) => {
      if (!conversationId) throw new Error('No conversation');

      const { error } = await supabase
        .from('conversation_members')
        .update({ role })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Rôle mis à jour');
      queryClient.invalidateQueries({ queryKey: ['conversation-members', conversationId] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du rôle');
    },
  });

  const renameGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!conversationId) throw new Error('No conversation');

      const { error } = await supabase
        .from('conversations')
        .update({ name })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Groupe renommé');
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast.error('Erreur lors du renommage');
    },
  });

  return {
    addMembers: addMembersMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    leaveGroup: leaveGroupMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    renameGroup: renameGroupMutation.mutate,
    isAddingMembers: addMembersMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    isLeaving: leaveGroupMutation.isPending,
  };
}
