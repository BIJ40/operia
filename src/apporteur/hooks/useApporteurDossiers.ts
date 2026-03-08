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
  programme: { color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  devis_en_cours: { color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  devis_envoye: { color: 'text-orange-700', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  devis_valide: { color: 'text-indigo-700', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  rdv_travaux: { color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  facture: { color: 'text-teal-700', bgColor: 'bg-teal-100 dark:bg-teal-900/30' },
  attente_paiement: { color: 'text-amber-700', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  regle: { color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  clos: { color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  en_cours: { color: 'text-cyan-700', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
  stand_by: { color: 'text-yellow-700', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  annule: { color: 'text-slate-600', bgColor: 'bg-slate-100 dark:bg-slate-800' },
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
