/**
 * useApporteurDossiers - Hook pour récupérer les dossiers de l'apporteur
 * Utilise useApporteurApi pour envoyer le token custom
 */

import { useQuery } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';
import { useApporteurSession } from '../contexts/ApporteurSessionContext';

export interface DossierRow {
  id: number;
  ref: string;
  clientName: string;
  address: string;
  city: string;
  status: string;
  statusLabel: string;
  rawState: string;
  dateCreation: string | null;
  datePremierRdv: string | null;
  dateDevisEnvoye: string | null;
  dateDevisValide: string | null;
  dateRdvTravaux: string | null;
  dateFacture: string | null;
  dateReglement: string | null;
  lastModified: string | null;
  devisHT: number;
  factureHT: number;
  restedu: number;
  devisId: number | null;
  factureId: number | null;
}

interface DossiersResponse {
  success: boolean;
  data?: {
    dossiers: DossierRow[];
    totals: {
      count: number;
      resteDu: number;
    };
  };
  error?: string;
}

export function useApporteurDossiers() {
  const { post } = useApporteurApi();
  const { isAuthenticated } = useApporteurSession();

  return useQuery({
    queryKey: ['apporteur-dossiers'],
    queryFn: async (): Promise<DossiersResponse> => {
      const result = await post<DossiersResponse>('/get-apporteur-dossiers', {});
      if (result.error) {
        return { success: false, error: result.error };
      }
      return result.data || { success: false, error: 'Réponse vide' };
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}

export const STATUS_CONFIG: Record<string, { color: string; bgColor: string }> = {
  programme:        { color: 'text-[hsl(var(--ap-info))]',    bgColor: 'bg-[hsl(var(--ap-info-light))]' },
  devis_en_cours:   { color: 'text-[hsl(var(--ap-warning))]', bgColor: 'bg-[hsl(var(--ap-warning-light))]' },
  devis_envoye:     { color: 'text-secondary',                bgColor: 'bg-secondary/10' },
  devis_valide:     { color: 'text-primary',                  bgColor: 'bg-primary/10' },
  rdv_travaux:      { color: 'text-primary',                  bgColor: 'bg-accent' },
  facture:          { color: 'text-[hsl(var(--ap-info))]',    bgColor: 'bg-[hsl(var(--ap-info-light))]' },
  attente_paiement: { color: 'text-[hsl(var(--ap-warning))]', bgColor: 'bg-[hsl(var(--ap-warning-light))]' },
  regle:            { color: 'text-[hsl(var(--ap-success))]', bgColor: 'bg-[hsl(var(--ap-success-light))]' },
  clos:             { color: 'text-muted-foreground',         bgColor: 'bg-muted' },
  en_cours:         { color: 'text-primary',                  bgColor: 'bg-primary/10' },
  stand_by:         { color: 'text-[hsl(var(--ap-warning))]', bgColor: 'bg-[hsl(var(--ap-warning-light))]' },
  annule:           { color: 'text-muted-foreground',         bgColor: 'bg-muted' },
};

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
