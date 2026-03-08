/**
 * useApporteurPlanning - Hook pour récupérer TOUS les RDV à venir de l'apporteur
 */

import { useQuery } from '@tanstack/react-query';
import { useApporteurApi } from './useApporteurApi';
import { useApporteurSession } from '../contexts/ApporteurSessionContext';

export interface PlanningEvent {
  id: number;
  projectId: number;
  projectRef: string;
  clientName: string;
  city: string;
  date: string;
  time: string | null;
  type: string;
  typeLabel: string;
  technicianName: string | null;
}

interface PlanningResponse {
  success: boolean;
  data?: {
    events: PlanningEvent[];
  };
  error?: string;
}

export function useApporteurPlanning() {
  const { post } = useApporteurApi();
  const hasToken = !!localStorage.getItem('apporteur_session_token');

  return useQuery({
    queryKey: ['apporteur-planning'],
    queryFn: async (): Promise<PlanningResponse> => {
      const result = await post<PlanningResponse>('/get-apporteur-planning', {});
      if (result.error) {
        return { success: false, error: result.error };
      }
      return result.data || { success: false, error: 'Réponse vide' };
    },
    enabled: hasToken,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function formatTime(time: string | null): string {
  if (!time) return '';
  return time.substring(0, 5);
}
