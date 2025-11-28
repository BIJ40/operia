import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  cloneGroup,
  fetchGroupPermissions,
  upsertGroupPermission,
  deleteGroupPermission,
  fetchScopes,
  fetchUsersWithPermissions,
  fetchUserPermissions,
  upsertUserPermission,
  deleteUserPermission,
  updateUserGroup,
  updateUserSystemRole,
  Group,
  GroupPermission,
  Scope,
  UserWithPermissions,
  SystemRole,
} from '@/services/permissionsService';

// ========== GROUPS HOOKS ==========

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: fetchGroups,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (group: Partial<Group>) => createGroup(group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Groupe créé', description: 'Le groupe a été créé avec succès.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Group> }) => updateGroup(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Groupe mis à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Groupe supprimé' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCloneGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ id, newLabel }: { id: string; newLabel: string }) => cloneGroup(id, newLabel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast({ title: 'Groupe cloné', description: 'Le groupe et ses permissions ont été clonés.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// ========== GROUP PERMISSIONS HOOKS ==========

export function useGroupPermissions(groupId: string | null) {
  return useQuery({
    queryKey: ['group-permissions', groupId],
    queryFn: () => groupId ? fetchGroupPermissions(groupId) : Promise.resolve([]),
    enabled: !!groupId,
  });
}

export function useAllGroupPermissions(groups: Group[] | undefined) {
  return useQuery({
    queryKey: ['all-group-permissions', groups?.map(g => g.id)],
    queryFn: async () => {
      if (!groups) return new Map<string, GroupPermission[]>();
      
      const allPermissions = new Map<string, GroupPermission[]>();
      for (const group of groups) {
        const perms = await fetchGroupPermissions(group.id);
        allPermissions.set(group.id, perms);
      }
      return allPermissions;
    },
    enabled: !!groups && groups.length > 0,
  });
}

export function useUpsertGroupPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, scopeId, level }: { groupId: string; scopeId: string; level: number }) =>
      upsertGroupPermission(groupId, scopeId, level),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-permissions', groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-group-permissions'] });
    },
  });
}

export function useDeleteGroupPermission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ groupId, scopeId }: { groupId: string; scopeId: string }) =>
      deleteGroupPermission(groupId, scopeId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-permissions', groupId] });
      queryClient.invalidateQueries({ queryKey: ['all-group-permissions'] });
    },
  });
}

// ========== SCOPES HOOKS ==========

export function useScopes() {
  return useQuery({
    queryKey: ['scopes'],
    queryFn: fetchScopes,
  });
}

// ========== USER PERMISSIONS HOOKS ==========

export function useUsersWithPermissions() {
  return useQuery({
    queryKey: ['users-with-permissions'],
    queryFn: fetchUsersWithPermissions,
  });
}

export function useUserPermissions(userId: string | null) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: () => userId ? fetchUserPermissions(userId) : Promise.resolve([]),
    enabled: !!userId,
  });
}

export function useUpsertUserPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ userId, scopeId, level, deny }: { userId: string; scopeId: string; level: number | null; deny?: boolean }) =>
      upsertUserPermission(userId, scopeId, level, deny),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({ title: 'Override mis à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useDeleteUserPermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ userId, scopeId }: { userId: string; scopeId: string }) =>
      deleteUserPermission(userId, scopeId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({ title: 'Override supprimé' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUserGroup() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string | null }) =>
      updateUserGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({ title: 'Groupe utilisateur mis à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateUserSystemRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: ({ userId, systemRole }: { userId: string; systemRole: SystemRole }) =>
      updateUserSystemRole(userId, systemRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-permissions'] });
      toast({ title: 'Rôle système mis à jour' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}
