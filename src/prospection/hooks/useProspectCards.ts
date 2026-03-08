/**
 * useProspectCards - CRUD pour les fiches prospect CRM
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { useAuthCore } from '@/contexts/AuthCoreContext';
import { toast } from 'sonner';
import type { ProspectPoolItem } from './useProspectPool';

export type ProspectStatus = 'nouveau' | 'contacte' | 'rdv_planifie' | 'en_negociation' | 'gagne' | 'perdu' | 'abandonne';

export interface ProspectCard {
  id: string;
  agency_id: string;
  pool_prospect_id: string | null;
  siren: string | null;
  siret: string | null;
  denomination: string;
  enseigne: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  telephone: string | null;
  site_web: string | null;
  representant: string | null;
  chiffre_affaire: string | null;
  tranche_effectif: string | null;
  status: ProspectStatus;
  owner_user_id: string | null;
  next_rdv_at: string | null;
  last_contact_at: string | null;
  notes: string | null;
  score: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ProspectInteraction {
  id: string;
  card_id: string;
  agency_id: string;
  user_id: string | null;
  interaction_type: 'appel' | 'email' | 'rdv' | 'visite' | 'note' | 'relance';
  summary: string | null;
  interaction_at: string;
  next_action: string | null;
  next_action_at: string | null;
  created_at: string;
}

export const PROSPECT_STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string }> = {
  nouveau: { label: 'Nouveau', color: 'bg-blue-100 text-blue-800' },
  contacte: { label: 'Contacté', color: 'bg-yellow-100 text-yellow-800' },
  rdv_planifie: { label: 'RDV planifié', color: 'bg-purple-100 text-purple-800' },
  en_negociation: { label: 'En négociation', color: 'bg-orange-100 text-orange-800' },
  gagne: { label: 'Gagné', color: 'bg-green-100 text-green-800' },
  perdu: { label: 'Perdu', color: 'bg-red-100 text-red-800' },
  abandonne: { label: 'Abandonné', color: 'bg-gray-100 text-gray-800' },
};

interface UseProspectCardsOptions {
  status?: ProspectStatus;
  search?: string;
}

export function useProspectCards(options: UseProspectCardsOptions = {}) {
  const { agencyId } = useProfile();

  return useQuery({
    queryKey: ['prospect-cards', agencyId, options],
    queryFn: async (): Promise<ProspectCard[]> => {
      let query = supabase
        .from('prospect_cards')
        .select('*')
        .order('updated_at', { ascending: false });

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.search) {
        query = query.or(
          `denomination.ilike.%${options.search}%,representant.ilike.%${options.search}%,code_postal.ilike.%${options.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ProspectCard[];
    },
    enabled: !!agencyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useProspectCard(cardId: string | null) {
  return useQuery({
    queryKey: ['prospect-card', cardId],
    queryFn: async (): Promise<ProspectCard | null> => {
      if (!cardId) return null;
      const { data, error } = await supabase
        .from('prospect_cards')
        .select('*')
        .eq('id', cardId)
        .single();
      if (error) throw error;
      return data as unknown as ProspectCard;
    },
    enabled: !!cardId,
  });
}

export function useCreateProspectCards() {
  const queryClient = useQueryClient();
  const { agencyId } = useProfile();
  const { user } = useAuthCore();

  return useMutation({
    mutationFn: async (poolItems: ProspectPoolItem[]) => {
      const cards = poolItems.map(item => ({
        agency_id: agencyId!,
        pool_prospect_id: item.id,
        siren: item.siren,
        siret: item.siret,
        denomination: item.denomination || 'Sans nom',
        enseigne: item.enseigne,
        adresse: item.adresse,
        code_postal: item.code_postal,
        ville: item.ville,
        telephone: item.telephone,
        site_web: item.site_web,
        representant: item.representant,
        chiffre_affaire: item.chiffre_affaire,
        tranche_effectif: item.tranche_effectif,
        owner_user_id: user!.id,
        status: 'nouveau',
      }));

      const { data, error } = await supabase
        .from('prospect_cards')
        .insert(cards as any)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-cards'] });
      toast.success(`${data.length} fiche(s) prospect créée(s)`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
}

export function useUpdateProspectCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ProspectCard>) => {
      const { data, error } = await supabase
        .from('prospect_cards')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-cards'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-card', (data as any).id] });
    },
  });
}

export function useDeleteProspectCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      // Delete interactions first
      await supabase
        .from('prospect_interactions')
        .delete()
        .eq('card_id', cardId);

      const { error } = await supabase
        .from('prospect_cards')
        .delete()
        .eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect-cards'] });
      toast.success('Prospect supprimé');
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
}

// Interactions
export function useProspectInteractions(cardId: string | null) {
  return useQuery({
    queryKey: ['prospect-interactions', cardId],
    queryFn: async (): Promise<ProspectInteraction[]> => {
      if (!cardId) return [];
      const { data, error } = await supabase
        .from('prospect_interactions')
        .select('*')
        .eq('card_id', cardId)
        .order('interaction_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProspectInteraction[];
    },
    enabled: !!cardId,
  });
}

export function useCreateInteraction() {
  const queryClient = useQueryClient();
  const { agencyId, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      card_id: string;
      interaction_type: ProspectInteraction['interaction_type'];
      summary?: string;
      interaction_at?: string;
      next_action?: string;
      next_action_at?: string;
    }) => {
      const { data, error } = await supabase
        .from('prospect_interactions')
        .insert({
          card_id: input.card_id,
          agency_id: agencyId!,
          user_id: user!.id,
          interaction_type: input.interaction_type,
          summary: input.summary || null,
          interaction_at: input.interaction_at || new Date().toISOString(),
          next_action: input.next_action || null,
          next_action_at: input.next_action_at || null,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Update last_contact_at on the card
      await supabase
        .from('prospect_cards')
        .update({ last_contact_at: new Date().toISOString() } as any)
        .eq('id', input.card_id);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prospect-interactions', variables.card_id] });
      queryClient.invalidateQueries({ queryKey: ['prospect-cards'] });
      queryClient.invalidateQueries({ queryKey: ['prospect-card', variables.card_id] });
    },
  });
}
