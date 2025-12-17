import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApporteurContact {
  id: string;
  apporteur_id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  fonction: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  apporteur_id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  fonction?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  notes?: string;
  is_primary?: boolean;
}

export interface UpdateContactInput {
  first_name?: string;
  last_name?: string;
  fonction?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
  is_primary?: boolean;
}

export function useApporteurContacts(apporteurId: string | null) {
  return useQuery({
    queryKey: ['apporteur-contacts', apporteurId],
    queryFn: async () => {
      if (!apporteurId) return [];
      
      const { data, error } = await supabase
        .from('apporteur_contacts')
        .select('*')
        .eq('apporteur_id', apporteurId)
        .order('is_primary', { ascending: false })
        .order('last_name', { ascending: true });
      
      if (error) throw error;
      return data as ApporteurContact[];
    },
    enabled: !!apporteurId,
  });
}

export function useCreateApporteurContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      // If setting as primary, unset other primaries first
      if (input.is_primary) {
        await supabase
          .from('apporteur_contacts')
          .update({ is_primary: false })
          .eq('apporteur_id', input.apporteur_id);
      }
      
      const { data, error } = await supabase
        .from('apporteur_contacts')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data as ApporteurContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-contacts', data.apporteur_id] });
      toast.success('Contact créé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useUpdateApporteurContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, apporteurId, data }: { id: string; apporteurId: string; data: UpdateContactInput }) => {
      // If setting as primary, unset other primaries first
      if (data.is_primary) {
        await supabase
          .from('apporteur_contacts')
          .update({ is_primary: false })
          .eq('apporteur_id', apporteurId)
          .neq('id', id);
      }
      
      const { data: updated, error } = await supabase
        .from('apporteur_contacts')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...updated, apporteur_id: apporteurId } as ApporteurContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-contacts', data.apporteur_id] });
      toast.success('Contact mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteApporteurContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, apporteurId }: { id: string; apporteurId: string }) => {
      const { error } = await supabase
        .from('apporteur_contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return { apporteurId };
    },
    onSuccess: ({ apporteurId }) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-contacts', apporteurId] });
      toast.success('Contact supprimé');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useSetPrimaryContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, apporteurId }: { id: string; apporteurId: string }) => {
      // Unset all primaries for this apporteur
      await supabase
        .from('apporteur_contacts')
        .update({ is_primary: false })
        .eq('apporteur_id', apporteurId);
      
      // Set this one as primary
      const { data, error } = await supabase
        .from('apporteur_contacts')
        .update({ is_primary: true })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, apporteur_id: apporteurId } as ApporteurContact;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apporteur-contacts', data.apporteur_id] });
      toast.success('Contact principal défini');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
