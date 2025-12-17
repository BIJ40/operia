import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTechnicianProfile } from './useTechnicianProfile';
import { startOfDay, endOfDay, format } from 'date-fns';

export type TimeEventType = 'start_day' | 'start_break' | 'end_break' | 'end_day';

export interface TimeEvent {
  id: string;
  collaborator_id: string;
  occurred_at: string;
  event_type: TimeEventType;
  source: 'mobile' | 'manual' | 'system';
  notes: string | null;
  created_at: string;
}

export function useTodayTimeEvents() {
  const { data: profile } = useTechnicianProfile();
  const today = new Date();

  return useQuery({
    queryKey: ['time-events', profile?.id, format(today, 'yyyy-MM-dd')],
    queryFn: async (): Promise<TimeEvent[]> => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('time_events')
        .select('*')
        .eq('collaborator_id', profile.id)
        .gte('occurred_at', startOfDay(today).toISOString())
        .lte('occurred_at', endOfDay(today).toISOString())
        .order('occurred_at', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeEvent[];
    },
    enabled: !!profile?.id,
  });
}

export function useCreateTimeEvent() {
  const queryClient = useQueryClient();
  const { data: profile } = useTechnicianProfile();

  return useMutation({
    mutationFn: async ({ 
      eventType, 
      notes,
      source = 'mobile' 
    }: { 
      eventType: TimeEventType; 
      notes?: string;
      source?: 'mobile' | 'manual';
    }) => {
      if (!profile?.id) throw new Error('No collaborator profile');

      const { data, error } = await supabase
        .from('time_events')
        .insert({
          collaborator_id: profile.id,
          event_type: eventType,
          source,
          notes,
          occurred_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-events'] });
    },
  });
}

// Derive current state from today's events
export function deriveTimeState(events: TimeEvent[]): {
  status: 'not_started' | 'working' | 'on_break' | 'finished';
  nextAction: TimeEventType | null;
  startTime: string | null;
  breakStartTime: string | null;
  totalWorkedMinutes: number;
  totalBreakMinutes: number;
} {
  let status: 'not_started' | 'working' | 'on_break' | 'finished' = 'not_started';
  let nextAction: TimeEventType | null = 'start_day';
  let startTime: string | null = null;
  let breakStartTime: string | null = null;
  let totalWorkedMinutes = 0;
  let totalBreakMinutes = 0;

  let workStart: Date | null = null;
  let currentBreakStart: Date | null = null;

  for (const event of events) {
    const eventTime = new Date(event.occurred_at);

    switch (event.event_type) {
      case 'start_day':
        workStart = eventTime;
        startTime = event.occurred_at;
        status = 'working';
        nextAction = 'start_break';
        break;
      case 'start_break':
        if (workStart) {
          totalWorkedMinutes += (eventTime.getTime() - workStart.getTime()) / 60000;
        }
        currentBreakStart = eventTime;
        breakStartTime = event.occurred_at;
        status = 'on_break';
        nextAction = 'end_break';
        break;
      case 'end_break':
        if (currentBreakStart) {
          totalBreakMinutes += (eventTime.getTime() - currentBreakStart.getTime()) / 60000;
        }
        workStart = eventTime;
        currentBreakStart = null;
        breakStartTime = null;
        status = 'working';
        nextAction = 'start_break';
        break;
      case 'end_day':
        if (workStart) {
          totalWorkedMinutes += (eventTime.getTime() - workStart.getTime()) / 60000;
        }
        status = 'finished';
        nextAction = null;
        break;
    }
  }

  // Allow end_day if working
  if (status === 'working') {
    nextAction = 'end_day'; // Primary action, can also start break
  }

  return {
    status,
    nextAction,
    startTime,
    breakStartTime,
    totalWorkedMinutes: Math.round(totalWorkedMinutes),
    totalBreakMinutes: Math.round(totalBreakMinutes),
  };
}
