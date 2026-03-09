/**
 * useApporteurs - Hook pour la gestion des apporteurs (organisations)
 * Phase 3 : CRUD apporteurs pour admin interne
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { toast } from 'sonner';

export interface Apporteur {
  id: string;
  agency_id: string;
  name: string;
  type: string;
  apogee_client_id: number | null;
  is_active: boolean;
  portal_enabled: boolean;
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

export interface ApporteurManager {
  id: string;
  apporteur_id: string;
  agency_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
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
  const { agencyId } = useProfile();

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

      // Get user counts from both apporteur_users and apporteur_managers
      const [usersRes, managersRes] = await Promise.all([
        supabase
          .from('apporteur_users')
          .select('apporteur_id')
          .eq('agency_id', agencyId),
        supabase
          .from('apporteur_managers')
          .select('apporteur_id')
          .eq('agency_id', agencyId),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (managersRes.error) throw managersRes.error;

      // Aggregate counts from both tables
      const countsMap: Record<string, number> = {};
      usersRes.data?.forEach(u => {
        countsMap[u.apporteur_id] = (countsMap[u.apporteur_id] || 0) + 1;
      });
      managersRes.data?.forEach(m => {
        countsMap[m.apporteur_id] = (countsMap[m.apporteur_id] || 0) + 1;
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
 * Liste des utilisateurs d'un apporteur (ancien système auth.users)
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
 * Liste des gestionnaires d'un apporteur (système OTP autonome)
 */
