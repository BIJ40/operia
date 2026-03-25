/**
 * Performance Terrain — Config hook
 * Loads agency_performance_config with fallback to DEFAULT_THRESHOLDS
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_THRESHOLDS } from '../engine/rules';
import type { PerformanceConfig } from '../engine/types';

export function usePerformanceConfig() {
  const { agencyId } = useProfile();

  const { data: dbConfig } = useQuery({
    queryKey: ['performance-config', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await (supabase as any)
        .from('agency_performance_config')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();

      if (error || !data) return null;
      return data as Record<string, unknown>;
    },
    enabled: !!agencyId,
    staleTime: 10 * 60 * 1000,
  });

  const config: PerformanceConfig = dbConfig
    ? {
        productivityOptimal: Number(dbConfig.productivity_optimal) || DEFAULT_THRESHOLDS.productivityOptimal,
        productivityWarning: Number(dbConfig.productivity_warning) || DEFAULT_THRESHOLDS.productivityWarning,
        loadMin: Number(dbConfig.load_min) || DEFAULT_THRESHOLDS.loadMin,
        loadMax: Number(dbConfig.load_max) || DEFAULT_THRESHOLDS.loadMax,
        savOptimal: Number(dbConfig.sav_optimal) || DEFAULT_THRESHOLDS.savOptimal,
        savWarning: Number(dbConfig.sav_warning) || DEFAULT_THRESHOLDS.savWarning,
        defaultWeeklyHours: Number(dbConfig.default_weekly_hours) || DEFAULT_THRESHOLDS.defaultWeeklyHours,
        defaultTaskDurationMinutes: Number(dbConfig.default_task_duration_minutes) || DEFAULT_THRESHOLDS.defaultTaskDurationMinutes,
        deductPlanningUnavailability: Boolean(dbConfig.deduct_planning_unavailability),
        holidays: parseHolidays(dbConfig.holidays),
      }
    : DEFAULT_THRESHOLDS;

  return { config, isFromDb: !!dbConfig };
}
