/**
 * useApporteurPlanning - Hook pour récupérer le planning de l'apporteur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isApporteurDevMode, MOCK_PLANNING_RESPONSE } from '../lib/devMode';

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
    week: {
      start: string;
      end: string;
      offset: number;
    };
  };
  error?: string;
}

interface UseApporteurPlanningOptions {
  weekOffset?: number;
  enabled?: boolean;
}

export function useApporteurPlanning(options: UseApporteurPlanningOptions = {}) {
  const { weekOffset = 0, enabled = true } = options;

  return useQuery({
    queryKey: ['apporteur-planning', weekOffset],
    queryFn: async (): Promise<PlanningResponse> => {
      // En mode dev sans auth apporteur, retourner des données vides
      if (isApporteurDevMode()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          return { ...MOCK_PLANNING_RESPONSE, data: { ...MOCK_PLANNING_RESPONSE.data, week: { ...MOCK_PLANNING_RESPONSE.data.week, offset: weekOffset } } };
        }
        // Vérifier si l'utilisateur est un apporteur
        const { data: apporteurUser } = await supabase
          .from('apporteur_users')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!apporteurUser) {
          return { ...MOCK_PLANNING_RESPONSE, data: { ...MOCK_PLANNING_RESPONSE.data, week: { ...MOCK_PLANNING_RESPONSE.data.week, offset: weekOffset } } };
        }
      }

      const { data, error } = await supabase.functions.invoke('get-apporteur-planning', {
        body: { weekOffset },
      });

      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
    retry: 1,
    enabled,
  });
}

export function formatTime(time: string | null): string {
  if (!time) return '';
  return time.substring(0, 5);
}

export function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart);
  const days: string[] = [];
  // Only Mon-Fri (5 days)
  for (let i = 0; i < 5; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day.toISOString().split('T')[0]);
  }
  return days;
}

export function formatWeekRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const startDay = startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  const endDay = endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `${startDay} - ${endDay}`;
}