export function useApporteurManagers(apporteurId: string | null) {
  return useQuery({
    queryKey: ['apporteur-managers', apporteurId],
    queryFn: async () => {
      if (!apporteurId) return [];

      const { data, error } = await supabase
        .from('apporteur_managers')
        .select('id, apporteur_id, agency_id, email, first_name, last_name, role, is_active, last_login_at, created_at')
        .eq('apporteur_id', apporteurId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApporteurManager[];
    },
    enabled: !!apporteurId,
  });
}

/**
 * Créer un gestionnaire apporteur (système OTP, sans mot de passe)
 */
export function useCreateApporteurManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      apporteur_id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: 'reader' | 'manager';
    }) => {
      const { data, error } = await supabase.functions.invoke('create-apporteur-manager', {
        body: input,
      });

      if (error) {
        // The SDK wraps non-2xx as FunctionsHttpError - extract the body
        let msg = 'Erreur inconnue';
        try {
          // Try to get the response body from the error context
          const contextBody = (error as Record<string, unknown>)?.context as Record<string, unknown> | undefined;
          const body = contextBody?.body as ReadableStream | undefined;
          if (body) {
            const reader = body.getReader?.();
            if (reader) {
              const { value } = await reader.read();
              const text = new TextDecoder().decode(value);
              const parsed = JSON.parse(text);
              msg = parsed.error || msg;
            }
          }
        } catch { /* fallback */ }
        // Fallback: try parsing from error.message
        if (msg === 'Erreur inconnue') {
          const raw = error.message || '';
          // Match JSON anywhere in the message
          const jsonMatch = raw.match(/\{.*"error"\s*:\s*"[^"]+"\s*.*\}/);
          if (jsonMatch) {
            try { msg = JSON.parse(jsonMatch[0]).error || raw; } catch { msg = raw; }
          } else {
            msg = raw || 'Erreur inconnue';
          }
        }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-managers'] });
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      if (data?.reactivated) {
        toast.success('Gestionnaire réactivé avec succès.');
      } else {
        toast.success('Gestionnaire créé avec succès. Il pourra se connecter via code email.');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });
}

/**
 * Toggle statut actif/inactif d'un gestionnaire apporteur
 */
export function useToggleApporteurManagerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('apporteur_managers')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-managers'] });
      toast.success(variables.is_active ? 'Gestionnaire réactivé' : 'Gestionnaire désactivé');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Créer un apporteur
 */
export function useCreateApporteur() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();

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
 * Créer un utilisateur apporteur avec mot de passe via Edge Function
 */
export function useCreateApporteurUser() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();

  return useMutation({
    mutationFn: async (input: {
      apporteur_id: string;
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      role: 'reader' | 'manager';
      send_email: boolean;
    }) => {
      if (!agencyId) throw new Error('Agency ID requis');

      const { data, error } = await supabase.functions.invoke('create-apporteur-user', {
        body: {
          agency_id: agencyId,
          apporteur_id: input.apporteur_id,
          email: input.email,
          password: input.password,
          first_name: input.first_name,
          last_name: input.last_name,
          role: input.role,
          send_email: input.send_email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-users'] });
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Utilisateur créé avec succès');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
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

/**
 * Supprimer complètement un apporteur (admin uniquement)
 */
export function useDeleteApporteur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Supprimer d'abord les utilisateurs liés
      const { error: usersError } = await supabase
        .from('apporteur_users')
        .delete()
        .eq('apporteur_id', id);

      if (usersError) throw usersError;

      // Supprimer les contacts liés
      const { error: contactsError } = await supabase
        .from('apporteur_contacts')
        .delete()
        .eq('apporteur_id', id);

      if (contactsError) throw contactsError;

      // Supprimer les liens projets
      const { error: linksError } = await supabase
        .from('apporteur_project_links')
        .delete()
        .eq('apporteur_id', id);

      if (linksError) throw linksError;

      // Supprimer l'apporteur
      const { error } = await supabase
        .from('apporteurs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Apporteur supprimé définitivement');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });
}

/**
 * Supprimer un gestionnaire apporteur (système OTP)
 */
export function useDeleteApporteurManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete associated sessions first
      const { data: manager } = await supabase
        .from('apporteur_managers')
        .select('id')
        .eq('id', id)
        .single();

      if (!manager) throw new Error('Gestionnaire non trouvé');

      // Delete OTP codes
      await supabase
        .from('apporteur_otp_codes')
        .delete()
        .eq('manager_id', id);

      // Delete sessions
      await supabase
        .from('apporteur_sessions')
        .delete()
        .eq('manager_id', id);

      // Delete invitation links
      await supabase
        .from('apporteur_invitation_links')
        .delete()
        .eq('manager_id', id);

      // Delete the manager
      const { error } = await supabase
        .from('apporteur_managers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-managers'] });
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      toast.success('Utilisateur supprimé définitivement');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la suppression');
    },
  });
}

/**
 * Modifier un gestionnaire apporteur (nom, email, rôle)
 */
export function useUpdateApporteurManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; email?: string; first_name?: string; last_name?: string; role?: string }) => {
      const { error } = await supabase
        .from('apporteur_managers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-managers'] });
      toast.success('Utilisateur modifié');
    },
    onError: () => {
      toast.error('Erreur lors de la modification');
    },
  });
}

/**
 * Mettre à jour l'apogee_client_id d'un apporteur (liaison Apogée)
 */
export function useUpdateApporteurApogeeId() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, apogee_client_id }: { id: string; apogee_client_id: number | null }) => {
      const { error } = await supabase
        .from('apporteurs')
        .update({ apogee_client_id })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      queryClient.invalidateQueries({ queryKey: ['apporteur', variables.id] });
      toast.success(
        variables.apogee_client_id 
          ? 'Apporteur lié à Apogée' 
          : 'Liaison Apogée supprimée'
      );
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}

/**
 * Toggle portal_enabled d'un apporteur
 */
export function useTogglePortalEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, portal_enabled }: { id: string; portal_enabled: boolean }) => {
      const { error } = await supabase
        .from('apporteurs')
        .update({ portal_enabled })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apporteurs'] });
      queryClient.invalidateQueries({ queryKey: ['apporteur', variables.id] });
      toast.success(variables.portal_enabled ? 'Portail activé' : 'Portail désactivé');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });
}
