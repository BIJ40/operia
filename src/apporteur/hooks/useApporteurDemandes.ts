/**
 * useApporteurDemandes - Hook pour récupérer les demandes d'intervention de l'apporteur
 * RLS filtre automatiquement par apporteur_id
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApporteurAuth } from '@/contexts/ApporteurAuthContext';

export interface ApporteurDemande {
  id: string;
  reference: string | null;
  request_type: string;
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  owner_name: string | null;
  address: string;
  postal_code: string | null;
  city: string | null;
  description: string;
  urgency: 'normal' | 'urgent';
  availability: string | null;
  comments: string | null;
  status: 'pending' | 'received' | 'assigned' | 'completed';
  apogee_project_id: number | null;
  created_at: string;
  updated_at: string;
}

export function useApporteurDemandes() {
  const { isApporteurAuthenticated, apporteurId } = useApporteurAuth();

  return useQuery({
    queryKey: ['apporteur-demandes'],
    queryFn: async (): Promise<ApporteurDemande[]> => {
      // RLS filtre automatiquement par apporteur_id via get_my_apporteur_id()
      const { data, error } = await supabase
        .from('apporteur_intervention_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching apporteur demandes:', error);
        throw error;
      }

      return (data || []) as ApporteurDemande[];
    },
    enabled: isApporteurAuthenticated && !!apporteurId,
    staleTime: 30_000,
  });
}

// Labels pour les types de demande
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  depannage: 'Dépannage urgent',
  travaux: 'Travaux',
  diagnostic: 'Diagnostic / Devis',
  autre: 'Autre',
};

// Labels pour les statuts
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  received: { label: 'Reçue', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  assigned: { label: 'Assignée', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  in_progress: { label: 'Dossier créé', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200' },
  completed: { label: 'Terminée', color: 'bg-green-500/10 text-green-600 border-green-200' },
};

// Labels pour l'urgence
export const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
};
