import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTechnicianProfile } from './useTechnicianProfile';
import { startOfWeek, endOfWeek, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TimeEvent } from './useTimeEvents';

export interface TimesheetDay {
  date: string;
  dayName: string;
  totalMinutes: number;
  events: TimeEvent[];
}

export interface Timesheet {
  id: string;
  collaborator_id: string;
  week_start: string;
  total_minutes: number;
  contract_minutes: number;
  overtime_minutes: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  computed: {
    days: TimesheetDay[];
  };
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_comment: string | null;
}

export function useWeekTimesheet(weekStart: Date) {
  const { data: profile } = useTechnicianProfile();
  const weekStartStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['timesheet', profile?.id, weekStartStr],
    queryFn: async (): Promise<Timesheet | null> => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('timesheets')
        .select('*')
        .eq('collaborator_id', profile.id)
        .eq('week_start', weekStartStr)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        ...data,
        status: data.status as Timesheet['status'],
        computed: (data.computed as unknown) as { days: TimesheetDay[] },
      };
    },
    enabled: !!profile?.id,
  });
}

export function useWeekTimeEvents(weekStart: Date) {
  const { data: profile } = useTechnicianProfile();
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });

  return useQuery({
    queryKey: ['week-time-events', profile?.id, format(weekStartDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<TimesheetDay[]> => {
      if (!profile?.id) return [];

      const { data: events, error } = await supabase
        .from('time_events')
        .select('*')
        .eq('collaborator_id', profile.id)
        .gte('occurred_at', weekStartDate.toISOString())
        .lte('occurred_at', weekEndDate.toISOString())
        .order('occurred_at', { ascending: true });

      if (error) throw error;

      // Group by day
      const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });
      
      return days.map(day => {
        const dayEvents = (events || []).filter(e => {
          const eventDate = new Date(e.occurred_at);
          return eventDate >= startOfDay(day) && eventDate <= endOfDay(day);
        }) as TimeEvent[];

        // Calculate total worked time for the day
        let totalMinutes = 0;
        let workStart: Date | null = null;

        for (const event of dayEvents) {
          const eventTime = new Date(event.occurred_at);
          switch (event.event_type) {
            case 'start_day':
              workStart = eventTime;
              break;
            case 'start_break':
              if (workStart) {
                totalMinutes += (eventTime.getTime() - workStart.getTime()) / 60000;
                workStart = null;
              }
              break;
            case 'end_break':
              workStart = eventTime;
              break;
            case 'end_day':
              if (workStart) {
                totalMinutes += (eventTime.getTime() - workStart.getTime()) / 60000;
                workStart = null;
              }
              break;
          }
        }

        return {
          date: format(day, 'yyyy-MM-dd'),
          dayName: format(day, 'EEEE', { locale: fr }),
          totalMinutes: Math.round(totalMinutes),
          events: dayEvents,
        };
      });
    },
    enabled: !!profile?.id,
  });
}

export function useSubmitTimesheet() {
  const queryClient = useQueryClient();
  const { data: profile } = useTechnicianProfile();

  return useMutation({
    mutationFn: async ({ weekStart, days }: { weekStart: Date; days: TimesheetDay[] }) => {
      if (!profile?.id) throw new Error('No collaborator profile');

      const weekStartStr = format(startOfWeek(weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const totalMinutes = days.reduce((sum, d) => sum + d.totalMinutes, 0);
      const contractMinutes = profile.work_profile?.weekly_contract_minutes || 2100;
      const overtimeMinutes = Math.max(0, totalMinutes - contractMinutes);

      // Upsert timesheet
      const { data, error } = await supabase
        .from('timesheets')
        .upsert([{
          collaborator_id: profile.id,
          week_start: weekStartStr,
          total_minutes: totalMinutes,
          contract_minutes: contractMinutes,
          overtime_minutes: overtimeMinutes,
          status: 'submitted',
          computed: { days } as unknown,
          submitted_at: new Date().toISOString(),
        }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
    },
  });
}
