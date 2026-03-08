/**
 * useApogeeCommanditaires - Hook pour récupérer tous les commanditaires Apogée
 * Pour le wizard de création d'espace apporteur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';

export interface ApogeeContact {
  nom: string;
  prenom: string;
  email: string | null;
  tel: string | null;
  fonction: string | null;
}

export interface ApogeeCommanditaire {
  id: number;
  name: string;
  type: string;
  email: string | null;
  tel: string | null;
  adresse: string | null;
  ville: string | null;
  contacts: ApogeeContact[];
  alreadyLinked: boolean;
}

interface ListResponse {
  success: boolean;
  data?: ApogeeCommanditaire[];
  error?: string;
}

/**
 * Liste tous les commanditaires Apogée de l'agence
 */
export function useApogeeCommanditaires() {
  const { agence, agencyId } = useProfile();

  return useQuery<ApogeeCommanditaire[]>({
    queryKey: ['apogee-commanditaires', agence],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke<ListResponse>(
        'list-apogee-commanditaires',
        {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erreur inconnue');

      return data.data || [];
    },
    enabled: !!agence,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * Types d'apporteurs pour le filtrage
 */
export const APPORTEUR_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'agence_immo', label: 'Agences immobilières' },
  { value: 'syndic', label: 'Syndics' },
  { value: 'assurance', label: 'Assurances' },
  { value: 'bailleur', label: 'Bailleurs' },
  { value: 'courtier', label: 'Courtiers' },
  { value: 'gestionnaire', label: 'Gestionnaires' },
  { value: 'notaire', label: 'Notaires' },
  { value: 'expert', label: 'Experts' },
  { value: 'autre', label: 'Autres' },
] as const;

export type ApporteurType = typeof APPORTEUR_TYPES[number]['value'];

/**
 * Obtenir le label d'un type
 */
export function getApporteurTypeLabel(type: string): string {
  const found = APPORTEUR_TYPES.find(t => t.value === type);
  return found?.label || type;
}
