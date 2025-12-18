import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfWeek } from 'date-fns';
import type { TimesheetStatus, DayEntry, TimesheetDay } from '@/hooks/technician/useTimesheets';

export interface AgencyTimesheet {
  id: string;
  collaborator_id: string;
  agency_id: string;
  week_start: string;
  total_minutes: number;
  total_minutes_modified: number | null;
  contract_minutes: number;
  overtime_minutes: number;
  status: TimesheetStatus;
  
  // Entries
  entries_original: DayEntry[];
  entries_modified: DayEntry[] | null;
  
  // Workflow
  submitted_at: string | null;
  submitted_by: string | null;
  validated_at: string | null;
  validated_by: string | null;
  validation_comment: string | null;
  countersigned_at: string | null;
  countersigned_by: string | null;
  countersign_comment: string | null;
  finalized_at: string | null;
  finalized_by: string | null;
  
  // Computed
  computed: { days: TimesheetDay[] } | null;
  
  // Joined collaborator info
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function useAgencyTimesheets(filters?: {
  status?: TimesheetStatus[];
  weekStart?: Date;
}) {
  const { agence } = useAuth();

  return useQuery({
    queryKey: ['agency-timesheets', agence, filters?.status, filters?.weekStart?.toISOString()],
    queryFn: async (): Promise<AgencyTimesheet[]> => {
      if (!agence) return [];

      // Get agency ID from profiles
      const { data: agencyData } = await supabase
        .from('apogee_agencies')
        .select('id')
        .eq('slug', agence)
        .single();

      if (!agencyData) return [];

      let query = supabase
        .from('timesheets')
        .select(`
          *,
          collaborator:collaborators(id, first_name, last_name)
        `)
        .eq('agency_id', agencyData.id)
        .order('week_start', { ascending: false });

      if (filters?.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters?.weekStart) {
        const weekStartStr = format(startOfWeek(filters.weekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        query = query.eq('week_start', weekStartStr);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(ts => ({
        ...ts,
        status: ts.status as TimesheetStatus,
        entries_original: (ts.entries_original as unknown as DayEntry[]) || [],
        entries_modified: ts.entries_modified as unknown as DayEntry[] | null,
        computed: ts.computed as unknown as { days: TimesheetDay[] } | null,
      }));
    },
    enabled: !!agence,
  });
}

export function useValidateTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      timesheetId, 
      entries,
      totalMinutes,
      comment 
    }: { 
      timesheetId: string; 
      entries?: DayEntry[];
      totalMinutes?: number;
      comment?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      // Get original timesheet
      const { data: original } = await supabase
        .from('timesheets')
        .select('entries_original, total_minutes')
        .eq('id', timesheetId)
        .single();

      const originalEntries = original?.entries_original as unknown as DayEntry[] || [];
      const hasModifications = entries && JSON.stringify(entries) !== JSON.stringify(originalEntries);

      const updateData: Record<string, unknown> = {
        validated_at: new Date().toISOString(),
        validated_by: user?.user?.id,
        validation_comment: comment || null,
      };

      if (hasModifications && entries) {
        // N2 modified entries
        updateData.status = 'N2_MODIFIED';
        updateData.entries_modified = entries;
        updateData.total_minutes_modified = totalMinutes;
      } else {
        // Direct validation
        updateData.status = 'VALIDATED';
        updateData.finalized_at = new Date().toISOString();
        updateData.finalized_by = user?.user?.id;
      }

      const { data, error } = await supabase
        .from('timesheets')
        .update(updateData)
        .eq('id', timesheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
    },
  });
}

export function useFinalizeTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ timesheetId }: { timesheetId: string }) => {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('timesheets')
        .update({
          status: 'VALIDATED',
          finalized_at: new Date().toISOString(),
          finalized_by: user?.user?.id,
        })
        .eq('id', timesheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
    },
  });
}

export function useRejectTimesheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      timesheetId, 
      comment 
    }: { 
      timesheetId: string; 
      comment: string;
    }) => {
      const { data, error } = await supabase
        .from('timesheets')
        .update({
          status: 'DRAFT',
          validation_comment: comment,
          submitted_at: null,
          submitted_by: null,
        })
        .eq('id', timesheetId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-timesheets'] });
      queryClient.invalidateQueries({ queryKey: ['timesheet'] });
    },
  });
}
