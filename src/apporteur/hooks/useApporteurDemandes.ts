/**
 * useApporteurDemandes - Hook pour récupérer les demandes de l'apporteur
 * Utilise useApporteurApi pour envoyer le token custom
 */

import { useQuery } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';
import { useApporteurSession } from '../contexts/ApporteurSessionContext';

export interface ApporteurDemande {
  id: string;
  request_type: string;
  urgency: string;
  tenant_name: string;
  tenant_phone: string | null;
  tenant_email: string | null;
  owner_name: string | null;
  address: string;
  postal_code: string | null;
  city: string | null;
  description: string;
  availability: string | null;
  comments: string | null;
  status: string;
  reference: string | null;
  apogee_project_id: number | null;
  created_at: string;
  updated_at: string;
}

interface DemandesResponse {
  success: boolean;
  data?: ApporteurDemande[];
  error?: string;
}

export function useApporteurDemandes() {
  const { post } = useApporteurApi();
  const { isAuthenticated } = useApporteurSession();

  return useQuery({
    queryKey: ['apporteur-demandes'],
    queryFn: async (): Promise<ApporteurDemande[]> => {
      const result = await post<DemandesResponse>('/get-apporteur-requests', {});
      if (result.error) throw new Error(result.error);
      return result.data?.data || [];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

// Labels pour les types de demande
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  depannage: 'Dépannage urgent',
  travaux: 'Travaux',
  diagnostic: 'Diagnostic / Devis',
  autre: 'Autre',
};

// Labels pour les statuts — couleurs via tokens sémantiques du thème apporteur
export const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:     { label: 'En attente',   color: 'bg-[hsl(var(--ap-warning)/.1)] text-[hsl(var(--ap-warning))] border-[hsl(var(--ap-warning)/.3)]' },
  received:    { label: 'Reçue',        color: 'bg-[hsl(var(--ap-info)/.1)] text-[hsl(var(--ap-info))] border-[hsl(var(--ap-info)/.3)]' },
  assigned:    { label: 'Assignée',     color: 'bg-[hsl(var(--ap-info)/.15)] text-[hsl(var(--ap-info))] border-[hsl(var(--ap-info)/.3)]' },
  in_progress: { label: 'Dossier créé', color: 'bg-primary/10 text-primary border-primary/30' },
  completed:   { label: 'Terminée',     color: 'bg-[hsl(var(--ap-success)/.1)] text-[hsl(var(--ap-success))] border-[hsl(var(--ap-success)/.3)]' },
  cancelled:   { label: 'Annulée',      color: 'bg-muted text-muted-foreground border-border' },
};

// Labels pour l'urgence
export const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
  normal: { label: 'Normal', color: 'bg-muted text-muted-foreground' },
  urgent: { label: 'Urgent', color: 'bg-[hsl(var(--ap-danger)/.1)] text-[hsl(var(--ap-danger))] border-[hsl(var(--ap-danger)/.3)]' },
};
