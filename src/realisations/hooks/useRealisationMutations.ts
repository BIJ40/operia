/**
 * CRUD mutations for realisations
 * Uses 'any' cast for new tables not yet in generated types
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveAuth } from '@/hooks/useEffectiveAuth';
import type { Realisation, ValidationStatus, PublicationStatus } from '../types';
import { toast } from 'sonner';

const db = supabase as any;

async function logActivity(agencyId: string, realisationId: string, actionType: string, payload: Record<string, unknown> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await db.from('realisation_activity_log').insert({
    agency_id: agencyId,
    realisation_id: realisationId,
    actor_type: 'user',
    actor_user_id: user?.id,
    action_type: actionType,
    action_payload: payload,
  });
}

export function useCreateRealisation() {
  const qc = useQueryClient();
  const { agencyId } = useEffectiveAuth();

  return useMutation({
    mutationFn: async (input: Partial<Realisation>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !agencyId) throw new Error('Non authentifié');

      const { data, error } = await db
        .from('realisations')
        .insert({ ...input, agency_id: agencyId, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      await logActivity(agencyId, data.id, 'created');
      return data as Realisation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Réalisation créée');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });
}

export function useUpdateRealisation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Realisation> & { id: string }) => {
      const { data, error } = await db
        .from('realisations')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      await logActivity(data.agency_id, id, 'updated', { fields: Object.keys(input) });
      return data as Realisation;
    },
    onSuccess: (data: Realisation) => {
      qc.invalidateQueries({ queryKey: ['realisations'] });
      qc.invalidateQueries({ queryKey: ['realisation', data.id] });
      toast.success('Réalisation mise à jour');
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur'),
  });
}

export function useChangeValidationStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: ValidationStatus; reason?: string }) => {
      const updates: Record<string, unknown> = { validation_status: status };
      if (status === 'rejected' && reason) updates.rejection_reason = reason;

      const { data, error } = await db.from('realisations').update(updates).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(data.agency_id, id, `status_changed_to_${status}`, { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangePublicationStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PublicationStatus }) => {
      const { data, error } = await db.from('realisations').update({ publication_status: status }).eq('id', id).select().single();
      if (error) throw error;
      await logActivity(data.agency_id, id, `publication_${status}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Publication mise à jour');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRealisation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('realisations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['realisations'] });
      toast.success('Réalisation supprimée');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
