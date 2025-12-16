/**
 * useApporteurs - Hook pour la gestion des apporteurs (organisations)
 * Phase 3 : CRUD apporteurs pour admin interne
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Apporteur {
  id: string;
  agency_id: string;
  name: string;
  type: string;
  apogee_client_id: number | null;
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  users_count?: number;
}

export interface ApporteurUser {
  id: string;
  apporteur_id: string;
  agency_id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: 'reader' | 'manager';
  is_active: boolean;
  invited_at: string | null;
  activated_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApporteurInput {
  name: string;
  type: string;
  apogee_client_id?: number | null;
  is_active?: boolean;
}

/**
 * Liste des apporteurs de l'agence courante avec count utilisateurs
 */
export function useApporteurs() {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ['apporteurs', agencyId],
    queryFn: async () => {
      if (!agencyId) return [];

      // Get apporteurs
      const { data: apporteurs, error } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('agency_id', agencyId)
        .order('name');

      if (error) throw error;

      // Get user counts for each apporteur
      const { data: userCounts, error: countError } = await supabase
        .from('apporteur_users')
        .select('apporteur_id')
        .eq('agency_id', agencyId);

      if (countError) throw countError;

      // Aggregate counts
      const countsMap: Record<string, number> = {};
      userCounts?.forEach(u => {
        countsMap[u.apporteur_id] = (countsMap[u.apporteur_id] || 0) + 1;
      });

      return (apporteurs || []).map(a => ({
        ...a,
        users_count: countsMap[a.id] || 0,
      })) as Apporteur[];
    },
    enabled: !!agencyId,
  });
}

/**
 * Détail d'un apporteur
 */
export function useApporteur(id: string | null) {
  return useQuery({
    queryKey: ['apporteur', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('apporteurs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Apporteur;
    },
    enabled: !!id,
  });
}

/**
 * Liste des utilisateurs d'un apporteur
 */
export function useApporteurUsers(apporteurId: string | null) {
  return useQuery({
    queryKey: ['apporteur-users', apporteurId],
    queryFn: async () => {
      if (!apporteurId) return [];

      const { data, error } = await supabase
        .from('apporteur_users')
        .select('*')
        .eq('apporteur_id', apporteurId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApporteurUser[];
    },
    enabled: !!apporteurId,
  });
}

/**
 * Créer un apporteur
 */
export function useCreateApporteur() {
  const queryClient = useQueryClient();
  const { agencyId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateApporteurInput) => {
      if (!agencyId) throw new Error('Agency ID requis');

      const { data, error } = await supabase
        .from('apporteurs')
        .insert({
          agency_id: agencyId,
          name: input.name,
          type: input.type,
          apogee_client_id: input.apogee_client_id || null,
          is_active: input.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Apporteur créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création');
    },
  });
}

/**
 * Toggle statut actif/inactif d'un apporteur
 */
export function useToggleApporteurStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('apporteurs')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Statut mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Toggle statut actif/inactif d'un utilisateur apporteur
 */
export function useToggleApporteurUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('apporteur_users')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-users'] });
      toast.success(variables.is_active ? 'Utilisateur activé' : 'Utilisateur désactivé');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Changer le rôle d'un utilisateur apporteur
 */
export function useUpdateApporteurUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'reader' | 'manager' }) => {
      const { error } = await supabase
        .from('apporteur_users')
        .update({ role })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-users'] });
      toast.success('Rôle mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Inviter un utilisateur apporteur via Edge Function
 */
export function useInviteApporteurUser() {
  const queryClient = useQueryClient();
  const { agencyId } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      apporteur_id: string;
      email: string;
      first_name?: string;
      last_name?: string;
      role: 'reader' | 'manager';
    }) => {
      if (!agencyId) throw new Error('Agency ID requis');

      const { data, error } = await supabase.functions.invoke('invite-apporteur-user', {
        body: {
          agency_id: agencyId,
          apporteur_id: input.apporteur_id,
          email: input.email,
          first_name: input.first_name || null,
          last_name: input.last_name || null,
          role: input.role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-users'] });
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Invitation envoyée avec succès');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de l\'invitation');
    },
  });
}

/**
 * Supprimer complètement un utilisateur apporteur
 */
export function useDeleteApporteurUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apporteur_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-users'] });
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Utilisateur supprimé');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}
