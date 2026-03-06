/**
 * Planning V2 — Hook pour charger les semaines types des techniciens
 * Charge depuis technician_weekly_schedule via collaborators.apogee_user_id
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import type { TechDaySchedule, TechWeeklySchedule } from "../types/schedule";
import { getDefaultWeekSchedule } from "../types/schedule";

/**
 * Returns a Map<number, TechWeeklySchedule> keyed by apogee_user_id
 */
export function useTechSchedules(): {
  schedulesByApogeeId: Map<number, TechWeeklySchedule>;
  isLoading: boolean;
} {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencyId = currentAgency?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["tech-weekly-schedules", agencyId],
    enabled: isAgencyReady && !!agencyId,
    queryFn: async () => {
      // Get all collaborators for the agency with their schedules
      const { data: collabs } = await supabase
        .from("collaborators")
        .select("id, apogee_user_id")
        .eq("agency_id", agencyId!)
        .not("apogee_user_id", "is", null);

      if (!collabs || collabs.length === 0) return [];

      const collabIds = collabs.map((c) => c.id);
      const { data: schedRows } = await supabase
        .from("technician_weekly_schedule")
        .select("*")
        .in("collaborator_id", collabIds);

      return collabs.map((c) => ({
        apogeeUserId: c.apogee_user_id as number,
        rows: (schedRows ?? []).filter((r: any) => r.collaborator_id === c.id),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const schedulesByApogeeId = useMemo(() => {
    const map = new Map<number, TechWeeklySchedule>();
    if (!data) return map;

    for (const entry of data) {
      if (!entry.apogeeUserId) continue;

      if (entry.rows.length === 0) {
        map.set(entry.apogeeUserId, getDefaultWeekSchedule());
        continue;
      }

      const defaultSched = getDefaultWeekSchedule();
      const merged: TechWeeklySchedule = defaultSched.map((def) => {
        const row = entry.rows.find((r: any) => r.day_of_week === def.dayOfWeek);
        if (row) {
          return {
            dayOfWeek: row.day_of_week as number,
            isWorking: row.is_working as boolean,
            workStart: (row.work_start as string) || def.workStart,
            workEnd: (row.work_end as string) || def.workEnd,
            lunchStart: (row.lunch_start as string) || def.lunchStart,
            lunchEnd: (row.lunch_end as string) || def.lunchEnd,
          };
        }
        return def;
      });

      map.set(entry.apogeeUserId, merged);
    }

    return map;
  }, [data]);

  return { schedulesByApogeeId, isLoading };
}
