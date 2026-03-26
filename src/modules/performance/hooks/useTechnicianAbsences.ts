/**
 * useTechnicianAbsences — Fetches structured absences from technician_absences table
 * Returns Map<technicianApogeeId, AbsenceEntry[]>
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AbsenceEntry {
  date: Date;
  hours: number;
  type: string;
  source: 'rh' | 'planning' | 'none';
  isFullDay: boolean;
}

interface UseTechnicianAbsencesOptions {
  agencyId: string | undefined;
  period: { start: Date; end: Date };
  enabled?: boolean;
}

/**
 * Compute working days between two dates, counting each weekday as one day.
 * Handles overlap with weekends: only weekdays count.
 */
function countWeekdays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(23, 59, 59, 999);
  while (d <= endD) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function useTechnicianAbsences({ agencyId, period, enabled = true }: UseTechnicianAbsencesOptions) {
  return useQuery({
    queryKey: ['technician-absences', agencyId, period.start.toISOString(), period.end.toISOString()],
    enabled: !!agencyId && enabled,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<Map<string, AbsenceEntry[]>> => {
      const startStr = period.start.toISOString().split('T')[0];
      const endStr = period.end.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('technician_absences')
        .select('*')
        .eq('agency_id', agencyId!)
        .lte('start_date', endStr)
        .gte('end_date', startStr);

      if (error || !data) return new Map();

      const result = new Map<string, AbsenceEntry[]>();

      for (const row of data) {
        const techId = row.technician_apogee_id;
        if (!result.has(techId)) result.set(techId, []);

        // Clamp absence dates to the query period
        const absStart = new Date(Math.max(
          new Date(row.start_date).getTime(),
          period.start.getTime()
        ));
        const absEnd = new Date(Math.min(
          new Date(row.end_date).getTime(),
          period.end.getTime()
        ));

        if (row.is_full_day) {
          // Count weekdays in the clamped range
          const days = countWeekdays(absStart, absEnd);
          // Default 7h per day if no hours specified
          const hoursPerDay = row.hours ? Number(row.hours) / Math.max(countWeekdays(new Date(row.start_date), new Date(row.end_date)), 1) : 7;

          const d = new Date(absStart);
          d.setHours(0, 0, 0, 0);
          while (d <= absEnd) {
            const dow = d.getDay();
            if (dow !== 0 && dow !== 6) {
              result.get(techId)!.push({
                date: new Date(d),
                hours: hoursPerDay,
                type: row.absence_type,
                source: 'rh',
                isFullDay: true,
              });
            }
            d.setDate(d.getDate() + 1);
          }
        } else {
          // Half-day or partial: use hours directly
          const hours = row.hours ? Number(row.hours) : 3.5;
          result.get(techId)!.push({
            date: absStart,
            hours,
            type: row.absence_type,
            source: 'rh',
            isFullDay: false,
          });
        }
      }

      return result;
    },
  });
}

/**
 * Summarize absence entries into total days and hours for a technician.
 */
export function summarizeAbsences(entries: AbsenceEntry[]): { days: number; hours: number } {
  let totalHours = 0;
  for (const e of entries) {
    totalHours += e.hours;
  }
  return {
    days: Math.round(totalHours / 7 * 10) / 10, // approximate days (7h/day)
    hours: Math.round(totalHours * 10) / 10,
  };
}
