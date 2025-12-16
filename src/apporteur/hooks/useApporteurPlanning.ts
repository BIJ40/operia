/**
 * useApporteurPlanning - Hook pour récupérer le planning de l'apporteur
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  for (let i = 0; i < 7; i++) {
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
